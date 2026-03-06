import type { Lifter } from '../../../core/lift/lifter'
import { createNode } from '../../../core/semantic-tree'
import { registerDeclarationLifters } from './declarations'
import { registerExpressionLifters } from './expressions'
import { registerStatementLifters } from './statements'
import { registerIOLifters } from './io'

export function registerCppLifters(lifter: Lifter): void {
  registerStatementLifters(lifter)
  registerDeclarationLifters(lifter)
  registerExpressionLifters(lifter)
  registerIOLifters(lifter)

  // Comment lifter
  lifter.register('comment', (node) => {
    let text = node.text
    if (text.startsWith('//')) text = text.slice(2).trim()
    else if (text.startsWith('/*') && text.endsWith('*/')) text = text.slice(2, -2).trim()

    const commentNode = createNode('comment', { text })
    commentNode.annotations = [{
      type: 'comment' as const,
      text: node.text,
      position: 'before' as const,
    }]
    return commentNode
  })

  // #include <header> or #include "header"
  lifter.register('preproc_include', (node) => {
    const pathNode = node.namedChildren.find(c => c.type === 'system_lib_string' || c.type === 'string_literal')
    if (!pathNode) {
      const raw = createNode('raw_code', {})
      raw.metadata = { rawCode: node.text }
      return raw
    }
    const rawPath = pathNode.text
    // System include: <iostream> → strip < >
    if (rawPath.startsWith('<') && rawPath.endsWith('>')) {
      const header = rawPath.slice(1, -1)
      return createNode('cpp_include', { header, local: false })
    }
    // Local include: "myheader.h" → strip quotes
    if (rawPath.startsWith('"') && rawPath.endsWith('"')) {
      const header = rawPath.slice(1, -1)
      return createNode('cpp_include_local', { header })
    }
    const raw = createNode('raw_code', {})
    raw.metadata = { rawCode: node.text }
    return raw
  })

  // using namespace std;
  lifter.register('using_declaration', (node) => {
    const text = node.text
    const match = text.match(/using\s+namespace\s+(\w+)\s*;?/)
    if (match) {
      return createNode('cpp_using_namespace', { namespace: match[1] })
    }
    const raw = createNode('raw_code', {})
    raw.metadata = { rawCode: text }
    return raw
  })

  // #define NAME VALUE
  lifter.register('preproc_def', (node) => {
    const nameNode = node.childForFieldName('name')
    const valueNode = node.childForFieldName('value')
    const name = nameNode?.text ?? 'MACRO'
    const value = valueNode?.text ?? ''
    return createNode('cpp_define', { name, value })
  })
}
