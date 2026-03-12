import type { ConceptExecutor } from '../executor-registry'
import { unescapeC } from '../../core/registry/transform-registry'
import { CPP_BUILTIN_CONSTANTS } from '../../languages/cpp/builtins'

export function registerLiteralExecutors(register: (concept: string, executor: ConceptExecutor) => void): void {
  register('number_literal', async (node) => {
    const raw = String(node.properties.value)
    const num = Number(raw)
    if (raw.includes('.')) {
      return { type: 'double', value: num }
    }
    return { type: 'int', value: Math.trunc(num) }
  })

  register('string_literal', async (node) => {
    return { type: 'string', value: unescapeC(String(node.properties.value)) }
  })

  register('cpp_char_literal', async (node) => {
    const ch = String(node.properties.char ?? '')
    return { type: 'char', value: ch.charCodeAt(0) || 0 }
  })

  register('builtin_constant', async (node) => {
    const value = String(node.properties.value)
    const builtin = CPP_BUILTIN_CONSTANTS[value]
    if (builtin) return { type: builtin.type, value: builtin.value }
    return { type: 'int', value: 0 }
  })

  register('endl', async () => {
    return { type: 'string', value: '\n' }
  })
}
