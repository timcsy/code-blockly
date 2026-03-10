import type { DiagnosticRule } from '../../core/diagnostics'

/** C++ specific diagnostic rules for block validation. */
export const cppDiagnosticRules: DiagnosticRule[] = [
  {
    blockTypes: ['u_if', 'u_if_else'],
    check: 'hasInput',
    inputName: 'CONDITION',
    severity: 'warning',
    message: 'DIAG_MISSING_CONDITION',
  },
  {
    blockTypes: ['u_while_loop'],
    check: 'hasInput',
    inputName: 'CONDITION',
    severity: 'warning',
    message: 'DIAG_MISSING_CONDITION',
  },
  {
    blockTypes: ['u_print'],
    check: 'hasInput',
    inputName: 'EXPR0',
    severity: 'warning',
    message: 'DIAG_MISSING_VALUE',
  },
  {
    blockTypes: ['u_var_declare'],
    check: 'varDeclareNames',
    severity: 'warning',
    message: 'DIAG_MISSING_VALUE',
  },
]
