import { Parser, Language, type Tree } from 'web-tree-sitter'

export type { Tree }

export class CppParser {
  private parser: Parser | null = null
  private initialized = false

  getLanguageId(): string {
    return 'cpp'
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async init(wasmDir?: string): Promise<void> {
    if (this.initialized) return

    const resolvedWasmDir = wasmDir ?? this.getDefaultWasmDir()

    await Parser.init({
      locateFile: (scriptName: string) => {
        return this.joinPath(resolvedWasmDir, scriptName)
      },
    })

    this.parser = new Parser()

    const langPath = this.joinPath(resolvedWasmDir, 'tree-sitter-cpp.wasm')
    const language = await Language.load(langPath)
    this.parser.setLanguage(language)
    this.initialized = true
  }

  async parse(code: string): Promise<Tree> {
    if (!this.parser) {
      throw new Error('Parser not initialized. Call init() first.')
    }
    return this.parser.parse(code) as Tree
  }

  private getDefaultWasmDir(): string {
    const g = globalThis as Record<string, unknown>
    const proc = g['process'] as { cwd?: () => string } | undefined
    if (!proc?.cwd) {
      return ''
    }
    return proc.cwd() + '/public'
  }

  private joinPath(dir: string, file: string): string {
    if (!dir) return file
    return dir.endsWith('/') ? dir + file : dir + '/' + file
  }
}
