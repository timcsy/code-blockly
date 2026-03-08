import type { SemanticNode } from '../types'
import { PatternRenderer } from './pattern-renderer'
import type { RenderContext } from '../registry/render-strategy-registry'

interface BlockState {
  type: string
  id: string
  fields: Record<string, unknown>
  inputs: Record<string, { block: BlockState }>
  next?: { block: BlockState }
  extraState?: Record<string, unknown>
  x?: number
  y?: number
}

interface WorkspaceBlockState {
  blocks: {
    languageVersion: number
    blocks: BlockState[]
  }
}

let globalPatternRenderer: PatternRenderer | null = null

/** Set the JSON-driven pattern renderer engine */
export function setPatternRenderer(pr: PatternRenderer): void {
  globalPatternRenderer = pr
}

let blockIdCounter = 0

function nextBlockId(): string {
  return `block_${++blockIdCounter}`
}

export function renderToBlocklyState(tree: SemanticNode): WorkspaceBlockState {
  blockIdCounter = 0
  if (tree.concept !== 'program') {
    return { blocks: { languageVersion: 0, blocks: [] } }
  }

  const body = tree.children.body ?? []
  if (body.length === 0) {
    return { blocks: { languageVersion: 0, blocks: [] } }
  }

  // Chain top-level statements into a single block chain
  const firstBlock = renderStatementChain(body)
  if (!firstBlock) {
    return { blocks: { languageVersion: 0, blocks: [] } }
  }

  firstBlock.x = 30
  firstBlock.y = 30

  return {
    blocks: {
      languageVersion: 0,
      blocks: [firstBlock],
    },
  }
}

function renderStatementChain(nodes: SemanticNode[]): BlockState | null {
  if (nodes.length === 0) return null

  const first = renderBlock(nodes[0])
  if (!first) return null

  let current = first
  for (let i = 1; i < nodes.length; i++) {
    const next = renderBlock(nodes[i])
    if (next) {
      current.next = { block: next }
      current = next
    }
  }

  return first
}

const renderCtx: RenderContext = {
  renderBlock: (n) => renderBlock(n),
  renderExpression: (n) => renderExpression(n),
  renderStatementChain: (ns) => renderStatementChain(ns),
  nextBlockId: () => nextBlockId(),
}

function renderBlock(node: SemanticNode): BlockState | null {
  // Single pipeline: delegate all rendering to PatternRenderer
  if (globalPatternRenderer) {
    const patternResult = globalPatternRenderer.render(node, renderCtx)
    if (patternResult) {
      propagateMetadata(patternResult, node)
      return patternResult
    }
  }

  // Special cases not handled by PatternRenderer (no BlockSpec)
  if (node.concept === 'raw_code') {
    const block: BlockState = {
      type: 'c_raw_code',
      id: nextBlockId(),
      fields: { CODE: node.metadata?.rawCode ?? node.properties.code ?? '' },
      inputs: {},
    }
    propagateMetadata(block, node)
    // 預設降級原因為 unsupported（若無明確標記）
    if (!block.extraState?.degradationCause) {
      block.extraState = { ...block.extraState, degradationCause: node.metadata?.degradationCause ?? 'unsupported' }
    }
    return block
  }
  if (node.concept === 'unresolved') {
    const block: BlockState = {
      type: 'c_raw_code',
      id: nextBlockId(),
      fields: { CODE: node.metadata?.rawCode ?? '' },
      inputs: {},
      extraState: { unresolved: true, nodeType: node.properties.node_type },
    }
    propagateMetadata(block, node)
    if (!block.extraState?.degradationCause) {
      block.extraState = { ...block.extraState, degradationCause: node.metadata?.degradationCause ?? 'unsupported' }
    }
    return block
  }

  return null
}

/** 將 SemanticNode 的 metadata 和 annotations 傳遞到 BlockState.extraState */
function propagateMetadata(block: BlockState, node: SemanticNode): void {
  const meta = node.metadata
  const annotations = node.annotations

  if (!meta?.degradationCause && !meta?.confidence && !annotations?.length) return

  const extra: Record<string, unknown> = { ...block.extraState }
  if (meta?.degradationCause) extra.degradationCause = meta.degradationCause
  if (meta?.confidence && meta.confidence !== 'high') extra.confidence = meta.confidence
  if (annotations?.length) extra.annotations = annotations
  block.extraState = extra
}

function renderExpression(node: SemanticNode): BlockState | null {
  const block = renderBlock(node)
  // If it's a raw_code (statement) block in expression context, use c_raw_expression instead
  if (block && block.type === 'c_raw_code') {
    return { ...block, type: 'c_raw_expression' }
  }
  return block
}
