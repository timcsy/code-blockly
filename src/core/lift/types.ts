/** Minimal interface for tree-sitter AST nodes */
export interface AstNode {
  type: string
  text: string
  isNamed: boolean
  children: AstNode[]
  namedChildren: AstNode[]
  childForFieldName(name: string): AstNode | null
  startPosition: { row: number; column: number }
  endPosition: { row: number; column: number }
}

export type NodeLifter = (node: AstNode, ctx: LiftContext) => import('../types').SemanticNode | null

export interface LiftContext {
  lift: (node: AstNode) => import('../types').SemanticNode | null
  liftChildren: (nodes: AstNode[]) => import('../types').SemanticNode[]
  /** Scope-aware context for Level 2+ lifting */
  data: import('./lift-context').LiftContextData
}
