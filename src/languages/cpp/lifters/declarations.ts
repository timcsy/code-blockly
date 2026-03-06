import type { Lifter } from '../../../core/lift/lifter'
import { createNode } from '../../../core/semantic-tree'

export function registerDeclarationLifters(lifter: Lifter): void {
  lifter.register('declaration', (node, ctx) => {
    // Find type
    const typeNode = node.namedChildren.find(c => c.type === 'primitive_type' || c.type === 'type_identifier' || c.type === 'qualified_identifier')
    const type = typeNode?.text ?? 'int'

    // Find declarators
    const declarators = node.namedChildren.filter(c => c.type === 'init_declarator' || c.type === 'identifier' || c.type === 'array_declarator')

    if (declarators.length === 0) {
      return createNode('var_declare', { name: 'x', type })
    }

    // Handle array declarations
    if (declarators[0].type === 'array_declarator') {
      const arrDecl = declarators[0]
      const name = arrDecl.namedChildren[0]?.text ?? 'arr'
      const sizeNode = arrDecl.namedChildren[1]
      const size = sizeNode?.text ?? '10'
      return createNode('array_declare', { type, name, size })
    }

    // Single declarator
    const decl = declarators[0]
    if (decl.type === 'identifier') {
      return createNode('var_declare', { name: decl.text, type })
    }

    // init_declarator: name = value
    const nameNode = decl.childForFieldName('declarator') ?? decl.namedChildren[0]
    const name = nameNode?.text ?? 'x'

    // Check if it's an array declarator
    if (nameNode?.type === 'array_declarator') {
      const arrName = nameNode.namedChildren[0]?.text ?? 'arr'
      const sizeNode = nameNode.namedChildren[1]
      const size = sizeNode?.text ?? '10'
      return createNode('array_declare', { type, name: arrName, size })
    }

    const valueNode = decl.childForFieldName('value')
    if (valueNode) {
      const value = ctx.lift(valueNode)
      return createNode('var_declare', { name, type }, {
        initializer: value ? [value] : [],
      })
    }

    return createNode('var_declare', { name, type })
  })

  lifter.register('expression_statement', (node, ctx) => {
    // Unwrap expression statements
    if (node.namedChildren.length === 1) {
      return ctx.lift(node.namedChildren[0])
    }
    return null
  })

  lifter.register('assignment_expression', (node, ctx) => {
    const left = node.childForFieldName('left')
    const right = node.childForFieldName('right')
    const name = left?.text ?? 'x'
    const value = right ? ctx.lift(right) : null
    return createNode('var_assign', { name }, {
      value: value ? [value] : [],
    })
  })
}
