import { describe, it, expect } from 'vitest'
import { BlockSpecRegistry } from '../../src/core/block-spec-registry'
import type { BlockSpec } from '../../src/core/types'
import algorithmBlocks from '../../src/languages/cpp/blocks/stdlib/algorithms.json'
import containerBlocks from '../../src/languages/cpp/blocks/stdlib/containers.json'

describe('JSON-only extension (US6)', () => {
  it('should load algorithm block specs from JSON', () => {
    const registry = new BlockSpecRegistry()
    registry.loadFromJSON(algorithmBlocks as unknown as BlockSpec[])
    const all = registry.getAll()
    expect(all.length).toBe(2)
    expect(all.map(s => s.id)).toContain('cpp_sort')
    expect(all.map(s => s.id)).toContain('cpp_find')
  })

  it('should load container block specs from JSON', () => {
    const registry = new BlockSpecRegistry()
    registry.loadFromJSON(containerBlocks as unknown as BlockSpec[])
    const all = registry.getAll()
    expect(all.length).toBe(2)
    expect(all.map(s => s.id)).toContain('cpp_vector_push_back')
    expect(all.map(s => s.id)).toContain('cpp_vector_size')
  })

  it('should have valid blockDef with type field', () => {
    for (const spec of algorithmBlocks as unknown as BlockSpec[]) {
      const blockDef = spec.blockDef as Record<string, unknown>
      expect(blockDef.type).toBeTruthy()
      expect(typeof blockDef.type).toBe('string')
    }
    for (const spec of containerBlocks as unknown as BlockSpec[]) {
      const blockDef = spec.blockDef as Record<string, unknown>
      expect(blockDef.type).toBeTruthy()
    }
  })

  it('should have codeTemplate with pattern', () => {
    for (const spec of algorithmBlocks as unknown as BlockSpec[]) {
      expect(spec.codeTemplate.pattern).toBeTruthy()
      expect(spec.codeTemplate.imports).toBeDefined()
    }
  })

  it('should have astPattern for lifting', () => {
    for (const spec of algorithmBlocks as unknown as BlockSpec[]) {
      expect(spec.astPattern.nodeType).toBeTruthy()
    }
  })

  it('should coexist with universal blocks without conflicts', () => {
    const registry = new BlockSpecRegistry()
    const universalBlocks = require('../../src/blocks/universal.json') as BlockSpec[]
    registry.loadFromJSON(universalBlocks)
    registry.loadFromJSON(algorithmBlocks as unknown as BlockSpec[])
    registry.loadFromJSON(containerBlocks as unknown as BlockSpec[])

    // All should be loaded
    const all = registry.getAll()
    expect(all.length).toBeGreaterThan(4)

    // No ID conflicts
    const ids = all.map(s => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have concept mapping with abstractConcept', () => {
    const sortSpec = (algorithmBlocks as unknown as BlockSpec[]).find(s => s.id === 'cpp_sort')
    expect(sortSpec).toBeDefined()
    expect(sortSpec!.concept.conceptId).toBe('cpp:sort')
    expect(sortSpec!.concept.abstractConcept).toBe('container_sort')

    const pushBackSpec = (containerBlocks as unknown as BlockSpec[]).find(s => s.id === 'cpp_vector_push_back')
    expect(pushBackSpec!.concept.abstractConcept).toBe('container_add')
  })
})
