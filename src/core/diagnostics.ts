export interface Diagnostic {
  blockId: string
  severity: 'warning' | 'error'
  message: string
}

export interface DiagnosticBlock {
  id: string
  type: string
  getFieldValue(name: string): string | null
  getInputTargetBlock(name: string): DiagnosticBlock | null
  getInput(name: string): unknown | null
}

/** Data-driven diagnostic rule definition. */
export interface DiagnosticRule {
  blockTypes: string[]
  check: 'hasInput' | 'varDeclareNames'
  inputName?: string
  severity: 'warning' | 'error'
  message: string
}

/** Build a block-type→rules index for efficient lookup. */
function buildRuleIndex(rules: DiagnosticRule[]): Map<string, DiagnosticRule[]> {
  const index = new Map<string, DiagnosticRule[]>()
  for (const rule of rules) {
    for (const bt of rule.blockTypes) {
      const existing = index.get(bt)
      if (existing) existing.push(rule)
      else index.set(bt, [rule])
    }
  }
  return index
}

export function runDiagnostics(blocks: DiagnosticBlock[], rules: DiagnosticRule[] = []): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const ruleIndex = buildRuleIndex(rules)

  for (const block of blocks) {
    const blockRules = ruleIndex.get(block.type)
    if (!blockRules) continue

    for (const rule of blockRules) {
      switch (rule.check) {
        case 'hasInput':
          if (rule.inputName && !block.getInputTargetBlock(rule.inputName)) {
            diagnostics.push({ blockId: block.id, severity: rule.severity, message: rule.message })
          }
          break

        case 'varDeclareNames': {
          let i = 0
          let hasAnyVar = false
          while (true) {
            const name = block.getFieldValue(`NAME_${i}`)
            if (name === null) break
            if (!name || name.trim() === '') {
              diagnostics.push({ blockId: block.id, severity: rule.severity, message: rule.message })
            }
            hasAnyVar = true
            i++
          }
          if (!hasAnyVar) {
            const name = block.getFieldValue('NAME')
            if (!name || name.trim() === '') {
              diagnostics.push({ blockId: block.id, severity: rule.severity, message: rule.message })
            }
          }
          break
        }
      }
    }
  }

  return diagnostics
}
