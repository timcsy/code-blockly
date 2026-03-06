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
}
