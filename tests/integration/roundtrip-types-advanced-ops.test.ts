import { describe, it, expect, beforeAll } from 'vitest'
import { Parser, Language } from 'web-tree-sitter'
import { createTestLifter } from '../helpers/setup-lifter'
import type { Lifter } from '../../src/core/lift/lifter'
import { registerCppLanguage } from '../../src/languages/cpp/generators'
import { generateCode } from '../../src/core/projection/code-generator'
import { setupTestRenderer } from '../helpers/setup-renderer'
import type { StylePreset, SemanticNode } from '../../src/core/types'

const style: StylePreset = {
  id: 'apcs',
  name: { 'zh-TW': 'APCS', en: 'APCS' },
  io_style: 'cout',
  naming_convention: 'camelCase',
  indent_size: 4,
  brace_style: 'K&R',
  namespace_style: 'using',
  header_style: 'individual',
}

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

function liftAndGenerate(code: string): { sem: SemanticNode | null; generated: string } {
  const tree = tsParser.parse(code)
  const sem = lifter.lift(tree.rootNode as any)
  if (!sem) return { sem: null, generated: '' }
  const generated = generateCode(sem, 'cpp', style)
  return { sem, generated }
}

function assertStableRoundtrip(code: string) {
  const { sem, generated } = liftAndGenerate(code)
  expect(sem).not.toBeNull()

  // Second roundtrip
  const { generated: generated2 } = liftAndGenerate(generated)
  expect(generated2).toBe(generated)
  return { sem: sem!, generated }
}

function hasNoConcept(node: SemanticNode, forbidden: string[]): boolean {
  if (forbidden.includes(node.concept)) return false
  for (const children of Object.values(node.children || {})) {
    for (const child of children) {
      if (!hasNoConcept(child, forbidden)) return false
    }
  }
  return true
}

describe('Round-trip: Phase 5 - Type System & Advanced Ops', () => {
  it('t01: const declare', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    const int MAX = 100;
    cout << MAX << endl;
    return 0;
}`)
    expect(generated).toContain('const int MAX = 100;')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t02: auto declare', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    auto x = 42;
    auto y = 3.14;
    cout << x << endl;
    return 0;
}`)
    expect(generated).toContain('auto x = 42;')
    expect(generated).toContain('auto y = 3.14;')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t03: typedef', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
typedef long long ll;
int main() {
    ll x = 1000000000;
    cout << x << endl;
    return 0;
}`)
    expect(generated).toContain('typedef long long ll;')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t04: sizeof', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    cout << sizeof(int) << endl;
    cout << sizeof(double) << endl;
    return 0;
}`)
    expect(generated).toContain('sizeof(int)')
    expect(generated).toContain('sizeof(double)')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t05: ternary', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    int x = 5;
    int y = x > 3 ? 10 : 20;
    cout << y << endl;
    return 0;
}`)
    expect(generated).toContain('?')
    expect(generated).toContain(':')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t06: cast', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    double d = 3.14;
    int n = (int)d;
    cout << n << endl;
    return 0;
}`)
    expect(generated).toContain('(int)')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t07: increment/decrement', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    int x = 5;
    x++;
    cout << x << endl;
    int y = 10;
    y--;
    cout << y << endl;
    return 0;
}`)
    expect(generated).toContain('x++')
    expect(generated).toContain('y--')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t08: compound assign', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    int x = 10;
    x += 5;
    x -= 3;
    x *= 2;
    cout << x << endl;
    return 0;
}`)
    expect(generated).toContain('x += 5;')
    expect(generated).toContain('x -= 3;')
    expect(generated).toContain('x *= 2;')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t09: enum', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
enum Color { RED, GREEN, BLUE };
int main() {
    Color c = GREEN;
    cout << c << endl;
    return 0;
}`)
    expect(generated).toContain('enum Color')
    expect(generated).toContain('RED')
    expect(generated).toContain('GREEN')
    expect(generated).toContain('BLUE')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t10: constexpr', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    constexpr int SIZE = 10;
    int arr[SIZE];
    arr[0] = 42;
    cout << arr[0] << endl;
    return 0;
}`)
    expect(generated).toContain('constexpr int SIZE = 10;')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t11: ternary multi-context', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    int x = 5;
    int y = x > 3 ? 10 : 20;
    cout << y << endl;
    int z = x < 0 ? -1 : 1;
    cout << z << endl;
    int w = x > 3 ? x + 1 : x - 1;
    cout << w << endl;
    return 0;
}`)
    expect(generated).toContain('?')
    expect(generated).toContain(':')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t12: cast multi-type', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    double d = 3.14;
    int n = (int)d;
    cout << n << endl;
    int a = 7;
    int b = 2;
    double r = (double)a / b;
    cout << r << endl;
    char c = (char)65;
    cout << c << endl;
    return 0;
}`)
    expect(generated).toContain('(int)')
    expect(generated).toContain('(double)')
    expect(generated).toContain('(char)')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t13: bitwise NOT', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    int a = 12;
    cout << ~a << endl;
    return 0;
}`)
    expect(generated).toContain('~a')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t14: bitwise binary ops via variables', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    int a = 12;
    int b = 10;
    int c = a & b;
    int d = a | b;
    int e = a ^ b;
    int f = a << 2;
    int g = a >> 1;
    cout << c << endl;
    cout << d << endl;
    cout << e << endl;
    cout << f << endl;
    cout << g << endl;
    return 0;
}`)
    expect(generated).toContain('a & b')
    expect(generated).toContain('a | b')
    expect(generated).toContain('a ^ b')
    expect(generated).toContain('a << 2')
    expect(generated).toContain('a >> 1')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t15: prefix/postfix increment/decrement', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    int x = 5;
    x++;
    cout << x << endl;
    x--;
    cout << x << endl;
    ++x;
    cout << x << endl;
    --x;
    cout << x << endl;
    return 0;
}`)
    expect(generated).toContain('x++')
    expect(generated).toContain('x--')
    expect(generated).toContain('++x')
    expect(generated).toContain('--x')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t16: compound assign all operators', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    int x = 10;
    x += 5;
    cout << x << endl;
    x -= 3;
    cout << x << endl;
    x *= 2;
    cout << x << endl;
    x /= 4;
    cout << x << endl;
    x %= 3;
    cout << x << endl;
    return 0;
}`)
    expect(generated).toContain('x += 5;')
    expect(generated).toContain('x -= 3;')
    expect(generated).toContain('x *= 2;')
    expect(generated).toContain('x /= 4;')
    expect(generated).toContain('x %= 3;')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t17: sizeof type and variable', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    cout << sizeof(int) << endl;
    cout << sizeof(double) << endl;
    cout << sizeof(char) << endl;
    int x = 42;
    cout << sizeof(x) << endl;
    return 0;
}`)
    expect(generated).toContain('sizeof(int)')
    expect(generated).toContain('sizeof(double)')
    expect(generated).toContain('sizeof(char)')
    expect(generated).toContain('sizeof(x)')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t18: enum declaration and usage', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
enum Color { RED, GREEN, BLUE };
int main() {
    Color c = GREEN;
    cout << c << endl;
    Color d = BLUE;
    cout << d << endl;
    cout << RED << endl;
    return 0;
}`)
    expect(generated).toContain('enum Color')
    expect(generated).toContain('RED')
    expect(generated).toContain('GREEN')
    expect(generated).toContain('BLUE')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t19: typedef and using alias', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
typedef long long ll;
using ull = unsigned long long;
int main() {
    ll a = 1000000000;
    ull b = 2000000000;
    cout << a << endl;
    cout << b << endl;
    return 0;
}`)
    expect(generated).toContain('typedef long long ll;')
    expect(generated).toContain('using ull = unsigned long long;')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t20: mixed ternary + increment + compound assign', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
int main() {
    int x = 5;
    x++;
    x += 3;
    int y = x > 5 ? x * 2 : x + 1;
    cout << y << endl;
    y--;
    y -= 2;
    int z = y > 10 ? 100 : 0;
    cout << z << endl;
    return 0;
}`)
    expect(generated).toContain('x++')
    expect(generated).toContain('x += 3;')
    expect(generated).toContain('?')
    expect(generated).toContain('y--')
    expect(generated).toContain('y -= 2;')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })

  it('t21: enum + typedef + sizeof + cast combined', () => {
    const { sem, generated } = assertStableRoundtrip(`#include <iostream>
using namespace std;
enum Season { SPRING, SUMMER, FALL, WINTER };
typedef int score;
int main() {
    Season s = SUMMER;
    cout << s << endl;
    score sc = 95;
    cout << sc << endl;
    cout << sizeof(Season) << endl;
    cout << sizeof(score) << endl;
    int x = (int)s + sc;
    cout << x << endl;
    return 0;
}`)
    expect(generated).toContain('enum Season')
    expect(generated).toContain('typedef int score;')
    expect(generated).toContain('sizeof(Season)')
    expect(generated).toContain('(int)s')
    expect(hasNoConcept(sem!, ['cpp_raw_code', 'cpp_raw_expression', 'unresolved'])).toBe(true)
  })
})
