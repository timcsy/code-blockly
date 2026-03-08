import { describe, it, expect, beforeAll } from 'vitest'
import { renderToBlocklyState } from '../../src/core/projection/block-renderer'
import { createNode } from '../../src/core/semantic-tree'
import type { SemanticNode } from '../../src/core/types'
import { setupTestRenderer } from '../helpers/setup-renderer'
import { IF_INPUTS, WHILE_INPUTS, COUNT_LOOP_INPUTS } from '../../src/blocks/block-input-names'

/**
 * Simulate Block Style switching: render semantic tree → block state → verify
 * that all input names in the state match what the runtime Blockly blocks expect.
 *
 * This is the cross-layer integration test that was missing — it verifies
 * the full path: SemanticNode → PatternRenderer/RenderStrategy → BlockState
 * produces input names consistent with app.new.ts dynamic registration.
 */

function makeProgram(...body: SemanticNode[]): SemanticNode {
  return { id: 'root', concept: 'program', properties: {}, children: { body } }
}

describe('serialize roundtrip: rendered block state matches runtime input names', () => {
  beforeAll(() => {
    setupTestRenderer()
  })

  it('u_if rendered state uses CONDITION and THEN (not COND/BODY)', () => {
    const ifStmt = createNode('if', {}, {
      condition: [createNode('var_ref', { name: 'x' })],
      then_body: [createNode('break', {})],
    })
    const state = renderToBlocklyState(makeProgram(ifStmt))
    const block = state.blocks.blocks[0]

    expect(block.type).toBe('u_if')
    // Must use the same names as block-input-names.ts (derived from JSON)
    expect(block.inputs[IF_INPUTS.value[0]]).toBeDefined()     // CONDITION
    expect(block.inputs[IF_INPUTS.statement[0]]).toBeDefined()  // THEN
    // Must NOT have old names
    expect(block.inputs['COND']).toBeUndefined()
    expect(block.inputs['BODY']).toBeUndefined()
  })

  it('u_if with else uses CONDITION, THEN, ELSE', () => {
    const ifElse = createNode('if', {}, {
      condition: [createNode('compare', { operator: '>' }, {
        left: [createNode('var_ref', { name: 'a' })],
        right: [createNode('number_literal', { value: '0' })],
      })],
      then_body: [createNode('var_assign', { name: 'x' }, {
        value: [createNode('number_literal', { value: '1' })],
      })],
      else_body: [createNode('var_assign', { name: 'x' }, {
        value: [createNode('number_literal', { value: '2' })],
      })],
    })
    const state = renderToBlocklyState(makeProgram(ifElse))
    const block = state.blocks.blocks[0]

    expect(block.type).toBe('u_if')
    expect(block.inputs[IF_INPUTS.value[0]]).toBeDefined()     // CONDITION
    expect(block.inputs[IF_INPUTS.statement[0]]).toBeDefined()  // THEN
    expect(block.inputs['ELSE']).toBeDefined()
    expect(block.inputs['COND']).toBeUndefined()
  })

  it('u_while_loop rendered state uses CONDITION and BODY', () => {
    const whileStmt = createNode('while_loop', {}, {
      condition: [createNode('var_ref', { name: 'running' })],
      body: [createNode('break', {})],
    })
    const state = renderToBlocklyState(makeProgram(whileStmt))
    const block = state.blocks.blocks[0]

    expect(block.type).toBe('u_while_loop')
    expect(block.inputs[WHILE_INPUTS.value[0]]).toBeDefined()     // CONDITION
    expect(block.inputs[WHILE_INPUTS.statement[0]]).toBeDefined() // BODY
    expect(block.inputs['COND']).toBeUndefined()
  })

  it('u_count_loop rendered state uses FROM, TO, BODY', () => {
    const countLoop = createNode('count_loop', { var_name: 'i' }, {
      from: [createNode('number_literal', { value: '0' })],
      to: [createNode('number_literal', { value: '10' })],
      body: [createNode('break', {})],
    })
    const state = renderToBlocklyState(makeProgram(countLoop))
    const block = state.blocks.blocks[0]

    expect(block.type).toBe('u_count_loop')
    expect(block.inputs[COUNT_LOOP_INPUTS.value[0]]).toBeDefined()     // FROM
    expect(block.inputs[COUNT_LOOP_INPUTS.value[1]]).toBeDefined()     // TO
    expect(block.inputs[COUNT_LOOP_INPUTS.statement[0]]).toBeDefined() // BODY
  })

  it('nested if inside while: all input names correct at both levels', () => {
    const nested = createNode('while_loop', {}, {
      condition: [createNode('var_ref', { name: 'ok' })],
      body: [
        createNode('if', {}, {
          condition: [createNode('var_ref', { name: 'flag' })],
          then_body: [createNode('break', {})],
        }),
      ],
    })
    const state = renderToBlocklyState(makeProgram(nested))
    const whileBlock = state.blocks.blocks[0]

    expect(whileBlock.type).toBe('u_while_loop')
    expect(whileBlock.inputs[WHILE_INPUTS.value[0]]).toBeDefined()

    const ifBlock = whileBlock.inputs[WHILE_INPUTS.statement[0]].block
    expect(ifBlock.type).toBe('u_if')
    expect(ifBlock.inputs[IF_INPUTS.value[0]]).toBeDefined()
    expect(ifBlock.inputs[IF_INPUTS.statement[0]]).toBeDefined()
    expect(ifBlock.inputs['COND']).toBeUndefined()
  })
})
