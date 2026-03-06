import { describe, it, expect, beforeAll } from 'vitest'
import { generateCodeWithMapping } from '../../src/core/projection/code-generator'
import { registerCppLanguage } from '../../src/languages/cpp/generators'
import { createNode } from '../../src/core/semantic-tree'
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

beforeAll(() => {
  registerCppLanguage()
})

function makeProgram(...body: ReturnType<typeof createNode>[]) {
  return {
    id: 'root',
    concept: 'program',
    properties: {},
    children: { body },
    metadata: {},
  }
}

describe('SourceMapping integration', () => {
  it('should produce mappings for program with blocks', () => {
    const decl = createNode('var_declare', { name: 'x', type: 'int' }, {
      initializer: [createNode('number_literal', { value: '5' })],
    })
    ;(decl as Record<string, unknown>).metadata = { blockId: 'block1' }

    const print = createNode('print', {}, {
      values: [createNode('var_ref', { name: 'x' })],
    })
    ;(print as Record<string, unknown>).metadata = { blockId: 'block2' }

    const tree = makeProgram(decl, print)
    const { code, mappings } = generateCodeWithMapping(tree, 'cpp', style)
    expect(code).toContain('int x = 5;')
    expect(code).toContain('cout')
    expect(mappings.length).toBeGreaterThanOrEqual(2)

    const block1 = mappings.find(m => m.blockId === 'block1')
    const block2 = mappings.find(m => m.blockId === 'block2')
    expect(block1).toBeDefined()
    expect(block2).toBeDefined()
    expect(block1!.startLine).toBeLessThan(block2!.startLine)
  })

  it('should produce empty mappings when no blockIds', () => {
    const decl = createNode('var_declare', { name: 'x', type: 'int' }, {
      initializer: [createNode('number_literal', { value: '1' })],
    })
    const tree = makeProgram(decl)
    const { mappings } = generateCodeWithMapping(tree, 'cpp', style)
    expect(mappings).toEqual([])
  })

  it('should handle nested structures', () => {
    const cond = createNode('compare', { operator: '>' }, {
      left: [createNode('var_ref', { name: 'x' })],
      right: [createNode('number_literal', { value: '0' })],
    })

    const print = createNode('print', {}, {
      values: [createNode('string_literal', { value: 'positive' })],
    })
    ;(print as Record<string, unknown>).metadata = { blockId: 'print1' }

    const ifNode = createNode('if', {}, {
      condition: [cond],
      then_body: [print],
      else_body: [],
    })
    ;(ifNode as Record<string, unknown>).metadata = { blockId: 'if1' }

    const tree = makeProgram(ifNode)
    const { mappings } = generateCodeWithMapping(tree, 'cpp', style)
    const ifMapping = mappings.find(m => m.blockId === 'if1')
    const printMapping = mappings.find(m => m.blockId === 'print1')
    expect(ifMapping).toBeDefined()
    expect(printMapping).toBeDefined()
    // Both have valid mappings — the print is contained within or at the if's range
    expect(printMapping!.startLine).toBeGreaterThanOrEqual(ifMapping!.startLine)
    expect(printMapping!.endLine).toBeLessThanOrEqual(ifMapping!.endLine)
  })
})
