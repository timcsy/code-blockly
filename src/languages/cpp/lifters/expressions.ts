import type { Lifter } from '../../../core/lift/lifter'
import { createNode } from '../../../core/semantic-tree'

const ARITHMETIC_OPS = new Set(['+', '-', '*', '/', '%'])
const COMPARE_OPS = new Set(['>', '<', '>=', '<=', '==', '!='])
const LOGIC_OPS = new Set(['&&', '||'])

export function registerExpressionLifters(lifter: Lifter): void {
  lifter.register('number_literal', (node) => {
    return createNode('number_literal', { value: node.text })
  })

  lifter.register('identifier', (node) => {
    return createNode('var_ref', { name: node.text })
  })

  lifter.register('string_literal', (node) => {
    const value = node.text.replace(/^"|"$/g, '')
    return createNode('string_literal', { value })
  })

  lifter.register('char_literal', (node) => {
    const value = node.text.replace(/^'|'$/g, '')
    return createNode('string_literal', { value })
  })

  lifter.register('true', () => createNode('var_ref', { name: 'true' }))
  lifter.register('false', () => createNode('var_ref', { name: 'false' }))

  lifter.register('binary_expression', (node, ctx) => {
    const leftNode = node.childForFieldName('left')
    const rightNode = node.childForFieldName('right')

    // Find operator (unnamed child between left and right)
    let op = '+'
    for (const child of node.children) {
      if (!child.isNamed && child.text !== '(' && child.text !== ')') {
        op = child.text
        break
      }
    }

    const left = leftNode ? ctx.lift(leftNode) : null
    const right = rightNode ? ctx.lift(rightNode) : null

    let concept: string
    if (ARITHMETIC_OPS.has(op)) concept = 'arithmetic'
    else if (COMPARE_OPS.has(op)) concept = 'compare'
    else if (LOGIC_OPS.has(op)) concept = 'logic'
    else concept = 'arithmetic' // fallback

    return createNode(concept, { operator: op }, {
      left: left ? [left] : [],
      right: right ? [right] : [],
    })
  })

  lifter.register('unary_expression', (node, ctx) => {
    const op = node.children.find(c => !c.isNamed)?.text ?? ''
    const operandNode = node.childForFieldName('argument') ?? node.namedChildren[0]
    const operand = operandNode ? ctx.lift(operandNode) : null

    if (op === '!') {
      return createNode('logic_not', {}, {
        operand: operand ? [operand] : [],
      })
    }
    if (op === '-') {
      return createNode('negate', {}, {
        value: operand ? [operand] : [],
      })
    }

    // Fallback for other unary ops (++, --, etc.)
    const raw = createNode('raw_code', {})
    raw.metadata = { rawCode: node.text }
    return raw
  })

  lifter.register('parenthesized_expression', (node, ctx) => {
    // Unwrap parenthesized expressions
    if (node.namedChildren.length === 1) {
      return ctx.lift(node.namedChildren[0])
    }
    return null
  })

  lifter.register('subscript_expression', (node, ctx) => {
    const arrayNode = node.childForFieldName('argument') ?? node.namedChildren[0]
    const indexNode = node.childForFieldName('index') ?? node.namedChildren[1]
    const name = arrayNode?.text ?? 'arr'
    const index = indexNode ? ctx.lift(indexNode) : null
    return createNode('array_access', { name }, {
      index: index ? [index] : [],
    })
  })
}
