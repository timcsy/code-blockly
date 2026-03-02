import type { BlockRegistry } from '../../core/block-registry'
import type { BlockSpec } from '../../core/types'

interface BlockJSON {
  type: string
  id?: string
  fields?: Record<string, unknown>
  inputs?: Record<string, { block: BlockJSON }>
  next?: { block: BlockJSON }
}

interface WorkspaceJSON {
  blocks: {
    languageVersion: number
    blocks: BlockJSON[]
  }
}

interface GenerateResult {
  code: string
  order: number
}

export class CppGenerator {
  private registry: BlockRegistry
  private collectedImports: Set<string> = new Set()

  constructor(registry: BlockRegistry) {
    this.registry = registry
  }

  getLanguageId(): string {
    return 'cpp'
  }

  generate(workspace: WorkspaceJSON): string {
    this.collectedImports = new Set()

    const topBlocks = workspace.blocks?.blocks ?? []
    const bodyParts: string[] = []

    for (const block of topBlocks) {
      const code = this.generateStatementChain(block, 0)
      if (code) bodyParts.push(code)
    }

    const body = bodyParts.join('\n')

    // Build imports section (auto-collected from codeTemplate.imports)
    const autoImports = Array.from(this.collectedImports).sort()
    const importLines = autoImports.map(h => `#include <${h}>`).join('\n')

    // Check if the body already has explicit #include directives
    // If so, don't duplicate them
    const existingIncludes = new Set<string>()
    const bodyLines = body.split('\n')
    for (const line of bodyLines) {
      const match = line.match(/^#include\s*<(.+?)>/)
      if (match) existingIncludes.add(match[1])
    }

    const filteredImports = autoImports
      .filter(h => !existingIncludes.has(h))
      .map(h => `#include <${h}>`)
      .join('\n')

    if (filteredImports) {
      return filteredImports + '\n\n' + body
    }

    return body
  }

  private generateStatementChain(block: BlockJSON, indent: number): string {
    const parts: string[] = []
    let current: BlockJSON | undefined = block

    while (current) {
      const code = this.generateBlock(current, indent)
      if (code.code) parts.push(code.code)
      current = current.next?.block
    }

    return parts.join('\n')
  }

  private generateBlock(block: BlockJSON, indent: number): GenerateResult {
    const spec = this.registry.get(block.type)
    if (!spec) {
      return { code: this.indent(`/* unknown block: ${block.type} */`, indent), order: 0 }
    }

    // Collect imports
    for (const imp of spec.codeTemplate.imports) {
      this.collectedImports.add(imp)
    }

    const pattern = spec.codeTemplate.pattern
    const code = this.substituteTemplate(pattern, block, spec, indent)

    return { code: this.indent(code, indent), order: spec.codeTemplate.order }
  }

  private generateExpression(block: BlockJSON, parentOrder: number): GenerateResult {
    const spec = this.registry.get(block.type)
    if (!spec) {
      return { code: `/* unknown: ${block.type} */`, order: 0 }
    }

    // Collect imports
    for (const imp of spec.codeTemplate.imports) {
      this.collectedImports.add(imp)
    }

    const pattern = spec.codeTemplate.pattern
    const code = this.substituteTemplate(pattern, block, spec, 0)
    const order = spec.codeTemplate.order

    // Add parentheses if child has lower or equal precedence than parent
    // (lower order number = lower precedence in C)
    // Atoms (order >= 20) never need parentheses
    // Equal order also needs parens (e.g. a+b inside a*b, both order 6)
    if (order <= parentOrder && order > 0 && order < 20) {
      return { code: `(${code})`, order }
    }

    return { code, order }
  }

  private substituteTemplate(pattern: string, block: BlockJSON, spec: BlockSpec, indent: number): string {
    return pattern.replace(/\$\{(\w+)\}/g, (_match, name: string) => {
      // Check fields first
      if (block.fields && name in block.fields) {
        return String(block.fields[name])
      }

      // Check inputs (value inputs and statement inputs)
      if (block.inputs && name in block.inputs) {
        const inputBlock = block.inputs[name].block
        if (inputBlock) {
          // Determine if this is a statement input (contains \n in the pattern after ${NAME})
          if (this.isStatementInput(pattern, name)) {
            return this.generateStatementChain(inputBlock, indent + 1)
          } else {
            // Value input - generate as expression
            const result = this.generateExpression(inputBlock, spec.codeTemplate.order)
            return result.code
          }
        }
      }

      // Default: empty string for missing inputs
      return ''
    })
  }

  private isStatementInput(pattern: string, inputName: string): boolean {
    // A statement input is one where the placeholder is on its own line or preceded by \n
    const placeholder = '${' + inputName + '}'
    const idx = pattern.indexOf(placeholder)
    if (idx === -1) return false

    // Check if there's a \n before the placeholder
    const before = pattern.substring(0, idx)
    return before.endsWith('\n')
  }

  private indent(code: string, level: number): string {
    if (level === 0) return code
    const prefix = '    '.repeat(level)
    return code.split('\n').map(line => line ? prefix + line : line).join('\n')
  }
}
