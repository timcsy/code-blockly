/**
 * Round-trip tests for C++ OOP concepts:
 * cpp_class_def (with liftStrategy), cpp_constructor, cpp_destructor,
 * cpp_virtual_method, cpp_pure_virtual, cpp_override_method, cpp_operator_overload
 *
 * Verifies: code → lift → SemanticTree → generate → code
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { Parser, Language } from 'web-tree-sitter'
import { createTestLifter } from '../helpers/setup-lifter'
import type { Lifter } from '../../src/core/lift/lifter'
import { registerCppLanguage } from '../../src/languages/cpp/generators'
import { generateCode } from '../../src/core/projection/code-generator'
import { setupTestRenderer } from '../helpers/setup-renderer'
import type { StylePreset } from '../../src/core/types'

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

function liftCode(code: string) {
  const tree = tsParser.parse(code)
  return lifter.lift(tree.rootNode as any)
}

function roundTripCode(code: string): string {
  const tree = liftCode(code)
  expect(tree).not.toBeNull()
  return generateCode(tree!, 'cpp', style)
}

describe('Round-trip: C++ OOP concepts', () => {
  describe('cpp_class_def with liftStrategy', () => {
    it('class with public and private members', () => {
      const code = `class Dog {
public:
    int age;
private:
    int id;
};`
      const result = roundTripCode(code)
      expect(result).toContain('class Dog')
      expect(result).toContain('public:')
      expect(result).toContain('private:')
    })

    it('class with constructor and destructor', () => {
      const code = `class Cat {
public:
    Cat(int a) {
        age = a;
    }
    ~Cat() {
    }
private:
    int age;
};`
      const result = roundTripCode(code)
      expect(result).toContain('Cat(int a)')
      expect(result).toContain('~Cat()')
      expect(result).toContain('age = a;')
    })
  })

  describe('cpp_constructor', () => {
    it('constructor with initializer list', () => {
      const code = `class Foo {
public:
    Foo(int x) : val(x) {
    }
private:
    int val;
};`
      const result = roundTripCode(code)
      expect(result).toContain('Foo(int x)')
      expect(result).toContain('val(x)')
    })

    it('constructor with multiple parameters', () => {
      const code = `class Point {
public:
    Point(int a, int b) {
        x = a;
        y = b;
    }
private:
    int x;
    int y;
};`
      const result = roundTripCode(code)
      expect(result).toContain('Point(int a, int b)')
    })
  })

  describe('cpp_virtual_method', () => {
    it('virtual method with body', () => {
      const code = `class Animal {
public:
    virtual void speak() {
        int x = 0;
    }
};`
      const result = roundTripCode(code)
      expect(result).toContain('virtual void speak()')
    })
  })

  describe('cpp_pure_virtual', () => {
    it('pure virtual method', () => {
      const code = `class Shape {
public:
    virtual double area() = 0;
};`
      const result = roundTripCode(code)
      expect(result).toContain('virtual double area() = 0;')
    })
  })

  describe('cpp_operator_overload', () => {
    it('operator+ overload', () => {
      const code = `class Vec {
public:
    Vec operator+(Vec other) {
        return other;
    }
};`
      const result = roundTripCode(code)
      expect(result).toContain('operator+')
      expect(result).toContain('Vec other')
    })
  })

  describe('P1 round-trip drift check', () => {
    it('class lifts consistently across two round-trips', () => {
      const code = `class Simple {
public:
    int x;
};`
      const tree1 = liftCode(code)
      expect(tree1).not.toBeNull()
      const gen1 = generateCode(tree1!, 'cpp', style)
      const tree2 = liftCode(gen1)
      expect(tree2).not.toBeNull()

      function findConcept(node: any, concept: string): boolean {
        if (node.concept === concept) return true
        for (const children of Object.values(node.children ?? {})) {
          for (const child of children as any[]) {
            if (findConcept(child, concept)) return true
          }
        }
        return false
      }
      expect(findConcept(tree1!, 'cpp_class_def')).toBe(true)
      expect(findConcept(tree2!, 'cpp_class_def')).toBe(true)
    })
  })
})
