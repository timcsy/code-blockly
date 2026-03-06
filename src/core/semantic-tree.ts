import type { SemanticNode, PropertyValue } from './types'

let idCounter = 0

export function generateId(): string {
  return `node_${++idCounter}_${Date.now().toString(36)}`
}

export function resetIdCounter(): void {
  idCounter = 0
}

export function createEmptyProgram(): SemanticNode {
  return {
    id: generateId(),
    concept: 'program',
    properties: {},
    children: { body: [] },
  }
}

export function createNode(
  concept: string,
  properties: Record<string, PropertyValue> = {},
  children: Record<string, SemanticNode[]> = {},
): SemanticNode {
  return {
    id: generateId(),
    concept,
    properties,
    children,
  }
}

export function addChild(
  tree: SemanticNode,
  targetId: string,
  childName: string,
  child: SemanticNode,
): SemanticNode {
  if (tree.id === targetId) {
    const existingChildren = tree.children[childName] ?? []
    return {
      ...tree,
      children: {
        ...tree.children,
        [childName]: [...existingChildren, child],
      },
    }
  }

  const newChildren: Record<string, SemanticNode[]> = {}
  let changed = false
  for (const [key, nodes] of Object.entries(tree.children)) {
    const mapped = nodes.map(n => {
      const updated = addChild(n, targetId, childName, child)
      if (updated !== n) changed = true
      return updated
    })
    newChildren[key] = mapped
  }

  return changed ? { ...tree, children: newChildren } : tree
}

export function removeChild(
  tree: SemanticNode,
  targetId: string,
  childName: string,
  index: number,
): SemanticNode {
  if (tree.id === targetId) {
    const existing = tree.children[childName] ?? []
    const updated = [...existing.slice(0, index), ...existing.slice(index + 1)]
    return {
      ...tree,
      children: {
        ...tree.children,
        [childName]: updated,
      },
    }
  }

  const newChildren: Record<string, SemanticNode[]> = {}
  let changed = false
  for (const [key, nodes] of Object.entries(tree.children)) {
    const mapped = nodes.map(n => {
      const updated = removeChild(n, targetId, childName, index)
      if (updated !== n) changed = true
      return updated
    })
    newChildren[key] = mapped
  }

  return changed ? { ...tree, children: newChildren } : tree
}

export function updateProperty(
  tree: SemanticNode,
  targetId: string,
  key: string,
  value: PropertyValue,
): SemanticNode {
  if (tree.id === targetId) {
    return {
      ...tree,
      properties: { ...tree.properties, [key]: value },
    }
  }

  const newChildren: Record<string, SemanticNode[]> = {}
  let changed = false
  for (const [k, nodes] of Object.entries(tree.children)) {
    const mapped = nodes.map(n => {
      const updated = updateProperty(n, targetId, key, value)
      if (updated !== n) changed = true
      return updated
    })
    newChildren[k] = mapped
  }

  return changed ? { ...tree, children: newChildren } : tree
}

export function findById(tree: SemanticNode, id: string): SemanticNode | null {
  if (tree.id === id) return tree

  for (const nodes of Object.values(tree.children)) {
    for (const node of nodes) {
      const found = findById(node, id)
      if (found) return found
    }
  }

  return null
}

export function serializeTree(tree: SemanticNode): string {
  return JSON.stringify(tree)
}

export function deserializeTree(json: string): SemanticNode {
  return JSON.parse(json) as SemanticNode
}
