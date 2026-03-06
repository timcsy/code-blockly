import type { Declaration, ScopeFrame } from '../types'

/**
 * LiftContext tracks scope, declarations, and context info during AST → SemanticNode lifting.
 * Supports variable shadowing via scope stack and provides type lookup for disambiguation.
 */
export class LiftContextData {
  private scopeStack: ScopeFrame[] = [{ level: 0, declarations: [] }]
  private usingDirectives: string[] = []
  private includes: string[] = []
  private macroDefinitions: string[] = []

  /** Push a new scope frame (entering a block, function, etc.) */
  pushScope(): void {
    const level = this.scopeStack.length
    this.scopeStack.push({ level, declarations: [] })
  }

  /** Pop the current scope frame */
  popScope(): void {
    if (this.scopeStack.length > 1) {
      this.scopeStack.pop()
    }
  }

  /** Get current scope depth */
  getScopeDepth(): number {
    return this.scopeStack.length - 1
  }

  /** Declare a variable in the current scope */
  declare(name: string, type: string): void {
    const frame = this.scopeStack[this.scopeStack.length - 1]
    frame.declarations.push({ name, type, scope: frame.level })
  }

  /** Look up a variable by name, respecting shadowing (innermost scope first) */
  lookup(name: string): Declaration | null {
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      const frame = this.scopeStack[i]
      const decl = frame.declarations.find(d => d.name === name)
      if (decl) return decl
    }
    return null
  }

  /** Get all visible declarations (for var_ref dropdown, etc.) */
  getVisibleDeclarations(): Declaration[] {
    const seen = new Set<string>()
    const result: Declaration[] = []
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      for (const decl of this.scopeStack[i].declarations) {
        if (!seen.has(decl.name)) {
          seen.add(decl.name)
          result.push(decl)
        }
      }
    }
    return result
  }

  /** Add a using directive (e.g., "using namespace std") */
  addUsingDirective(directive: string): void {
    if (!this.usingDirectives.includes(directive)) {
      this.usingDirectives.push(directive)
    }
  }

  /** Add an include (e.g., "#include <iostream>") */
  addInclude(header: string): void {
    if (!this.includes.includes(header)) {
      this.includes.push(header)
    }
  }

  /** Add a macro definition (e.g., "#define MAX 100") */
  addMacroDefinition(macro: string): void {
    if (!this.macroDefinitions.includes(macro)) {
      this.macroDefinitions.push(macro)
    }
  }

  getUsingDirectives(): string[] {
    return [...this.usingDirectives]
  }

  getIncludes(): string[] {
    return [...this.includes]
  }

  getMacroDefinitions(): string[] {
    return [...this.macroDefinitions]
  }

  /** Check if a name resolves to a known type */
  isKnownType(name: string): boolean {
    return this.lookup(name) !== null
  }

  /** Get the type of a declared variable */
  getType(name: string): string | null {
    const decl = this.lookup(name)
    return decl?.type ?? null
  }
}
