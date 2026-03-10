import { describe, it, expect } from 'vitest'
import { runDiagnostics } from '../../../src/core/diagnostics'
import type { DiagnosticBlock } from '../../../src/core/diagnostics'
import { cppDiagnosticRules } from '../../../src/languages/cpp/diagnostics'

function makeBlock(overrides: Partial<DiagnosticBlock> & { id: string; type: string }): DiagnosticBlock {
  return {
    getFieldValue: () => null,
    getInputTargetBlock: () => null,
    getInput: () => null,
    ...overrides,
  }
}

describe('runDiagnostics', () => {
  it('should return empty array for no blocks', () => {
    expect(runDiagnostics([], cppDiagnosticRules)).toEqual([])
  })

  it('should warn when u_if is missing condition', () => {
    const block = makeBlock({ id: 'b1', type: 'u_if' })
    const result = runDiagnostics([block], cppDiagnosticRules)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ blockId: 'b1', severity: 'warning', message: 'DIAG_MISSING_CONDITION' })
  })

  it('should not warn when u_if has condition', () => {
    const block = makeBlock({
      id: 'b1',
      type: 'u_if',
      getInputTargetBlock: (name: string) => name === 'CONDITION' ? makeBlock({ id: 'c1', type: 'u_compare' }) : null,
    })
    expect(runDiagnostics([block], cppDiagnosticRules)).toEqual([])
  })

  it('should warn when u_if_else is missing condition', () => {
    const block = makeBlock({ id: 'b2', type: 'u_if_else' })
    const result = runDiagnostics([block], cppDiagnosticRules)
    expect(result).toHaveLength(1)
    expect(result[0].message).toBe('DIAG_MISSING_CONDITION')
  })

  it('should warn when u_while_loop is missing condition', () => {
    const block = makeBlock({ id: 'b3', type: 'u_while_loop' })
    const result = runDiagnostics([block], cppDiagnosticRules)
    expect(result).toHaveLength(1)
    expect(result[0].message).toBe('DIAG_MISSING_CONDITION')
  })

  it('should warn when u_print is missing expression', () => {
    const block = makeBlock({ id: 'b4', type: 'u_print' })
    const result = runDiagnostics([block], cppDiagnosticRules)
    expect(result).toHaveLength(1)
    expect(result[0].message).toBe('DIAG_MISSING_VALUE')
  })

  it('should not warn when u_print has expression', () => {
    const block = makeBlock({
      id: 'b4',
      type: 'u_print',
      getInputTargetBlock: (name: string) => name === 'EXPR0' ? makeBlock({ id: 'e1', type: 'u_string' }) : null,
    })
    expect(runDiagnostics([block], cppDiagnosticRules)).toEqual([])
  })

  it('should warn when u_var_declare has empty name', () => {
    const block = makeBlock({
      id: 'b5',
      type: 'u_var_declare',
      getFieldValue: (name: string) => name === 'NAME' ? '' : null,
    })
    const result = runDiagnostics([block], cppDiagnosticRules)
    expect(result).toHaveLength(1)
    expect(result[0].message).toBe('DIAG_MISSING_VALUE')
  })

  it('should warn for indexed var_declare with empty name', () => {
    const block = makeBlock({
      id: 'b6',
      type: 'u_var_declare',
      getFieldValue: (name: string) => {
        if (name === 'NAME_0') return ''
        if (name === 'NAME_1') return 'y'
        return null
      },
    })
    const result = runDiagnostics([block], cppDiagnosticRules)
    expect(result).toHaveLength(1)
    expect(result[0].message).toBe('DIAG_MISSING_VALUE')
  })

  it('should handle multiple blocks with mixed diagnostics', () => {
    const blocks = [
      makeBlock({ id: 'b1', type: 'u_if' }),
      makeBlock({
        id: 'b2',
        type: 'u_if',
        getInputTargetBlock: (name: string) => name === 'CONDITION' ? makeBlock({ id: 'c1', type: 'u_compare' }) : null,
      }),
      makeBlock({ id: 'b3', type: 'u_print' }),
    ]
    const result = runDiagnostics(blocks, cppDiagnosticRules)
    expect(result).toHaveLength(2)
    expect(result.map(d => d.blockId)).toEqual(['b1', 'b3'])
  })
})
