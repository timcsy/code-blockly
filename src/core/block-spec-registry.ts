import type { BlockSpec, AstConstraint, CognitiveLevel } from './types'

export class BlockSpecRegistry {
  private specs = new Map<string, BlockSpec>()
  private byConceptId = new Map<string, BlockSpec>()

  loadFromJSON(specs: BlockSpec[]): void {
    for (const spec of specs) {
      this.specs.set(spec.id, spec)
      this.byConceptId.set(spec.concept.conceptId, spec)
    }
  }

  getByConceptId(conceptId: string): BlockSpec | undefined {
    return this.byConceptId.get(conceptId)
  }

  getByAstPattern(nodeType: string, constraints: AstConstraint[]): BlockSpec[] {
    return [...this.specs.values()].filter(spec => {
      if (spec.astPattern.nodeType !== nodeType) return false
      // All spec constraints must be satisfied by the provided constraints
      return spec.astPattern.constraints.every(sc =>
        constraints.some(c => c.field === sc.field && c.text === sc.text)
      )
    })
  }

  listByCategory(category: string, level: CognitiveLevel): BlockSpec[] {
    return [...this.specs.values()].filter(
      spec => spec.category === category && spec.level <= level
    )
  }

  getAll(): BlockSpec[] {
    return [...this.specs.values()]
  }
}
