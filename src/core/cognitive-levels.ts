import type { CognitiveLevel } from './types'

/**
 * Maps block types to their cognitive level (L0/L1/L2).
 * L0 = Beginner: basic I/O, variables, simple control flow
 * L1 = Intermediate: logic ops, functions, count loops, break/continue
 * L2 = Advanced: arrays, raw code, language-specific blocks
 */
const BLOCK_LEVELS: Record<string, CognitiveLevel> = {
  // L0 - Beginner
  u_var_declare: 0,
  u_var_assign: 0,
  u_var_ref: 0,
  u_number: 0,
  u_string: 0,
  u_arithmetic: 0,
  u_compare: 0,
  u_if: 0,
  u_if_else: 0,
  u_while_loop: 0,
  u_print: 0,
  u_input: 0,
  u_endl: 0,

  // L1 - Intermediate
  u_logic: 1,
  u_logic_not: 1,
  u_negate: 1,
  u_count_loop: 1,
  u_break: 1,
  u_continue: 1,
  u_func_def: 1,
  u_func_call: 1,
  u_return: 1,

  // L2 - Advanced
  u_array_declare: 2,
  u_array_access: 2,
  c_raw_code: 2,
  c_raw_expression: 2,
  c_include: 2,
  c_include_local: 2,
  c_define: 2,
  c_ifdef: 2,
  c_ifndef: 2,
  c_comment_line: 2,
  c_using_namespace: 2,
}

/** Get the cognitive level for a block type. Unknown blocks default to L2. */
export function getBlockLevel(blockType: string): CognitiveLevel {
  return BLOCK_LEVELS[blockType] ?? 2
}

/** Check if a block type is available at the given cognitive level */
export function isBlockAvailable(blockType: string, level: CognitiveLevel): boolean {
  return getBlockLevel(blockType) <= level
}

/** Filter a list of block types to those available at the given level */
export function filterBlocksByLevel(blockTypes: string[], level: CognitiveLevel): string[] {
  return blockTypes.filter(t => isBlockAvailable(t, level))
}
