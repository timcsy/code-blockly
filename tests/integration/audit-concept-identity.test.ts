/**
 * CONCEPT IDENTITY AUDIT
 *
 * Verifies that every concept defined in the Semorphe C++ language support
 * is correctly identified by the lifter — i.e. when we write C++ code that
 * uses a specific concept, the lifter produces the correct conceptId in the
 * semantic tree (not a generic fallback like var_declare).
 *
 * Motivation: we discovered that `int* p = &x;` was being lifted as
 * `var_declare` instead of `cpp_pointer_declare`. The code roundtripped
 * correctly but blocks wouldn't render correctly.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { Parser, Language } from 'web-tree-sitter'
import type { Lifter } from '../../src/core/lift/lifter'
import { registerCppLanguage } from '../../src/languages/cpp/generators'
import { setupTestRenderer } from '../helpers/setup-renderer'
import { createTestLifter } from '../helpers/setup-lifter'
import type { SemanticNode } from '../../src/core/types'

let tsParser: Parser
let lifter: Lifter

beforeAll(async () => {
  await Parser.init({
    locateFile: (scriptName: string) => `${process.cwd()}/public/${scriptName}`,
  })
  tsParser = new Parser()
  const lang = await Language.load(`${process.cwd()}/public/tree-sitter-cpp.wasm`)
  tsParser.setLanguage(lang)
  lifter = createTestLifter()
  registerCppLanguage()
  setupTestRenderer()
})

// ─── Helpers ───

function liftCode(code: string): SemanticNode | null {
  const tree = tsParser.parse(code)
  return lifter.lift(tree.rootNode as any)
}

/** Recursively find all nodes with the given conceptId */
function findConcepts(node: SemanticNode, conceptId: string): SemanticNode[] {
  const found: SemanticNode[] = []
  if (node.concept === conceptId) {
    found.push(node)
  }
  for (const children of Object.values(node.children || {})) {
    for (const child of children) {
      found.push(...findConcepts(child, conceptId))
    }
  }
  return found
}

/** Assert that lifting the given code produces at least one node with the given conceptId */
function assertConceptPresent(code: string, conceptId: string) {
  const sem = liftCode(code)
  expect(sem, `Failed to lift code for concept ${conceptId}`).not.toBeNull()
  const matches = findConcepts(sem!, conceptId)
  expect(
    matches.length,
    `Expected concept '${conceptId}' in semantic tree but found none. Top-level concepts: ${JSON.stringify(collectConceptIds(sem!).slice(0, 20))}`
  ).toBeGreaterThan(0)
}

/** Collect all concept IDs in the tree (for diagnostics) */
function collectConceptIds(node: SemanticNode): string[] {
  const ids: string[] = [node.concept]
  for (const children of Object.values(node.children || {})) {
    for (const child of children) {
      ids.push(...collectConceptIds(child))
    }
  }
  return ids
}

// ═══════════════════════════════════════════════════════════
// UNIVERSAL CONCEPTS
// ═══════════════════════════════════════════════════════════

describe('Universal Concepts', () => {

  // --- Data / Variables ---

  it('var_declare', () => {
    assertConceptPresent(`int main() { int x = 5; }`, 'var_declare')
  })

  it('var_assign', () => {
    assertConceptPresent(`int main() { int x; x = 5; }`, 'var_assign')
  })

  it('var_ref', () => {
    assertConceptPresent(`int main() { int x = 5; int y = x; }`, 'var_ref')
  })

  it('number_literal', () => {
    assertConceptPresent(`int main() { int x = 42; }`, 'number_literal')
  })

  it('string_literal', () => {
    assertConceptPresent(`#include <iostream>
using namespace std;
int main() { cout << "hello"; }`, 'string_literal')
  })

  // --- Operators ---

  it('arithmetic (+)', () => {
    assertConceptPresent(`int main() { int x = 1 + 2; }`, 'arithmetic')
  })

  it('compare (==)', () => {
    assertConceptPresent(`int main() { bool b = (1 == 2); }`, 'compare')
  })

  it('logic (&&)', () => {
    assertConceptPresent(`int main() { bool b = (true && false); }`, 'logic')
  })

  it('logic_not (!)', () => {
    assertConceptPresent(`int main() { bool b = !true; }`, 'logic_not')
  })

  it('negate (-)', () => {
    // Note: `-5` is parsed by tree-sitter as a single number_literal, not unary negate.
    // Use a variable negation to trigger the unary_expression AST node.
    assertConceptPresent(`int main() { int x = 1; int y = -x; }`, 'negate')
  })

  // --- Control Flow ---

  it('if', () => {
    assertConceptPresent(`int main() { if (true) { int x = 1; } }`, 'if')
  })

  // BUG: if_else concept defined but lifter always produces 'if' with else_body child.
  // The if_else concept is never produced. Generator handles both via the same codepath.
  it.todo('if_else — lifter uses if with else_body child, never produces if_else')

  it('count_loop', () => {
    assertConceptPresent(`int main() { for (int i = 0; i < 10; i++) { int x = i; } }`, 'count_loop')
  })

  it('while_loop', () => {
    assertConceptPresent(`int main() { while (true) { break; } }`, 'while_loop')
  })

  it('break', () => {
    assertConceptPresent(`int main() { while (true) { break; } }`, 'break')
  })

  it('continue', () => {
    assertConceptPresent(`int main() { for (int i = 0; i < 10; i++) { continue; } }`, 'continue')
  })

  // --- Functions ---

  it('func_def', () => {
    assertConceptPresent(`int add(int a, int b) { return a + b; }`, 'func_def')
  })

  it('func_call', () => {
    assertConceptPresent(`int add(int a, int b) { return a + b; }
int main() { add(1, 2); }`, 'func_call')
  })

  it('func_call_expr', () => {
    // Function call in expression context (assigned to a variable)
    assertConceptPresent(`int add(int a, int b) { return a + b; }
int main() { int x = add(1, 2); }`, 'func_call_expr')
  })

  it('return', () => {
    assertConceptPresent(`int main() { return 0; }`, 'return')
  })

  // --- I/O ---

  it('print (cout)', () => {
    assertConceptPresent(`#include <iostream>
using namespace std;
int main() { cout << 42; }`, 'print')
  })

  it('endl', () => {
    assertConceptPresent(`#include <iostream>
using namespace std;
int main() { cout << endl; }`, 'endl')
  })

  it('input (cin)', () => {
    assertConceptPresent(`#include <iostream>
using namespace std;
int main() { int x; cin >> x; }`, 'input')
  })

  // --- Arrays ---

  it('array_declare', () => {
    assertConceptPresent(`int main() { int arr[5]; }`, 'array_declare')
  })

  it('array_access', () => {
    assertConceptPresent(`int main() { int arr[5]; int x = arr[0]; }`, 'array_access')
  })

  it('array_assign', () => {
    assertConceptPresent(`int main() { int arr[5]; arr[0] = 10; }`, 'array_assign')
  })
})

// ═══════════════════════════════════════════════════════════
// C++ CORE CONCEPTS
// ═══════════════════════════════════════════════════════════

describe('C++ Core Concepts', () => {

  // --- Literals & Constants ---

  it('cpp_char_literal', () => {
    assertConceptPresent(`int main() { char c = 'a'; }`, 'cpp_char_literal')
  })

  // --- Operators ---

  it('cpp_increment (statement)', () => {
    assertConceptPresent(`int main() { int i = 0; i++; }`, 'cpp_increment')
  })

  // cpp_increment_expr is only produced during block rendering (expressionCounterpart),
  // not by the lifter. The lifter always produces cpp_increment for update_expression.
  it.todo('cpp_increment_expr — expression counterpart, only produced by block renderer')

  it('cpp_compound_assign (statement)', () => {
    assertConceptPresent(`int main() { int x = 0; x += 5; }`, 'cpp_compound_assign')
  })

  // cpp_compound_assign_expr is only produced during block rendering (expressionCounterpart).
  it.todo('cpp_compound_assign_expr — expression counterpart, only produced by block renderer')

  it('cpp_ternary', () => {
    assertConceptPresent(`int main() { int x = (1 > 0) ? 1 : 0; }`, 'cpp_ternary')
  })

  it('cpp_cast', () => {
    assertConceptPresent(`int main() { double d = 3.14; int x = (int)d; }`, 'cpp_cast')
  })

  it('bitwise_not', () => {
    assertConceptPresent(`int main() { int x = ~0; }`, 'bitwise_not')
  })

  // --- Control Flow ---

  it('cpp_switch', () => {
    assertConceptPresent(`int main() { int x = 1; switch (x) { case 1: break; } }`, 'cpp_switch')
  })

  it('cpp_case', () => {
    assertConceptPresent(`int main() { int x = 1; switch (x) { case 1: break; } }`, 'cpp_case')
  })

  it('cpp_default', () => {
    assertConceptPresent(`int main() { int x = 1; switch (x) { default: break; } }`, 'cpp_default')
  })

  it('cpp_for_loop', () => {
    // A non-counting for loop (uses compound assign, not ++/-- update)
    assertConceptPresent(`int main() { for (int i = 0; i < 100; i += 2) { int x = i; } }`, 'cpp_for_loop')
  })

  it('cpp_do_while', () => {
    assertConceptPresent(`int main() { int x = 0; do { x++; } while (x < 10); }`, 'cpp_do_while')
  })

  it('cpp_range_for', () => {
    assertConceptPresent(`#include <vector>
int main() { std::vector<int> v; for (int x : v) { int y = x; } }`, 'cpp_range_for')
  })

  // --- Pointers & References ---

  it('cpp_pointer_declare', () => {
    assertConceptPresent(`int main() { int x = 42; int* p = &x; }`, 'cpp_pointer_declare')
  })

  it('cpp_pointer_deref', () => {
    assertConceptPresent(`int main() { int x = 42; int* p = &x; int y = *p; }`, 'cpp_pointer_deref')
  })

  it('cpp_address_of', () => {
    assertConceptPresent(`int main() { int x = 42; int* p = &x; }`, 'cpp_address_of')
  })

  it('cpp_pointer_assign', () => {
    assertConceptPresent(`int main() { int x = 42; int* p = &x; *p = 100; }`, 'cpp_pointer_assign')
  })

  it('cpp_ref_declare', () => {
    assertConceptPresent(`int main() { int x = 42; int& r = x; }`, 'cpp_ref_declare')
  })

  it('cpp_new', () => {
    assertConceptPresent(`int main() { int* p = new int; }`, 'cpp_new')
  })

  it('cpp_delete', () => {
    assertConceptPresent(`int main() { int* p = new int; delete p; }`, 'cpp_delete')
  })

  // BUG: (int*)malloc(...) is lifted as cpp_cast + func_call_expr instead of cpp_malloc.
  // The cast_expression liftStrategy runs before the compound malloc pattern can match.
  it.todo('cpp_malloc — lifted as cpp_cast(func_call_expr) instead of cpp_malloc')

  // BUG: free(p) is lifted as generic func_call instead of cpp_free.
  // The call_expression constraint for "free" is not matching (possibly overridden
  // by general call_expression handler).
  it.todo('cpp_free — lifted as func_call instead of cpp_free')

  // --- Variable Qualifiers ---

  it('cpp_const_declare', () => {
    assertConceptPresent(`int main() { const int x = 42; }`, 'cpp_const_declare')
  })

  it('cpp_auto_declare', () => {
    assertConceptPresent(`int main() { auto x = 42; }`, 'cpp_auto_declare')
  })

  it('cpp_static_declare', () => {
    assertConceptPresent(`void foo() { static int x = 0; }`, 'cpp_static_declare')
  })

  it('cpp_constexpr_declare', () => {
    assertConceptPresent(`int main() { constexpr int x = 42; }`, 'cpp_constexpr_declare')
  })

  // var_declare_expr is only produced during block rendering (expressionCounterpart),
  // not by the lifter. The lifter produces var_declare; the for-loop init slot
  // uses the expression counterpart at render time.
  it.todo('var_declare_expr — expression counterpart, only produced by block renderer')

  // --- Preprocessor ---

  it('cpp_include', () => {
    assertConceptPresent(`#include <iostream>`, 'cpp_include')
  })

  it('cpp_include_local', () => {
    assertConceptPresent(`#include "myheader.h"`, 'cpp_include_local')
  })

  it('cpp_define', () => {
    assertConceptPresent(`#define MAX 100`, 'cpp_define')
  })

  it('cpp_ifdef', () => {
    assertConceptPresent(`#ifdef DEBUG
int x = 1;
#endif`, 'cpp_ifdef')
  })

  // BUG: #ifndef is lifted as cpp_ifdef. The lift-patterns only have cpp_preproc_include
  // which maps preproc_include, and the blockSpec astPattern uses preproc_ifndef nodeType.
  // But the lift pattern for preproc_ifdef (preproc_ifdef nodeType) may be catching both.
  it.todo('cpp_ifndef — lifted as cpp_ifdef instead of cpp_ifndef')

  // --- Namespace ---

  it('cpp_using_namespace', () => {
    assertConceptPresent(`using namespace std;`, 'cpp_using_namespace')
  })

  // --- Structures ---

  it('cpp_struct_declare', () => {
    assertConceptPresent(`struct Point { int x; int y; };`, 'cpp_struct_declare')
  })

  it('cpp_struct_member_access', () => {
    assertConceptPresent(`struct Point { int x; };
int main() { Point p; int x = p.x; }`, 'cpp_struct_member_access')
  })

  it('cpp_struct_pointer_access', () => {
    assertConceptPresent(`struct Point { int x; };
int main() { Point p; Point* pp = &p; int x = pp->x; }`, 'cpp_struct_pointer_access')
  })

  // --- Classes (advanced) ---

  it('cpp_class_def', () => {
    assertConceptPresent(`class MyClass {
public:
    int x;
};`, 'cpp_class_def')
  })

  // --- Type Operations ---

  it('cpp_sizeof', () => {
    assertConceptPresent(`int main() { int x = sizeof(int); }`, 'cpp_sizeof')
  })

  it('cpp_typedef', () => {
    assertConceptPresent(`typedef int myint;`, 'cpp_typedef')
  })

  it('cpp_using_alias', () => {
    assertConceptPresent(`using myint = int;`, 'cpp_using_alias')
  })

  // --- Enum ---

  it('cpp_enum', () => {
    assertConceptPresent(`enum Color { RED, GREEN, BLUE };`, 'cpp_enum')
  })

  // --- 2D Arrays ---

  it('cpp_array_2d_declare', () => {
    assertConceptPresent(`int main() { int arr[3][4]; }`, 'cpp_array_2d_declare')
  })

  it('cpp_array_2d_access', () => {
    assertConceptPresent(`int main() { int arr[3][4]; int x = arr[0][1]; }`, 'cpp_array_2d_access')
  })

  it('cpp_array_2d_assign', () => {
    assertConceptPresent(`int main() { int arr[3][4]; arr[0][1] = 10; }`, 'cpp_array_2d_assign')
  })

  // --- Exception Handling ---

  it('cpp_try_catch', () => {
    assertConceptPresent(`#include <stdexcept>
int main() { try { int x = 1; } catch (int e) { int y = 2; } }`, 'cpp_try_catch')
  })

  it('cpp_throw', () => {
    assertConceptPresent(`int main() { throw 42; }`, 'cpp_throw')
  })

  // --- OOP (advanced) ---

  it('cpp_constructor', () => {
    assertConceptPresent(`class Foo {
public:
    int x;
    Foo(int a) : x(a) {}
};`, 'cpp_constructor')
  })

  it('cpp_destructor', () => {
    assertConceptPresent(`class Foo {
public:
    ~Foo() {}
};`, 'cpp_destructor')
  })

  it('cpp_virtual_method', () => {
    assertConceptPresent(`class Base {
public:
    virtual void foo() {}
};`, 'cpp_virtual_method')
  })

  it('cpp_pure_virtual', () => {
    assertConceptPresent(`class Base {
public:
    virtual void foo() = 0;
};`, 'cpp_pure_virtual')
  })

  it('cpp_override_method', () => {
    assertConceptPresent(`class Base {
public:
    virtual void foo() {}
};
class Derived : public Base {
public:
    void foo() override {}
};`, 'cpp_override_method')
  })

  it('cpp_operator_overload', () => {
    assertConceptPresent(`class Vec {
public:
    int x;
    Vec operator+(const Vec& other) { Vec r; r.x = x + other.x; return r; }
};`, 'cpp_operator_overload')
  })

  // --- Lambda ---

  it('cpp_lambda', () => {
    assertConceptPresent(`#include <algorithm>
#include <vector>
int main() { auto f = [](int x) { return x + 1; }; }`, 'cpp_lambda')
  })

  // --- Namespace ---

  it('cpp_namespace_def', () => {
    assertConceptPresent(`namespace myns { int x = 1; }`, 'cpp_namespace_def')
  })

  // --- C++ Casts ---

  it('cpp_static_cast', () => {
    assertConceptPresent(`int main() { double d = 3.14; int x = static_cast<int>(d); }`, 'cpp_static_cast')
  })

  it('cpp_dynamic_cast', () => {
    assertConceptPresent(`class Base { public: virtual ~Base() {} };
class Derived : public Base {};
int main() { Base* b = new Derived(); Derived* d = dynamic_cast<Derived*>(b); }`, 'cpp_dynamic_cast')
  })

  it('cpp_reinterpret_cast', () => {
    assertConceptPresent(`int main() { int x = 42; int* p = &x; long l = reinterpret_cast<long>(p); }`, 'cpp_reinterpret_cast')
  })

  it('cpp_const_cast', () => {
    assertConceptPresent(`int main() { const int x = 42; int* p = const_cast<int*>(&x); }`, 'cpp_const_cast')
  })

  // --- Template ---

  it('cpp_template_function', () => {
    assertConceptPresent(`template <typename T>
T add(T a, T b) { return a + b; }`, 'cpp_template_function')
  })

  // --- Container Generic Operations ---

  it('cpp_container_push_back', () => {
    assertConceptPresent(`#include <vector>
int main() { std::vector<int> v; v.push_back(1); }`, 'cpp_container_push_back')
  })

  it('cpp_container_pop', () => {
    assertConceptPresent(`#include <stack>
int main() { std::stack<int> s; s.pop(); }`, 'cpp_container_pop')
  })

  it('cpp_container_push', () => {
    assertConceptPresent(`#include <stack>
int main() { std::stack<int> s; s.push(1); }`, 'cpp_container_push')
  })

  it('cpp_container_empty', () => {
    assertConceptPresent(`#include <vector>
int main() { std::vector<int> v; bool b = v.empty(); }`, 'cpp_container_empty')
  })

  it('cpp_container_clear', () => {
    assertConceptPresent(`#include <vector>
int main() { std::vector<int> v; v.clear(); }`, 'cpp_container_clear')
  })

  it('cpp_container_erase', () => {
    assertConceptPresent(`#include <map>
int main() { std::map<int, int> m; m.erase(1); }`, 'cpp_container_erase')
  })

  it('cpp_container_count', () => {
    assertConceptPresent(`#include <map>
int main() { std::map<int, int> m; int c = m.count(1); }`, 'cpp_container_count')
  })

  // --- Generic Method Call ---

  // BUG: expression_statement unwraps to expression context, so method calls
  // as statements are lifted as cpp_method_call_expr instead of cpp_method_call.
  it.todo('cpp_method_call — lifter produces cpp_method_call_expr due to expression_statement unwrap')

  it('cpp_method_call_expr', () => {
    // Method call in expression context (not matching a specific container concept)
    assertConceptPresent(`#include <vector>
int main() { std::vector<int> v; v.resize(10); }`, 'cpp_method_call_expr')
  })

  // --- Forward Declaration ---

  it('forward_decl', () => {
    assertConceptPresent(`int add(int a, int b);
int add(int a, int b) { return a + b; }`, 'forward_decl')
  })

  // --- Static Member ---

  // BUG: `static int count;` inside class is lifted as var_declare, not cpp_static_member.
  // The class lifter doesn't distinguish static member declarations.
  it.todo('cpp_static_member — lifted as var_declare inside class body')
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — cstdio
// ═══════════════════════════════════════════════════════════

describe('STD: cstdio', () => {
  it('cpp_printf', () => {
    assertConceptPresent(`#include <cstdio>
int main() { printf("hello %d\\n", 42); }`, 'cpp_printf')
  })

  it('cpp_scanf', () => {
    assertConceptPresent(`#include <cstdio>
int main() { int x; scanf("%d", &x); }`, 'cpp_scanf')
  })

  // cpp_scanf_expr is only produced during block rendering (expressionCounterpart).
  it.todo('cpp_scanf_expr — expression counterpart, only produced by block renderer')
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — cmath
// ═══════════════════════════════════════════════════════════

describe('STD: cmath', () => {
  it('cpp:math_pow', () => {
    assertConceptPresent(`#include <cmath>
int main() { double x = pow(2.0, 3.0); }`, 'cpp:math_pow')
  })

  it('cpp:math_unary (sqrt)', () => {
    assertConceptPresent(`#include <cmath>
int main() { double x = sqrt(4.0); }`, 'cpp:math_unary')
  })

  it('cpp:math_binary (fmod)', () => {
    assertConceptPresent(`#include <cmath>
int main() { double x = fmod(5.0, 3.0); }`, 'cpp:math_binary')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — string
// ═══════════════════════════════════════════════════════════

describe('STD: string', () => {
  // BUG: `std::string s;` is lifted as var_declare instead of cpp_string_declare.
  // The declaration liftStrategy does not check for std::string type specifically.
  it.todo('cpp_string_declare — lifted as var_declare instead of cpp_string_declare')

  it('cpp_string_length', () => {
    assertConceptPresent(`#include <string>
int main() { std::string s; int n = s.length(); }`, 'cpp_string_length')
  })

  it('cpp_string_substr', () => {
    assertConceptPresent(`#include <string>
int main() { std::string s = "hello"; std::string t = s.substr(0, 3); }`, 'cpp_string_substr')
  })

  it('cpp_string_find', () => {
    assertConceptPresent(`#include <string>
int main() { std::string s = "hello"; int pos = s.find("ll"); }`, 'cpp_string_find')
  })

  it('cpp_string_append', () => {
    assertConceptPresent(`#include <string>
int main() { std::string s; s.append("hi"); }`, 'cpp_string_append')
  })

  it('cpp_string_c_str', () => {
    assertConceptPresent(`#include <string>
#include <cstdio>
int main() { std::string s = "hello"; printf("%s", s.c_str()); }`, 'cpp_string_c_str')
  })

  it('cpp_getline', () => {
    assertConceptPresent(`#include <iostream>
#include <string>
using namespace std;
int main() { string s; getline(cin, s); }`, 'cpp_getline')
  })

  it('cpp_to_string', () => {
    assertConceptPresent(`#include <string>
int main() { std::string s = std::to_string(42); }`, 'cpp_to_string')
  })

  it('cpp_stoi', () => {
    assertConceptPresent(`#include <string>
int main() { int x = std::stoi("42"); }`, 'cpp_stoi')
  })

  it('cpp_stod', () => {
    assertConceptPresent(`#include <string>
int main() { double x = std::stod("3.14"); }`, 'cpp_stod')
  })

  // BUG: s.empty() on string is lifted as cpp_container_empty (generic) not cpp_string_empty.
  // The lifter cannot distinguish string.empty() from vector.empty() etc.
  it.todo('cpp_string_empty — lifted as cpp_container_empty instead of cpp_string_empty')

  it('cpp_string_erase', () => {
    assertConceptPresent(`#include <string>
int main() { std::string s = "hello"; s.erase(0, 1); }`, 'cpp_string_erase')
  })

  it('cpp_string_insert', () => {
    assertConceptPresent(`#include <string>
int main() { std::string s = "hllo"; s.insert(1, "e"); }`, 'cpp_string_insert')
  })

  it('cpp_string_replace', () => {
    assertConceptPresent(`#include <string>
int main() { std::string s = "hello"; s.replace(0, 1, "H"); }`, 'cpp_string_replace')
  })

  // BUG: s.push_back('a') on string is lifted as cpp_container_push_back (generic).
  it.todo('cpp_string_push_back — lifted as cpp_container_push_back instead of cpp_string_push_back')

  // BUG: s.clear() on string is lifted as cpp_container_clear (generic).
  it.todo('cpp_string_clear — lifted as cpp_container_clear instead of cpp_string_clear')
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — cctype
// ═══════════════════════════════════════════════════════════

describe('STD: cctype', () => {
  it('cpp_isalpha', () => {
    assertConceptPresent(`#include <cctype>
int main() { bool b = isalpha('a'); }`, 'cpp_isalpha')
  })

  it('cpp_isdigit', () => {
    assertConceptPresent(`#include <cctype>
int main() { bool b = isdigit('1'); }`, 'cpp_isdigit')
  })

  it('cpp_toupper', () => {
    assertConceptPresent(`#include <cctype>
int main() { char c = toupper('a'); }`, 'cpp_toupper')
  })

  it('cpp_tolower', () => {
    assertConceptPresent(`#include <cctype>
int main() { char c = tolower('A'); }`, 'cpp_tolower')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — algorithm
// ═══════════════════════════════════════════════════════════

describe('STD: algorithm', () => {
  it('cpp_sort', () => {
    assertConceptPresent(`#include <algorithm>
#include <vector>
int main() { std::vector<int> v; sort(v.begin(), v.end()); }`, 'cpp_sort')
  })

  it('cpp_reverse', () => {
    assertConceptPresent(`#include <algorithm>
#include <vector>
int main() { std::vector<int> v; reverse(v.begin(), v.end()); }`, 'cpp_reverse')
  })

  it('cpp_fill', () => {
    assertConceptPresent(`#include <algorithm>
#include <vector>
int main() { std::vector<int> v(10); fill(v.begin(), v.end(), 0); }`, 'cpp_fill')
  })

  it('cpp_min', () => {
    assertConceptPresent(`#include <algorithm>
int main() { int x = min(1, 2); }`, 'cpp_min')
  })

  it('cpp_max', () => {
    assertConceptPresent(`#include <algorithm>
int main() { int x = max(1, 2); }`, 'cpp_max')
  })

  it('cpp_swap', () => {
    assertConceptPresent(`#include <algorithm>
int main() { int a = 1; int b = 2; swap(a, b); }`, 'cpp_swap')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — cstdlib
// ═══════════════════════════════════════════════════════════

describe('STD: cstdlib', () => {
  it('cpp_rand', () => {
    assertConceptPresent(`#include <cstdlib>
int main() { int x = rand(); }`, 'cpp_rand')
  })

  it('cpp_srand', () => {
    assertConceptPresent(`#include <cstdlib>
int main() { srand(42); }`, 'cpp_srand')
  })

  it('cpp_abs', () => {
    assertConceptPresent(`#include <cstdlib>
int main() { int x = abs(-5); }`, 'cpp_abs')
  })

  it('cpp_exit', () => {
    assertConceptPresent(`#include <cstdlib>
int main() { exit(0); }`, 'cpp_exit')
  })

  it('cpp_atoi', () => {
    assertConceptPresent(`#include <cstdlib>
int main() { int x = atoi("42"); }`, 'cpp_atoi')
  })

  it('cpp_atof', () => {
    assertConceptPresent(`#include <cstdlib>
int main() { double x = atof("3.14"); }`, 'cpp_atof')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — cstring
// ═══════════════════════════════════════════════════════════

describe('STD: cstring', () => {
  it('cpp_strlen', () => {
    assertConceptPresent(`#include <cstring>
int main() { int n = strlen("hello"); }`, 'cpp_strlen')
  })

  it('cpp_strcmp', () => {
    assertConceptPresent(`#include <cstring>
int main() { int r = strcmp("abc", "def"); }`, 'cpp_strcmp')
  })

  it('cpp_strcpy', () => {
    assertConceptPresent(`#include <cstring>
int main() { char dest[10]; strcpy(dest, "hi"); }`, 'cpp_strcpy')
  })

  it('cpp_strcat', () => {
    assertConceptPresent(`#include <cstring>
int main() { char dest[20]; strcpy(dest, "hello"); strcat(dest, " world"); }`, 'cpp_strcat')
  })

  it('cpp_strncpy', () => {
    assertConceptPresent(`#include <cstring>
int main() { char dest[10]; strncpy(dest, "hello", 3); }`, 'cpp_strncpy')
  })

  it('cpp_strncmp', () => {
    assertConceptPresent(`#include <cstring>
int main() { int r = strncmp("abc", "abd", 2); }`, 'cpp_strncmp')
  })

  it('cpp_strchr', () => {
    assertConceptPresent(`#include <cstring>
int main() { const char* p = strchr("hello", 'l'); }`, 'cpp_strchr')
  })

  it('cpp_strstr', () => {
    assertConceptPresent(`#include <cstring>
int main() { const char* p = strstr("hello world", "world"); }`, 'cpp_strstr')
  })

  it('cpp_memset', () => {
    assertConceptPresent(`#include <cstring>
int main() { int arr[10]; memset(arr, 0, sizeof(arr)); }`, 'cpp_memset')
  })

  it('cpp_memcpy', () => {
    assertConceptPresent(`#include <cstring>
int main() { int src[3]; int dest[3]; memcpy(dest, src, sizeof(src)); }`, 'cpp_memcpy')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — numeric
// ═══════════════════════════════════════════════════════════

describe('STD: numeric', () => {
  it('cpp_accumulate', () => {
    assertConceptPresent(`#include <numeric>
#include <vector>
int main() { std::vector<int> v; int sum = accumulate(v.begin(), v.end(), 0); }`, 'cpp_accumulate')
  })

  it('cpp_iota', () => {
    assertConceptPresent(`#include <numeric>
#include <vector>
int main() { std::vector<int> v(10); iota(v.begin(), v.end(), 0); }`, 'cpp_iota')
  })

  it('cpp_partial_sum', () => {
    assertConceptPresent(`#include <numeric>
#include <vector>
int main() { std::vector<int> v(10); std::vector<int> r(10); partial_sum(v.begin(), v.end(), r.begin()); }`, 'cpp_partial_sum')
  })

  it('cpp_gcd', () => {
    assertConceptPresent(`#include <numeric>
int main() { int g = __gcd(12, 8); }`, 'cpp_gcd')
  })

  it('cpp_lcm', () => {
    // Note: lcm might need C++17; lifter may or may not support it
    assertConceptPresent(`#include <numeric>
int main() { int l = lcm(12, 8); }`, 'cpp_lcm')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — vector
// ═══════════════════════════════════════════════════════════

describe('STD: vector', () => {
  // BUG: `std::vector<int> v;` is lifted as var_declare (type="vector<int>")
  // instead of cpp_vector_declare. The declaration liftStrategy runs first and
  // doesn't dispatch to specific container declare concepts.
  it.todo('cpp_vector_declare — lifted as var_declare instead of cpp_vector_declare')

  it('cpp_vector_size', () => {
    assertConceptPresent(`#include <vector>
int main() { std::vector<int> v; int n = v.size(); }`, 'cpp_vector_size')
  })

  it('cpp_vector_pop_back', () => {
    assertConceptPresent(`#include <vector>
int main() { std::vector<int> v; v.pop_back(); }`, 'cpp_vector_pop_back')
  })

  it('cpp_vector_back', () => {
    assertConceptPresent(`#include <vector>
int main() { std::vector<int> v; int x = v.back(); }`, 'cpp_vector_back')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — stack
// ═══════════════════════════════════════════════════════════

describe('STD: stack', () => {
  // BUG: `std::stack<int> s;` lifted as var_declare instead of cpp_stack_declare.
  it.todo('cpp_stack_declare — lifted as var_declare instead of cpp_stack_declare')

  it('cpp_stack_top', () => {
    assertConceptPresent(`#include <stack>
int main() { std::stack<int> s; s.push(1); int x = s.top(); }`, 'cpp_stack_top')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — queue
// ═══════════════════════════════════════════════════════════

describe('STD: queue', () => {
  // BUG: `std::queue<int> q;` lifted as var_declare instead of cpp_queue_declare.
  it.todo('cpp_queue_declare — lifted as var_declare instead of cpp_queue_declare')

  it('cpp_queue_front', () => {
    assertConceptPresent(`#include <queue>
int main() { std::queue<int> q; q.push(1); int x = q.front(); }`, 'cpp_queue_front')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — map
// ═══════════════════════════════════════════════════════════

describe('STD: map', () => {
  // BUG: `std::map<int, int> m;` lifted as var_declare instead of cpp_map_declare.
  it.todo('cpp_map_declare — lifted as var_declare instead of cpp_map_declare')

  // BUG: `m[1]` lifted as array_access instead of cpp_map_access.
  // The subscript expression AST node is shared between arrays and maps;
  // the lifter has no type info to distinguish them.
  it.todo('cpp_map_access — lifted as array_access instead of cpp_map_access')
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — set
// ═══════════════════════════════════════════════════════════

describe('STD: set', () => {
  // BUG: `std::set<int> s;` lifted as var_declare instead of cpp_set_declare.
  it.todo('cpp_set_declare — lifted as var_declare instead of cpp_set_declare')

  it('cpp_set_insert', () => {
    assertConceptPresent(`#include <set>
int main() { std::set<int> s; s.insert(1); }`, 'cpp_set_insert')
  })
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — fstream
// ═══════════════════════════════════════════════════════════

describe('STD: fstream', () => {
  // BUG: `std::ifstream fin("input.txt");` lifted as var_declare instead of cpp_ifstream_declare.
  it.todo('cpp_ifstream_declare — lifted as var_declare instead of cpp_ifstream_declare')

  // BUG: `std::ofstream fout("output.txt");` lifted as var_declare instead of cpp_ofstream_declare.
  it.todo('cpp_ofstream_declare — lifted as var_declare instead of cpp_ofstream_declare')
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — sstream
// ═══════════════════════════════════════════════════════════

describe('STD: sstream', () => {
  // BUG: `std::stringstream ss;` lifted as var_declare instead of cpp_stringstream_declare.
  it.todo('cpp_stringstream_declare — lifted as var_declare instead of cpp_stringstream_declare')
})

// ═══════════════════════════════════════════════════════════
// STD MODULE CONCEPTS — utility
// ═══════════════════════════════════════════════════════════

describe('STD: utility', () => {
  // BUG: `std::pair<int, int> p;` lifted as var_declare instead of cpp_pair_declare.
  it.todo('cpp_pair_declare — lifted as var_declare instead of cpp_pair_declare')

  it('cpp_make_pair', () => {
    assertConceptPresent(`#include <utility>
int main() { auto p = make_pair(1, 2); }`, 'cpp_make_pair')
  })
})
