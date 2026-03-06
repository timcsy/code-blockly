import type { ConceptDef, CognitiveLevel } from './types'

export class ConceptRegistry {
  private concepts = new Map<string, ConceptDef>()

  register(def: ConceptDef): void {
    if (this.concepts.has(def.id)) {
      throw new Error(`Concept '${def.id}' is already registered`)
    }
    this.concepts.set(def.id, def)
  }

  get(id: string): ConceptDef | undefined {
    return this.concepts.get(id)
  }

  listByLayer(layer: string): ConceptDef[] {
    return [...this.concepts.values()].filter(c => c.layer === layer)
  }

  listByLevel(level: CognitiveLevel): ConceptDef[] {
    return [...this.concepts.values()].filter(c => c.level <= level)
  }

  findAbstract(concreteId: string): ConceptDef | undefined {
    const concrete = this.concepts.get(concreteId)
    if (!concrete?.abstractConcept) return undefined
    return this.concepts.get(concrete.abstractConcept)
  }

  listAll(): ConceptDef[] {
    return [...this.concepts.values()]
  }
}
