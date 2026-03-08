import type { SemanticNode, StylePreset } from '../core/types'
import { generateCodeWithMapping } from '../core/projection/code-generator'
import type { SourceMapping } from '../core/projection/code-generator'
import { renderToBlocklyState } from '../core/projection/block-renderer'
import { Lifter } from '../core/lift/lifter'
import type { BlocklyPanel } from './panels/blockly-panel'
import type { MonacoPanel } from './panels/monaco-panel'

export interface CodeParser {
  parse(code: string): { rootNode: unknown }
}

export class SyncController {
  private blocklyPanel: BlocklyPanel
  private monacoPanel: MonacoPanel
  private language: string
  private style: StylePreset
  private currentTree: SemanticNode | null = null
  private lifter: Lifter | null = null
  private parser: CodeParser | null = null
  private syncing = false
  private sourceMappings: SourceMapping[] = []
  private onErrorCallback: ((errors: SyncError[]) => void) | null = null

  constructor(
    blocklyPanel: BlocklyPanel,
    monacoPanel: MonacoPanel,
    language: string,
    style: StylePreset,
  ) {
    this.blocklyPanel = blocklyPanel
    this.monacoPanel = monacoPanel
    this.language = language
    this.style = style
  }

  /** Set lifter and parser for code→blocks direction (US2) */
  setCodeToBlocksPipeline(lifter: Lifter, parser: CodeParser): void {
    this.lifter = lifter
    this.parser = parser
  }

  onError(callback: (errors: SyncError[]) => void): void {
    this.onErrorCallback = callback
  }

  /** Sync blocks → semantic tree → code (US1 direction) */
  syncBlocksToCode(): void {
    if (this.syncing) return
    this.syncing = true
    try {
      const tree = this.blocklyPanel.extractSemanticTree()
      this.currentTree = tree
      const { code, mappings } = generateCodeWithMapping(tree, this.language, this.style)
      this.sourceMappings = mappings
      this.monacoPanel.setCode(code)
    } finally {
      this.syncing = false
    }
  }

  /** Sync code → semantic tree → blocks (US2 direction) */
  syncCodeToBlocks(): boolean {
    if (this.syncing || !this.lifter || !this.parser) return false
    this.syncing = true
    try {
      const code = this.monacoPanel.getCode()
      const parseResult = this.parser.parse(code)
      const rootNode = parseResult.rootNode as import('../core/lift/types').AstNode

      // Check for parse errors
      const errors = this.findErrors(rootNode)
      if (errors.length > 0) {
        this.onErrorCallback?.(errors)
        // Continue with partial sync — lift what we can
      }

      const tree = this.lifter.lift(rootNode)
      if (!tree) return false

      this.currentTree = tree
      const blockState = renderToBlocklyState(tree)
      this.blocklyPanel.setState(blockState)

      // Build source mappings from semantic tree sourceRange + rendered block IDs
      this.sourceMappings = this.buildMappingsFromTree(tree, blockState)
      return true
    } finally {
      this.syncing = false
    }
  }

  getCurrentTree(): SemanticNode | null {
    return this.currentTree
  }

  setStyle(style: StylePreset): void {
    this.style = style
  }

  setLanguage(language: string): void {
    this.language = language
  }

  isSyncing(): boolean {
    return this.syncing
  }

  /** Rebuild source mappings from generated code (for blocks→code direction) */
  rebuildSourceMappings(): void {
    try {
      const tree = this.blocklyPanel.extractSemanticTree()
      this.currentTree = tree
      const { mappings } = generateCodeWithMapping(tree, this.language, this.style)
      this.sourceMappings = mappings
    } catch {
      // silently ignore — mappings may be stale but that's acceptable
    }
  }

  getSourceMappings(): SourceMapping[] {
    return [...this.sourceMappings]
  }

  getMappingForBlock(blockId: string): SourceMapping | null {
    return this.sourceMappings.find(m => m.blockId === blockId) ?? null
  }

  getMappingForLine(line: number): SourceMapping | null {
    let best: SourceMapping | null = null
    for (const m of this.sourceMappings) {
      if (line >= m.startLine && line <= m.endLine) {
        if (!best || (m.endLine - m.startLine) < (best.endLine - best.startLine)) {
          best = m
        }
      }
    }
    return best
  }

  /** Walk semantic tree and block state in parallel to build blockId→sourceRange mappings */
  private buildMappingsFromTree(
    tree: SemanticNode,
    blockState: { blocks: { blocks: unknown[] } },
  ): SourceMapping[] {
    const mappings: SourceMapping[] = []
    const body = tree.children.body ?? []
    if (body.length === 0 || blockState.blocks.blocks.length === 0) return mappings

    interface BlockNode { id: string; inputs?: Record<string, { block?: BlockNode }>; next?: { block?: BlockNode } }

    // Semantic child key → possible block input names
    const childToInput: Record<string, string[]> = {
      body: ['BODY', 'DO'],
      then_body: ['THEN', 'BODY'],
      else_body: ['ELSE'],
      condition: ['COND', 'CONDITION'],
      from: ['FROM'],
      to: ['TO'],
      value: ['VALUE', 'EXPR'],
      args: ['ARG0', 'ARG1', 'ARG2'],
      left: ['A'],
      right: ['B'],
    }

    const findBlockInput = (block: BlockNode, semKey: string): BlockNode | undefined => {
      if (!block.inputs) return undefined
      const candidates = childToInput[semKey] ?? [semKey.toUpperCase()]
      for (const name of candidates) {
        if (block.inputs[name]?.block) return block.inputs[name].block
      }
      return undefined
    }

    const walkChain = (nodes: SemanticNode[], firstBlock: BlockNode | undefined): void => {
      let currentBlock = firstBlock
      for (const node of nodes) {
        if (!currentBlock) break
        walkPair(node, currentBlock)
        currentBlock = currentBlock.next?.block
      }
    }

    const walkPair = (node: SemanticNode, block: BlockNode): void => {
      const sr = node.metadata?.sourceRange as { startLine: number; endLine: number } | undefined
      if (sr) {
        mappings.push({ blockId: block.id, startLine: sr.startLine, endLine: sr.endLine })
      }
      // Recurse into all children
      for (const [key, children] of Object.entries(node.children)) {
        if (!children || children.length === 0) continue
        const inputBlock = findBlockInput(block, key)
        if (!inputBlock) continue
        // Statement chains: children with multiple nodes linked by .next
        if (children.length > 1 || key.includes('body')) {
          walkChain(children, inputBlock)
        } else {
          // Single expression child
          walkPair(children[0], inputBlock)
        }
      }
    }

    walkChain(body, blockState.blocks.blocks[0] as BlockNode | undefined)
    return mappings
  }

  private findErrors(node: import('../core/lift/types').AstNode): SyncError[] {
    const errors: SyncError[] = []
    this.walkForErrors(node, errors)
    return errors
  }

  private walkForErrors(node: import('../core/lift/types').AstNode, errors: SyncError[]): void {
    if (node.type === 'ERROR') {
      errors.push({
        message: `Syntax error at line ${node.startPosition.row + 1}`,
        line: node.startPosition.row,
        column: node.startPosition.column,
        text: node.text,
      })
    }
    for (const child of node.children) {
      this.walkForErrors(child, errors)
    }
  }
}

export interface SyncError {
  message: string
  line: number
  column: number
  text: string
}
