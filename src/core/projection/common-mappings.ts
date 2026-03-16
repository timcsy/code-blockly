/**
 * Shared field→property and input→child mappings used by both
 * PatternExtractor and PatternRenderer.
 * Also provides a shared block ID counter.
 */

// ─── Block ID Counter ───

let blockIdCounter = 0

/** Generate a unique block ID with the given prefix. */
export function nextBlockId(prefix: string): string {
  return `${prefix}${++blockIdCounter}`
}

/** Reset the block ID counter (called at the start of each render pass). */
export function resetBlockIdCounter(): void {
  blockIdCounter = 0
}

/** Maps Blockly field names to semantic property names */
export const FIELD_COMMON_MAPPINGS: Record<string, string[]> = {
  'OP': ['operator'],
  'NUM': ['value'],
  'TEXT': ['value'],
  'VAR': ['variable', 'var_name'],
  'ARRAY': ['name'],
  'NS': ['namespace'],
  'HEADER': ['header'],
  'RETURN_TYPE': ['return_type'],
  'PARAMS': ['params'],
  'ARGS': ['args'],
  'BOUND': ['inclusive'],
  'FORMAT': ['format'],
  'POSITION': ['operator'],
}

/** Maps Blockly input names to semantic child slot names */
export const INPUT_COMMON_MAPPINGS: Record<string, string[]> = {
  'COND': ['condition'],
  'CONDITION': ['condition'],
  'THEN': ['then_body', 'then'],
  'ELSE': ['else_body', 'else'],
  'BODY': ['body', 'then_body'],
  'A': ['left', 'operand'],
  'B': ['right'],
  'EXPR': ['values', 'expression'],
  'VALUE': ['value', 'initializer'],
  'INIT': ['initializer'],
}

// ─── Dynamic Rule Utilities ───

/**
 * Resolve a dotpath from an object, supporting array indexing with [N].
 * Examples: "argCount", "args.length", "args[0].mode"
 * Template form with {i}: "args[{i}].mode" → resolved by caller replacing {i} first.
 */
export function resolvePath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Resolve a pattern string by replacing {i} with the given index.
 * Example: "ARG_{i}" with i=2 → "ARG_2"
 */
export function resolvePattern(pattern: string, index: number): string {
  return pattern.replace(/\{i\}/g, String(index))
}
