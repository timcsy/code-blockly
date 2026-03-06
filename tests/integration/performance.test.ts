import { describe, it, expect, beforeAll } from 'vitest'
import { Parser, Language } from 'web-tree-sitter'
import { Lifter } from '../../src/core/lift/lifter'
import { registerCppLifters } from '../../src/languages/cpp/lifters'
import { registerCppLanguage } from '../../src/languages/cpp/generators'
import { generateCode } from '../../src/core/projection/code-generator'
import { renderToBlocklyState } from '../../src/core/projection/block-renderer'
import type { StylePreset } from '../../src/core/types'

const style: StylePreset = {
  id: 'apcs',
  name: { 'zh-TW': 'APCS', en: 'APCS' },
  io_style: 'cout',
  naming_convention: 'camelCase',
  indent_size: 4,
  brace_style: 'K&R',
  namespace_style: 'using',
  header_style: 'individual',
}

const competitiveStyle: StylePreset = {
  id: 'competitive',
  name: { 'zh-TW': '競賽', en: 'Competitive' },
  io_style: 'printf',
  naming_convention: 'snake_case',
  indent_size: 4,
  brace_style: 'K&R',
  namespace_style: 'using',
  header_style: 'bits',
}

let tsParser: Parser
let lifter: Lifter

beforeAll(async () => {
  await Parser.init({
    locateFile: (scriptName: string) => `${process.cwd()}/public/${scriptName}`,
  })
  tsParser = new Parser()
  const lang = await Language.load(`${process.cwd()}/public/tree-sitter-cpp.wasm`)
  tsParser.setLanguage(lang)

  lifter = new Lifter()
  registerCppLifters(lifter)
  registerCppLanguage()
})

function liftCode(code: string) {
  const tree = tsParser.parse(code)
  return lifter.lift(tree.rootNode as any)
}

describe('Performance (SC-004/SC-007/SC-008)', () => {
  const mediumProgram = `
int main() {
    int n;
    cin >> n;
    int arr[100];
    for (int i = 0; i < n; i++) {
        cin >> arr[i];
    }
    int sum = 0;
    for (int i = 0; i < n; i++) {
        if (arr[i] > 0) {
            sum = sum + arr[i];
        }
    }
    cout << sum;
    return 0;
}
`

  it('lift + generate should complete within 300ms (SC-004)', () => {
    const start = performance.now()
    for (let i = 0; i < 10; i++) {
      const tree = liftCode(mediumProgram)
      generateCode(tree!, 'cpp', style)
    }
    const elapsed = (performance.now() - start) / 10
    expect(elapsed).toBeLessThan(300)
  })

  it('lift + renderToBlocklyState should complete within 500ms (SC-007)', () => {
    const start = performance.now()
    for (let i = 0; i < 10; i++) {
      const tree = liftCode(mediumProgram)
      renderToBlocklyState(tree!)
    }
    const elapsed = (performance.now() - start) / 10
    expect(elapsed).toBeLessThan(500)
  })

  it('style switching (projection) should complete within 200ms (SC-008)', () => {
    const tree = liftCode(mediumProgram)
    expect(tree).not.toBeNull()

    const start = performance.now()
    for (let i = 0; i < 20; i++) {
      generateCode(tree!, 'cpp', i % 2 === 0 ? style : competitiveStyle)
    }
    const elapsed = (performance.now() - start) / 20
    expect(elapsed).toBeLessThan(200)
  })

  it('large program (50 statements) should lift within 500ms', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `int v${i} = ${i * 2};`).join('\n')
    const start = performance.now()
    const tree = liftCode(lines)
    const elapsed = performance.now() - start
    expect(tree).not.toBeNull()
    expect(elapsed).toBeLessThan(500)
  })
})
