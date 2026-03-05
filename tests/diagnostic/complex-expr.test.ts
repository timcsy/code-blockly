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
  it('unary minus: -b → u_arithmetic(0 - b)', async () => {
    const code = 'int x = -b;'
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)
    expect(topBlocks.length).toBe(1)

    const varDecl = topBlocks[0]
    expect(varDecl.type).toBe('u_var_declare')

    // The INIT should be u_arithmetic with OP='-', A=u_number(0), B=u_var_ref(b)
    const init = varDecl.inputs?.INIT?.block
    expect(init?.type).toBe('u_arithmetic')
    expect(init?.fields?.OP).toBe('-')
    expect(init?.inputs?.A?.block?.type).toBe('u_number')
    expect(init?.inputs?.B?.block?.type).toBe('u_var_ref')
    expect(init?.inputs?.B?.block?.fields?.NAME).toBe('b')
  })

  it('parenthesized: (a + b) → unwrap to u_arithmetic', async () => {
    const code = 'int x = (a + b);'
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)

    const init = topBlocks[0]?.inputs?.INIT?.block
    expect(init?.type).toBe('u_arithmetic')
    expect(init?.fields?.OP).toBe('+')
    // Should NOT have parenthesized wrapper
    expect(init?.inputs?.A?.block?.type).toBe('u_var_ref')
  })

  it('function call: sqrt(x) → u_func_call with extraState.argCount', async () => {
    const code = 'double y = sqrt(x);'
    const blocks = await converter.convert(code)
    const topBlocks = getTopBlocks(blocks)

    const init = topBlocks[0]?.inputs?.INIT?.block
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
})
