import type { StylePreset } from '../../../core/types'
import type { NodeGenerator } from '../../../core/projection/code-generator'
import { indent, generateExpression } from '../../../core/projection/code-generator'

export function registerIOGenerators(g: Map<string, NodeGenerator>, style: StylePreset): void {
  g.set('print', (node, ctx) => {
    const values = node.children.values ?? []
    if (style.io_style === 'cout') {
      const parts = values.map(v => generateExpression(v, ctx))
      return `${indent(ctx)}cout << ${parts.join(' << ')};\n`
    }
    // printf mode: separate endl nodes from value expressions
    const exprValues = values.filter(v => v.concept !== 'endl')
    const hasEndl = values.some(v => v.concept === 'endl')
    const parts = exprValues.map(v => generateExpression(v, ctx))
    if (parts.length === 0 && hasEndl) {
      return `${indent(ctx)}printf("\\n");\n`
    }
    const fmt = parts.map(() => '%d').join(' ') + (hasEndl ? '\\n' : '')
    return `${indent(ctx)}printf("${fmt}", ${parts.join(', ')});\n`
  })

  g.set('input', (node, ctx) => {
    // Support both: children.values (var_ref nodes) and properties.variable (legacy)
    const valueNodes = node.children.values ?? []
    let vars: string[]
    if (valueNodes.length > 0) {
      vars = valueNodes.map(v => generateExpression(v, ctx))
    } else {
      vars = (node.properties.variables as string[] | undefined) ?? [node.properties.variable ?? 'x']
    }
    if (style.io_style === 'cout') {
      return `${indent(ctx)}cin >> ${vars.join(' >> ')};\n`
    }
    return vars.map(v => `${indent(ctx)}scanf("%d", &${v});\n`).join('')
  })

  g.set('endl', (_node, _ctx) => 'endl')
}
