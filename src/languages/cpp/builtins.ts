/**
 * C++ built-in constants — single source of truth.
 * Used by lifters, interpreter, and executor.
 */
import type { RuntimeType } from '../../interpreter/types'

export interface BuiltinConstant {
  type: RuntimeType
  value: number
}

/** Complete map of C++ built-in constants with their runtime values. */
export const CPP_BUILTIN_CONSTANTS: Record<string, BuiltinConstant> = {
  'true': { type: 'int', value: 1 },
  'false': { type: 'int', value: 0 },
  'EOF': { type: 'int', value: -1 },
  'NULL': { type: 'int', value: 0 },
  'nullptr': { type: 'int', value: 0 },
  'INT_MAX': { type: 'int', value: 2147483647 },
  'INT_MIN': { type: 'int', value: -2147483648 },
  'LLONG_MAX': { type: 'int', value: Number.MAX_SAFE_INTEGER },
  'LLONG_MIN': { type: 'int', value: Number.MIN_SAFE_INTEGER },
  'SIZE_MAX': { type: 'int', value: Number.MAX_SAFE_INTEGER },
}

/** Set of all built-in constant names (for filtering from scope snapshots, lifter checks, etc.) */
export const CPP_BUILTIN_NAMES: Set<string> = new Set(Object.keys(CPP_BUILTIN_CONSTANTS))
