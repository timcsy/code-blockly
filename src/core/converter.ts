import type { BlockRegistry } from './block-registry'
import type { GeneratorModule, ParserModule } from './types'

export class Converter {
  private generators = new Map<string, GeneratorModule>()
  private parsers = new Map<string, ParserModule>()
  private registry: BlockRegistry

  constructor(registry: BlockRegistry) {
    this.registry = registry
  }

  registerGenerator(generator: GeneratorModule): void {
    this.generators.set(generator.getLanguageId(), generator)
  }

  registerParser(parser: ParserModule): void {
    this.parsers.set(parser.getLanguageId(), parser)
  }

  blocksToCode(workspace: unknown, languageId: string): string {
    const generator = this.generators.get(languageId)
    if (!generator) {
      throw new Error(`No generator registered for language: ${languageId}`)
    }
    return generator.generate(workspace)
  }

  async codeToBlocks(code: string, languageId: string): Promise<unknown> {
    const parser = this.parsers.get(languageId)
    if (!parser) {
      throw new Error(`No parser registered for language: ${languageId}`)
    }
    return parser.parse(code)
  }

  getRegistry(): BlockRegistry {
    return this.registry
  }
}
