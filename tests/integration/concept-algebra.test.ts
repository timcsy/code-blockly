import { describe, it, expect, beforeEach } from 'vitest'
import { ConceptRegistry } from '../../src/core/concept-registry'
import type { ConceptDef } from '../../src/core/types'

describe('Concept Algebra (US8)', () => {
  let registry: ConceptRegistry

  beforeEach(() => {
    registry = new ConceptRegistry()

    // Universal layer
    registry.register({
      id: 'container_add',
      layer: 'universal',
      level: 1,
      propertyNames: ['container'],
      childNames: ['value'],
    })
    registry.register({
      id: 'container_sort',
      layer: 'universal',
      level: 2,
      propertyNames: ['container'],
      childNames: ['from', 'to'],
    })
    registry.register({
      id: 'container_size',
      layer: 'universal',
      level: 1,
      propertyNames: ['container'],
      childNames: [],
    })

    // Lang-core layer
    registry.register({
      id: 'var_declare',
      layer: 'lang-core',
      level: 0,
      propertyNames: ['name', 'type'],
      childNames: ['initializer'],
    })

    // Lang-library layer (C++ specific)
    registry.register({
      id: 'cpp:vector_push_back',
      layer: 'lang-library',
      level: 2,
      abstractConcept: 'container_add',
      propertyNames: ['name'],
      childNames: ['value'],
    })
    registry.register({
      id: 'cpp:sort',
      layer: 'lang-library',
      level: 2,
      abstractConcept: 'container_sort',
      propertyNames: ['array'],
      childNames: ['from', 'to'],
    })
    registry.register({
      id: 'cpp:vector_size',
      layer: 'lang-library',
      level: 2,
      abstractConcept: 'container_size',
      propertyNames: ['name'],
      childNames: [],
    })
  })

  describe('Three-layer queries', () => {
    it('should list universal layer concepts', () => {
      const universal = registry.listByLayer('universal')
      expect(universal).toHaveLength(3)
      expect(universal.map(c => c.id)).toContain('container_add')
    })

    it('should list lang-library concepts', () => {
      const lib = registry.listByLayer('lang-library')
      expect(lib).toHaveLength(3)
      expect(lib.map(c => c.id)).toContain('cpp:vector_push_back')
    })

    it('should list lang-core concepts', () => {
      const core = registry.listByLayer('lang-core')
      expect(core).toHaveLength(1)
      expect(core[0].id).toBe('var_declare')
    })
  })

  describe('Abstract concept mapping', () => {
    it('should find abstract concept for cpp:vector_push_back', () => {
      const abstract = registry.findAbstract('cpp:vector_push_back')
      expect(abstract).toBeDefined()
      expect(abstract!.id).toBe('container_add')
      expect(abstract!.layer).toBe('universal')
    })

    it('should find abstract concept for cpp:sort', () => {
      const abstract = registry.findAbstract('cpp:sort')
      expect(abstract).toBeDefined()
      expect(abstract!.id).toBe('container_sort')
    })

    it('should return undefined for concept without abstract', () => {
      expect(registry.findAbstract('var_declare')).toBeUndefined()
    })

    it('should return undefined for unknown concept', () => {
      expect(registry.findAbstract('nonexistent')).toBeUndefined()
    })
  })

  describe('Cognitive level filtering', () => {
    it('should list L0 concepts only', () => {
      const l0 = registry.listByLevel(0)
      expect(l0.every(c => c.level <= 0)).toBe(true)
      expect(l0.map(c => c.id)).toContain('var_declare')
    })

    it('should list L1 concepts (includes L0)', () => {
      const l1 = registry.listByLevel(1)
      expect(l1.every(c => c.level <= 1)).toBe(true)
      expect(l1.map(c => c.id)).toContain('var_declare')
      expect(l1.map(c => c.id)).toContain('container_add')
    })

    it('should list all concepts at L2', () => {
      const l2 = registry.listByLevel(2)
      expect(l2).toHaveLength(7)
    })

    it('L2 concept should be hidden at L0', () => {
      const l0 = registry.listByLevel(0)
      expect(l0.map(c => c.id)).not.toContain('cpp:vector_push_back')
    })
  })
})
