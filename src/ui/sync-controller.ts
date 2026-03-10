import type { SemanticNode, StylePreset, CognitiveLevel } from '../core/types'
import type { ProgramScaffold, ScaffoldResult } from '../core/program-scaffold'
import type { CodingStyle } from '../languages/style'
import {
  detectStyleExceptions, applyStyleConversions,
  analyzeIoConformance,
  type StyleException, type IoConformanceResult,
} from '../languages/cpp/style-exceptions'
import { generateCodeWithMapping } from '../core/projection/code-generator'

/** Convert StylePreset (core/types) → CodingStyle (languages/style) for style exception detection */
function toCodingStyle(preset: StylePreset): CodingStyle {
  return {
    id: preset.id,
    nameKey: preset.id,
    ioPreference: preset.io_style === 'printf' ? 'cstdio' : 'iostream',
    namingConvention: preset.naming_convention,
    braceStyle: preset.brace_style,
    indent: preset.indent_size,
    useNamespaceStd: preset.namespace_style === 'using',
    headerStyle: preset.header_style === 'bits' ? 'bits' : 'iostream',
  }
}
import type { SourceMapping } from '../core/projection/code-generator'
import { renderToBlocklyState } from '../core/projection/block-renderer'
import { createNode } from '../core/semantic-tree'
import { Lifter } from '../core/lift/lifter'
import { SemanticBus } from '../core/semantic-bus'

/**
 * Strip scaffold nodes (include, using_namespace, func_def main wrapper, return)
 * from a semantic tree, leaving only the user's body statements.
 * Used for L0 block rendering — blocks only show the user's logic.
 */
export function stripScaffoldNodes(tree: SemanticNode): SemanticNode {
  const body = tree.children.body ?? []
  const userBody: SemanticNode[] = []

  for (const node of body) {
    // Skip include directives
    if (node.concept === 'cpp_include' || node.concept === 'cpp_include_local') continue
    // Skip using namespace
    if (node.concept === 'cpp_using_namespace') continue
    // Unwrap func_def(main) — extract its body, skip trailing return
    if (node.concept === 'func_def' && node.properties.name === 'main') {
      const funcBody = node.children.body ?? []
      for (const stmt of funcBody) {
        if (stmt.concept === 'return') continue
        userBody.push(stmt)
      }
      continue
    }
    // Keep everything else (user-defined functions, etc.)
    userBody.push(node)
  }

  return createNode('program', {}, { body: userBody })
}

export interface CodeParser {
  parse(code: string): { rootNode: unknown }
}

export class SyncController {
  private bus: SemanticBus
  private language: string
  private style: StylePreset
  private currentTree: SemanticNode | null = null
  private lifter: Lifter | null = null
  private parser: CodeParser | null = null
  private syncing = false
  private sourceMappings: SourceMapping[] = []
  private onErrorCallback: ((errors: SyncError[]) => void) | null = null
  private onStyleExceptionsCallback: ((exceptions: StyleException[], apply: () => void) => void) | null = null
  private onIoConformanceCallback: ((result: IoConformanceResult) => void) | null = null
  private codingStyle: CodingStyle | null = null
  private programScaffold: ProgramScaffold | null = null
  private cognitiveLevel: CognitiveLevel = 1
  private codePatcherFn: ((code: string, tree: SemanticNode) => string | null) | null = null

  constructor(
    bus: SemanticBus,
    language: string,
    style: StylePreset,
  ) {
    this.bus = bus
    this.language = language
    this.style = style

    // Subscribe to view requests
    bus.on('edit:blocks', (data) => this.handleEditBlocks(data))
    bus.on('edit:code', (data) => this.handleEditCode(data))
  }

  /** Set lifter and parser for code→blocks direction (US2) */
  setCodeToBlocksPipeline(lifter: Lifter, parser: CodeParser): void {
    this.lifter = lifter
    this.parser = parser
  }

  onError(callback: (errors: SyncError[]) => void): void {
    this.onErrorCallback = callback
  }

  onStyleExceptions(callback: (exceptions: StyleException[], apply: () => void) => void): void {
    this.onStyleExceptionsCallback = callback
  }

  /** Called when code→blocks detects I/O style non-conformance (借音 or 轉調) */
  onIoConformance(callback: (result: IoConformanceResult) => void): void {
    this.onIoConformanceCallback = callback
  }

  setCodingStyle(preset: StylePreset): void {
    this.codingStyle = toCodingStyle(preset)
  }

  setProgramScaffold(scaffold: ProgramScaffold): void {
    this.programScaffold = scaffold
  }

  setCognitiveLevel(level: CognitiveLevel): void {
    this.cognitiveLevel = level
  }

  /** Set a language-specific code patcher for auto-fixing missing dependencies after code→blocks */
  setCodePatcher(fn: (code: string, tree: SemanticNode) => string | null): void {
    this.codePatcherFn = fn
  }

  /** Patch code with missing dependencies (e.g. #include). Returns patched code or null if unchanged. */
  patchMissingDependencies(code: string): string | null {
    if (!this.codePatcherFn || !this.currentTree) return null
    return this.codePatcherFn(code, this.currentTree)
  }

  /** Handle edit:blocks event — sync blocks → semantic tree → code */
  private handleEditBlocks(data: { blocklyState: unknown }): void {
    if (this.syncing) return
    this.syncing = true
    try {
      const blocklyState = data.blocklyState as { tree: SemanticNode }
      const tree = blocklyState.tree
      this.currentTree = tree
      const { code, mappings } = generateCodeWithMapping(tree, this.language, this.style)
      this.sourceMappings = mappings

      // Compute scaffold result for ghost line decorations
      let scaffoldResult: ScaffoldResult | undefined
      if (this.programScaffold) {
        scaffoldResult = this.programScaffold.resolve(tree, {
          cognitiveLevel: this.cognitiveLevel,
        })
      }

      this.bus.emit('semantic:update', { tree, code, source: 'blocks', mappings, scaffoldResult })
    } finally {
      this.syncing = false
    }
  }

  /** Handle edit:code event — sync code → semantic tree → blocks */
  private handleEditCode(data: { code: string }): void {
    if (this.syncing || !this.lifter || !this.parser) return
    this.syncing = true
    try {
      const code = data.code
      const parseResult = this.parser.parse(code)
      const rootNode = parseResult.rootNode as import('../core/lift/types').AstNode

      // Check for parse errors
      const errors = this.findErrors(rootNode)
      if (errors.length > 0) {
        this.onErrorCallback?.(errors)
      }

      // Code-level I/O conformance check (before lift — 借音/轉調 detection)
      let ioResult: IoConformanceResult | null = null
      if (this.codingStyle) {
        const result = analyzeIoConformance(code, this.codingStyle.ioPreference)
        if (result.verdict !== 'conforming') {
          ioResult = result
        }
      }

      let tree = this.lifter.lift(rootNode)
      if (!tree) return

      // Semantic-level style exception check (after lift — toolbox block mismatches)
      let semanticExceptions: StyleException[] = []
      let applySemanticConversions: (() => void) | null = null
      if (this.codingStyle) {
        const exceptions = detectStyleExceptions(tree, this.codingStyle)
        if (exceptions.length > 0) {
          semanticExceptions = exceptions
          const currentTree = tree
          applySemanticConversions = () => {
            const converted = applyStyleConversions(currentTree, exceptions)
            this.currentTree = converted
            const convDisplay = this.cognitiveLevel === 0 ? stripScaffoldNodes(converted) : converted
            const blockState = renderToBlocklyState(convDisplay)
            this.bus.emit('semantic:update', { tree: converted, blockState, source: 'code' })
            // Mappings will be rebuilt by caller after Blockly renders
          }
        }
      }

      // Fire callbacks — prioritize bulk deviation (轉調) over semantic exceptions over minor exception (借音)
      if (ioResult?.verdict === 'bulk_deviation' && this.onIoConformanceCallback) {
        this.onIoConformanceCallback(ioResult)
      } else if (semanticExceptions.length > 0 && this.onStyleExceptionsCallback && applySemanticConversions) {
        this.onStyleExceptionsCallback(semanticExceptions, applySemanticConversions)
      } else if (ioResult?.verdict === 'minor_exception' && this.onIoConformanceCallback) {
        this.onIoConformanceCallback(ioResult)
      }

      this.currentTree = tree
      // For L0: strip scaffold nodes so blocks only show user's logic
      const displayTree = this.cognitiveLevel === 0 ? stripScaffoldNodes(tree) : tree
      const blockState = renderToBlocklyState(displayTree)

      // Emit update — Blockly will render blocks synchronously (assigning blockIds).
      // Source mappings are NOT built here because the lifted tree has no blockIds.
      // The caller (app.ts) must call rebuildSourceMappings() with the Blockly tree
      // after this returns, since only Blockly-extracted trees have blockIds.
      this.bus.emit('semantic:update', { tree, blockState, source: 'code' })
    } finally {
      this.syncing = false
    }
  }

  /** Convenience: trigger blocks→code sync from external code (e.g., app.ts) */
  syncBlocksToCode(tree?: SemanticNode): void {
    const t = tree ?? this.currentTree
    if (!t) return
    this.handleEditBlocks({ blocklyState: { tree: t } })
  }

  /**
   * Resync both panels after a cognitive level change.
   * - L0: blocks show body-only (scaffold stripped), code shows full (scaffold-wrapped)
   * - L1/L2: blocks show full tree, code shows full
   * When switching FROM L0 TO L1/L2, re-lifts from code to recover full tree.
   */
  resyncForLevel(extractedTree: SemanticNode, currentCode: string): void {
    if (this.syncing) return
    this.syncing = true
    try {
      let fullTree = extractedTree

      // If switching TO L1/L2 and tree has no main func (body-only from L0),
      // re-lift from the current code to get the full tree
      const hasMainFunc = (extractedTree.children.body ?? []).some(
        n => n.concept === 'func_def' && n.properties.name === 'main'
      )
      if (this.cognitiveLevel > 0 && !hasMainFunc && this.lifter && this.parser) {
        const parseResult = this.parser.parse(currentCode)
        const rootNode = parseResult.rootNode as import('../core/lift/types').AstNode
        if (rootNode) {
          const lifted = this.lifter.lift(rootNode)
          if (lifted) fullTree = lifted
        }
      }

      this.currentTree = fullTree

      // Generate code (scaffold wraps body-only trees; full trees use legacy path)
      const { code, mappings } = generateCodeWithMapping(fullTree, this.language, this.style)
      this.sourceMappings = mappings

      // Compute scaffold result for Monaco ghost decorations
      let scaffoldResult: ScaffoldResult | undefined
      if (this.programScaffold) {
        scaffoldResult = this.programScaffold.resolve(fullTree, {
          cognitiveLevel: this.cognitiveLevel,
        })
      }

      // For blocks: strip scaffold if L0
      const displayTree = this.cognitiveLevel === 0 ? stripScaffoldNodes(fullTree) : fullTree
      const blockState = renderToBlocklyState(displayTree)

      // Emit resync event — updates both code and block panels
      this.bus.emit('semantic:update', {
        tree: fullTree, code, blockState, source: 'resync', mappings, scaffoldResult,
      })
    } finally {
      this.syncing = false
    }
  }

  /** Convenience: trigger code→blocks sync from external code (e.g., app.ts) */
  syncCodeToBlocks(code?: string): boolean {
    if (!this.lifter || !this.parser) return false
    if (code !== undefined) {
      this.handleEditCode({ code })
      return true
    }
    return false
  }

  getCurrentTree(): SemanticNode | null {
    return this.currentTree
  }

  getBus(): SemanticBus {
    return this.bus
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

  /** Rebuild source mappings — requires bus to request current blocks state */
  rebuildSourceMappings(tree?: SemanticNode): void {
    try {
      const t = tree ?? this.currentTree
      if (!t) return
      const { mappings } = generateCodeWithMapping(t, this.language, this.style)
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
