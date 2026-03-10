import type { StylePreset } from '../../../core/types'
import type { NodeGenerator } from '../../../core/projection/code-generator'
import { registerIostreamGenerators } from '../std/iostream/generators'
import { registerCstdioGenerators } from '../std/cstdio/generators'

/**
 * @deprecated Use iostream/generators and cstdio/generators directly.
 * This file is a re-export shim for backward compatibility.
 */
export function registerIOGenerators(g: Map<string, NodeGenerator>, style: StylePreset): void {
  registerIostreamGenerators(g, style)
  registerCstdioGenerators(g, style)
}
