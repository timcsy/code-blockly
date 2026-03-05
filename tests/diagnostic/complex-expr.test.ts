/**
 * Diagnostic test: complex expression conversion with adapter
 * Tests parenthesized expressions, unary minus, function calls, and extraState
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { BlockRegistry } from '../../src/core/block-registry'
import { CppParser } from '../../src/languages/cpp/parser'
import { CodeToBlocksConverter } from '../../src/core/code-to-blocks'
import { CppLanguageAdapter } from '../../src/languages/cpp/adapter'
import type { BlockSpec } from '../../src/core/types'
import universalBlocks from '../../src/blocks/universal.json'
import basicBlocks from '../../src/languages/cpp/blocks/basic.json'
import advancedBlocks from '../../src/languages/cpp/blocks/advanced.json'
import specialBlocks from '../../src/languages/cpp/blocks/special.json'

interface BlockJSON {
  type: string
  id: string
  fields?: Record<string, unknown>
  inputs?: Record<string, { block: BlockJSON }>
  extraState?: Record<string, unknown>
  next?: { block: BlockJSON }
}

let registry: BlockRegistry
let parser: CppParser
let adapter: CppLanguageAdapter
let converter: CodeToBlocksConverter

beforeAll(async () => {
  registry = new BlockRegistry()
  const allBlocks = [...universalBlocks, ...basicBlocks, ...advancedBlocks, ...specialBlocks] as BlockSpec[]
  allBlocks.forEach(spec => registry.register(spec))

  adapter = new CppLanguageAdapter()
  parser = new CppParser()
  await parser.init()
  converter = new CodeToBlocksConverter(registry, parser, adapter)
})

function getTopBlocks(result: unknown): BlockJSON[] {
  return (result as any)?.blocks?.blocks ?? []
}

function findBlockByType(block: BlockJSON, type: string): BlockJSON | null {
  if (block.type === type) return block
  if (block.inputs) {
    for (const val of Object.values(block.inputs)) {
      const found = findBlockByType(val.block, type)
      if (found) return found
    }
  }
  if (block.next) {
    const found = findBlockByType(block.next.block, type)
    if (found) return found
  }
  return null
}

describe('Complex expression conversion with adapter', () => {
  it('unary minus: -b → u_negate(b)', async () => {
    const code = 'int x = -b;'
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)
    expect(topBlocks.length).toBe(1)

    const varDecl = topBlocks[0]
    expect(varDecl.type).toBe('u_var_declare')

    // The INIT_0 should be u_negate with VALUE=u_var_ref(b)
    const init = varDecl.inputs?.INIT_0?.block
    expect(init?.type).toBe('u_negate')
    expect(init?.inputs?.VALUE?.block?.type).toBe('u_var_ref')
    expect(init?.inputs?.VALUE?.block?.fields?.NAME).toBe('b')
  })

  it('parenthesized: (a + b) → unwrap to u_arithmetic', async () => {
    const code = 'int x = (a + b);'
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)

    const init = topBlocks[0]?.inputs?.INIT_0?.block
    expect(init?.type).toBe('u_arithmetic')
    expect(init?.fields?.OP).toBe('+')
    // Should NOT have parenthesized wrapper
    expect(init?.inputs?.A?.block?.type).toBe('u_var_ref')
  })

  it('function call: sqrt(x) → u_func_call with extraState.argCount', async () => {
    const code = 'double y = sqrt(x);'
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)

    const init = topBlocks[0]?.inputs?.INIT_0?.block
    expect(init?.type).toBe('u_func_call')
    expect(init?.fields?.NAME).toBe('sqrt')
    expect(init?.inputs?.ARG0?.block?.type).toBe('u_var_ref')
    // CRITICAL: must have extraState.argCount for Blockly deserialization
    expect(init?.extraState?.argCount).toBe(1)
  })

  it('u_func_call nested in expression gets extraState', async () => {
    const code = 'double x1 = (-b + sqrt(b * b - 4 * a * c)) / (2 * a);'
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)

    // Find the u_func_call block in the nested tree
    const funcCall = findBlockByType(topBlocks[0], 'u_func_call')
    expect(funcCall).not.toBeNull()
    expect(funcCall?.fields?.NAME).toBe('sqrt')
    expect(funcCall?.extraState?.argCount).toBe(1)
  })

  it('full quadratic formula program converts without error', async () => {
    const code = [
      '#include <iostream>',
      '#include <cmath>',
      'using namespace std;',
      '',
      'int main() {',
      '    double a, b, c;',
      '    cin >> a >> b >> c;',
      '    double x1 = (-b + sqrt(b * b - 4 * a * c)) / (2 * a);',
      '    double x2 = (-b - sqrt(b * b - 4 * a * c)) / (2 * a);',
      '    cout << x1 << endl;',
      '    cout << x2 << endl;',
      '    return 0;',
      '}',
    ].join('\n')
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)
    expect(topBlocks.length).toBeGreaterThan(0)

    // Verify no c_raw_expression blocks in the tree
    const checkNoRawExpr = (block: BlockJSON) => {
      expect(block.type).not.toBe('c_raw_expression')
      if (block.inputs) {
        for (const val of Object.values(block.inputs)) {
          checkNoRawExpr(val.block)
        }
      }
      if (block.next) checkNoRawExpr(block.next.block)
    }
    checkNoRawExpr(topBlocks[0])
  })

  describe('operator precedence parenthesization', () => {
    // Helper to build a nested arithmetic block
    function arithBlock(op: string, a: BlockJSON, b: BlockJSON): BlockJSON {
      return { type: 'u_arithmetic', id: 'test', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } }
    }
    function varBlock(name: string): BlockJSON {
      return { type: 'u_var_ref', id: 'test', fields: { NAME: name } }
    }
    function numBlock(n: number): BlockJSON {
      return { type: 'u_number', id: 'test', fields: { NUM: n } }
    }

    it('(a + b) * c → adds parens for lower precedence left child', () => {
      // * { A: + { A: a, B: b }, B: c }
      const block = arithBlock('*', arithBlock('+', varBlock('a'), varBlock('b')), varBlock('c'))
      const code = adapter.generateCode('u_arithmetic', block, 0)
      expect(code).toBe('(a + b) * c')
    })

    it('a * b + c → no parens needed', () => {
      const block = arithBlock('+', arithBlock('*', varBlock('a'), varBlock('b')), varBlock('c'))
      const code = adapter.generateCode('u_arithmetic', block, 0)
      expect(code).toBe('a * b + c')
    })

    it('a - (b + c) → adds parens for right child with same precedence group', () => {
      const block = arithBlock('-', varBlock('a'), arithBlock('+', varBlock('b'), varBlock('c')))
      const code = adapter.generateCode('u_arithmetic', block, 0)
      expect(code).toBe('a - (b + c)')
    })

    it('a * b / c → no parens for left child with same precedence', () => {
      // / { A: * { A: a, B: b }, B: c }
      const block = arithBlock('/', arithBlock('*', varBlock('a'), varBlock('b')), varBlock('c'))
      const code = adapter.generateCode('u_arithmetic', block, 0)
      expect(code).toBe('a * b / c')
    })

    it('a / (b * c) → adds parens for right child with same precedence', () => {
      const block = arithBlock('/', varBlock('a'), arithBlock('*', varBlock('b'), varBlock('c')))
      const code = adapter.generateCode('u_arithmetic', block, 0)
      expect(code).toBe('a / (b * c)')
    })

    it('(a + b) > (c - d) → adds parens for arithmetic inside comparison', () => {
      const block: BlockJSON = {
        type: 'u_compare', id: 'test', fields: { OP: '>' },
        inputs: {
          A: { block: arithBlock('+', varBlock('a'), varBlock('b')) },
          B: { block: arithBlock('-', varBlock('c'), varBlock('d')) },
        },
      }
      // compare has order 10, arithmetic + has order 12 which is > 10
      // so no parens needed (higher order = higher precedence)
      const code = adapter.generateCode('u_compare', block, 0)
      expect(code).toBe('a + b > c - d')
    })

    it('(a > b) && (c < d) → no parens for higher prec inside logic', () => {
      const block: BlockJSON = {
        type: 'u_logic', id: 'test', fields: { OP: '&&' },
        inputs: {
          A: { block: { type: 'u_compare', id: 't', fields: { OP: '>' }, inputs: { A: { block: varBlock('a') }, B: { block: varBlock('b') } } } },
          B: { block: { type: 'u_compare', id: 't', fields: { OP: '<' }, inputs: { A: { block: varBlock('c') }, B: { block: varBlock('d') } } } },
        },
      }
      const code = adapter.generateCode('u_logic', block, 0)
      expect(code).toBe('a > b && c < d')
    })

    it('quadratic: (-b + sqrt(...)) / (2 * a) generates correct parens', () => {
      // (-b + sqrt(x)) / (2 * a) → (-b + sqrt(x)) / (2 * a)
      const sqrtBlock: BlockJSON = {
        type: 'u_func_call', id: 't', fields: { NAME: 'sqrt' },
        inputs: { ARG0: { block: varBlock('x') } },
        extraState: { argCount: 1 },
      }
      const negB: BlockJSON = { type: 'u_negate', id: 'test', inputs: { VALUE: { block: varBlock('b') } } }
      const numerator = arithBlock('+', negB, sqrtBlock)
      const denominator = arithBlock('*', numBlock(2), varBlock('a'))
      const block = arithBlock('/', numerator, denominator)
      const code = adapter.generateCode('u_arithmetic', block, 0)
      expect(code).toBe('(-b + sqrt(x)) / (2 * a)')
    })

    it('unary minus: -b → generates -b (using u_negate)', () => {
      const block: BlockJSON = { type: 'u_negate', id: 'test', inputs: { VALUE: { block: varBlock('b') } } }
      const code = adapter.generateCode('u_negate', block, 0)
      expect(code).toBe('-b')
    })

    it('unary minus with complex operand: -(a + b) → adds parens', () => {
      const block: BlockJSON = { type: 'u_negate', id: 'test', inputs: { VALUE: { block: arithBlock('+', varBlock('a'), varBlock('b')) } } }
      const code = adapter.generateCode('u_negate', block, 0)
      expect(code).toBe('-(a + b)')
    })

    it('unary minus in multiplication: -a * b → no parens (higher precedence)', () => {
      const negA: BlockJSON = { type: 'u_negate', id: 'test', inputs: { VALUE: { block: varBlock('a') } } }
      const block = arithBlock('*', negA, varBlock('b'))
      const code = adapter.generateCode('u_arithmetic', block, 0)
      expect(code).toBe('-a * b')
    })
  })

  it('complex if condition: (b*b-4*a*c>0) decomposes to u_compare (not c_raw_expression)', async () => {
    const code = [
      '#include <iostream>',
      'using namespace std;',
      'int main() {',
      '    double a, b, c;',
      '    cin >> a >> b >> c;',
      '    if (b*b-4*a*c>0) {',
      '        cout << "two roots" << endl;',
      '    }',
      '    return 0;',
      '}',
    ].join('\n')
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)

    // Find the u_if_else block
    const ifBlock = findBlockByType(topBlocks[0], 'u_if_else')
    expect(ifBlock).not.toBeNull()

    // COND should be u_compare (not c_raw_expression)
    const cond = ifBlock?.inputs?.COND?.block
    expect(cond?.type).toBe('u_compare')
    expect(cond?.fields?.OP).toBe('>')
  })

  it('u_input with multiple vars gets extraState.varCount', async () => {
    const code = [
      'int main() {',
      '    cin >> a >> b >> c;',
      '    return 0;',
      '}',
    ].join('\n')
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)
    // Find u_input in the nested block tree
    const inputBlock = findBlockByType(topBlocks[0], 'u_input')
    expect(inputBlock).not.toBeNull()
    expect(inputBlock?.extraState?.varCount).toBe(3)
  })

  describe('if / else if / else chains', () => {
    it('simple if-else generates correctly', () => {
      const block: BlockJSON = {
        type: 'u_if_else', id: 'test',
        inputs: {
          COND: { block: { type: 'u_compare', id: 't', fields: { OP: '>' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
          THEN: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 1 } } } } } },
          ELSE: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
        },
      }
      const code = adapter.generateCode('u_if_else', block, 0)
      expect(code).toContain('if (x > 0)')
      expect(code).toContain('} else {')
      expect(code).toContain('y = 0;')
    })

    it('dynamic else-if generates "else if" using COND1/THEN1 format', () => {
      const block: BlockJSON = {
        type: 'u_if_else', id: 'test',
        extraState: { elseIfCount: 1 },
        inputs: {
          COND: { block: { type: 'u_compare', id: 't', fields: { OP: '>' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
          THEN: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 1 } } } } } },
          COND1: { block: { type: 'u_compare', id: 't', fields: { OP: '<' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
          THEN1: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: -1 } } } } } },
          ELSE: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
        },
      }
      const code = adapter.generateCode('u_if_else', block, 0)
      expect(code).toContain('} else if (x < 0)')
      expect(code).not.toMatch(/else \{\s*\n\s*if \(/)
      expect(code).toContain('} else {')
      expect(code).toContain('y = 0;')
    })

    it('legacy else-if chain (nested u_if_else in ELSE) still works', () => {
      const block: BlockJSON = {
        type: 'u_if_else', id: 'test',
        inputs: {
          COND: { block: { type: 'u_compare', id: 't', fields: { OP: '>' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
          THEN: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 1 } } } } } },
          ELSE: { block: {
            type: 'u_if_else', id: 'test2',
            inputs: {
              COND: { block: { type: 'u_compare', id: 't', fields: { OP: '<' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
              THEN: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: -1 } } } } } },
              ELSE: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
            },
          } },
        },
      }
      const code = adapter.generateCode('u_if_else', block, 0)
      expect(code).toContain('} else if (x < 0)')
      expect(code).not.toMatch(/else \{\s*\n\s*if \(/)
    })

    it('else-if with trailing u_if (no else) flattens correctly (legacy)', () => {
      const block: BlockJSON = {
        type: 'u_if_else', id: 'test',
        inputs: {
          COND: { block: { type: 'u_compare', id: 't', fields: { OP: '>' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
          THEN: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 1 } } } } } },
          ELSE: { block: {
            type: 'u_if', id: 'test2',
            inputs: {
              COND: { block: { type: 'u_compare', id: 't', fields: { OP: '<' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
              BODY: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: -1 } } } } } },
            },
          } },
        },
      }
      const code = adapter.generateCode('u_if_else', block, 0)
      expect(code).toContain('} else if (x < 0)')
    })

    it('parses if / else if / else from C++ code into flattened format', async () => {
      const code = [
        'int main() {',
        '    int x = 5;',
        '    int y;',
        '    if (x > 0) {',
        '        y = 1;',
        '    } else if (x < 0) {',
        '        y = -1;',
        '    } else {',
        '        y = 0;',
        '    }',
        '    return 0;',
        '}',
      ].join('\n')
      const blocks = await converter.convert(code)
      const topBlocks = getTopBlocks(blocks)
      expect(topBlocks.length).toBeGreaterThan(0)

      // Find the u_if_else block
      const ifElse = findBlockByType(topBlocks[0], 'u_if_else')
      expect(ifElse).not.toBeNull()
      expect(ifElse?.inputs?.COND).toBeDefined()
      expect(ifElse?.inputs?.THEN).toBeDefined()

      // Should have flattened COND1/THEN1 instead of nested u_if_else in ELSE
      expect(ifElse?.inputs?.COND1).toBeDefined()
      expect(ifElse?.inputs?.THEN1).toBeDefined()
      expect(ifElse?.inputs?.ELSE).toBeDefined()
      // extraState should have hasElse and elseIfCount
      expect(ifElse?.extraState?.hasElse).toBe(true)
      expect(ifElse?.extraState?.elseIfCount).toBe(1)
    })

    it('parses pure if (no else) into u_if_else with hasElse=false', async () => {
      const code = [
        'if (x > 0) {',
        '    y = 1;',
        '}',
      ].join('\n')
      const blocks = await converter.convert(code)
      const topBlocks = getTopBlocks(blocks)

      const ifBlock = topBlocks[0]
      expect(ifBlock?.type).toBe('u_if_else')
      expect(ifBlock?.inputs?.COND).toBeDefined()
      expect(ifBlock?.inputs?.THEN).toBeDefined()
      expect(ifBlock?.inputs?.ELSE).toBeUndefined()
      expect(ifBlock?.extraState?.hasElse).toBe(false)
      expect(ifBlock?.extraState?.elseIfCount).toBe(0)
    })

    it('parses triple if/else-if/else-if/else chain', async () => {
      const code = [
        'if (x > 10) {',
        '    y = 3;',
        '} else if (x > 0) {',
        '    y = 2;',
        '} else if (x < 0) {',
        '    y = 1;',
        '} else {',
        '    y = 0;',
        '}',
      ].join('\n')
      const blocks = await converter.convert(code)
      const topBlocks = getTopBlocks(blocks)

      const ifElse = topBlocks[0]
      expect(ifElse?.type).toBe('u_if_else')
      expect(ifElse?.inputs?.COND).toBeDefined()
      expect(ifElse?.inputs?.THEN).toBeDefined()
      expect(ifElse?.inputs?.COND1).toBeDefined()
      expect(ifElse?.inputs?.THEN1).toBeDefined()
      expect(ifElse?.inputs?.COND2).toBeDefined()
      expect(ifElse?.inputs?.THEN2).toBeDefined()
      expect(ifElse?.inputs?.ELSE).toBeDefined()
      expect(ifElse?.extraState?.elseIfCount).toBe(2)
    })

    it('roundtrip: parse else-if chain → generate code with "else if"', async () => {
      const code = [
        'int main() {',
        '    int x = 5;',
        '    int y;',
        '    if (x > 0) {',
        '        y = 1;',
        '    } else if (x < 0) {',
        '        y = -1;',
        '    } else {',
        '        y = 0;',
        '    }',
        '    return 0;',
        '}',
      ].join('\n')
      const blocks = await converter.convert(code)
      const topBlocks = getTopBlocks(blocks)

      // Find the if_else block and generate code from it
      const ifElse = findBlockByType(topBlocks[0], 'u_if_else')
      expect(ifElse).not.toBeNull()
      const generated = adapter.generateCode('u_if_else', ifElse!, 1)
      expect(generated).toContain('} else if (')
      expect(generated).not.toMatch(/else \{\s*\n\s*if \(/)
    })

    it('dynamic else-if with multiple branches generates correct code', () => {
      const block: BlockJSON = {
        type: 'u_if_else', id: 'test',
        extraState: { elseIfCount: 2 },
        inputs: {
          COND: { block: { type: 'u_compare', id: 't', fields: { OP: '>' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 10 } } } } } },
          THEN: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 3 } } } } } },
          COND1: { block: { type: 'u_compare', id: 't', fields: { OP: '>' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
          THEN1: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 2 } } } } } },
          COND2: { block: { type: 'u_compare', id: 't', fields: { OP: '<' }, inputs: { A: { block: { type: 'u_var_ref', id: 't', fields: { NAME: 'x' } } }, B: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
          THEN2: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 1 } } } } } },
          ELSE: { block: { type: 'u_var_assign', id: 't', fields: { NAME: 'y' }, inputs: { VALUE: { block: { type: 'u_number', id: 't', fields: { NUM: 0 } } } } } },
        },
      }
      const code = adapter.generateCode('u_if_else', block, 0)
      expect(code).toContain('if (x > 10)')
      expect(code).toContain('} else if (x > 0)')
      expect(code).toContain('} else if (x < 0)')
      expect(code).toContain('} else {')
    })
  })

  describe('multi-variable declaration expansion', () => {
    /** Walk the next-chain to collect all blocks */
    function collectChain(block: BlockJSON | undefined): BlockJSON[] {
      const chain: BlockJSON[] = []
      let cur = block
      while (cur) {
        chain.push(cur)
        cur = cur.next?.block
      }
      return chain
    }

    it('int a,b,c; → single u_var_declare block with 3 variables', async () => {
      const code = 'int a,b,c;'
      const blocks = await converter.convert(code)
      const topBlocks = getTopBlocks(blocks)

      expect(topBlocks).toHaveLength(1)
      const block = topBlocks[0]
      expect(block?.type).toBe('u_var_declare')
      expect(block?.fields?.TYPE).toBe('int')
      expect(block?.fields?.NAME_0).toBe('a')
      expect(block?.fields?.NAME_1).toBe('b')
      expect(block?.fields?.NAME_2).toBe('c')
      expect(block?.extraState?.items).toEqual(['var', 'var', 'var'])
    })

    it('int a=1, b=2; → single u_var_declare block with 2 init variables', async () => {
      const code = 'int a=1, b=2;'
      const blocks = await converter.convert(code)
      const topBlocks = getTopBlocks(blocks)

      expect(topBlocks).toHaveLength(1)
      const block = topBlocks[0]
      expect(block?.fields?.NAME_0).toBe('a')
      expect(block?.inputs?.INIT_0?.block?.type).toBe('u_number')
      expect(block?.fields?.NAME_1).toBe('b')
      expect(block?.inputs?.INIT_1?.block?.type).toBe('u_number')
      expect(block?.extraState?.items).toEqual(['var_init', 'var_init'])
    })

    it('single declaration int x; still works normally', async () => {
      const code = 'int x;'
      const blocks = await converter.convert(code)
      const topBlocks = getTopBlocks(blocks)

      expect(topBlocks).toHaveLength(1)
      expect(topBlocks[0]?.type).toBe('u_var_declare')
      expect(topBlocks[0]?.fields?.NAME_0).toBe('x')
    })
  })
})
