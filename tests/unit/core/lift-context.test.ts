import { describe, it, expect, beforeEach } from 'vitest'
import { LiftContextData } from '../../../src/core/lift/lift-context'

describe('LiftContextData', () => {
  let ctx: LiftContextData

  beforeEach(() => {
    ctx = new LiftContextData()
  })

  describe('scope management', () => {
    it('should start at scope depth 0', () => {
      expect(ctx.getScopeDepth()).toBe(0)
    })

    it('should push and pop scopes', () => {
      ctx.pushScope()
      expect(ctx.getScopeDepth()).toBe(1)
      ctx.pushScope()
      expect(ctx.getScopeDepth()).toBe(2)
      ctx.popScope()
      expect(ctx.getScopeDepth()).toBe(1)
      ctx.popScope()
      expect(ctx.getScopeDepth()).toBe(0)
    })

    it('should not pop below depth 0', () => {
      ctx.popScope()
      expect(ctx.getScopeDepth()).toBe(0)
    })
  })

  describe('declarations and lookup', () => {
    it('should declare and look up a variable', () => {
      ctx.declare('x', 'int')
      const decl = ctx.lookup('x')
      expect(decl).not.toBeNull()
      expect(decl!.name).toBe('x')
      expect(decl!.type).toBe('int')
    })

    it('should return null for undeclared variable', () => {
      expect(ctx.lookup('y')).toBeNull()
    })

    it('should support variable shadowing', () => {
      ctx.declare('x', 'int')
      ctx.pushScope()
      ctx.declare('x', 'double')
      const decl = ctx.lookup('x')
      expect(decl!.type).toBe('double')
    })

    it('should unshadow after scope pop', () => {
      ctx.declare('x', 'int')
      ctx.pushScope()
      ctx.declare('x', 'double')
      ctx.popScope()
      const decl = ctx.lookup('x')
      expect(decl!.type).toBe('int')
    })

    it('should look up variables from outer scope', () => {
      ctx.declare('x', 'int')
      ctx.pushScope()
      ctx.declare('y', 'float')
      expect(ctx.lookup('x')!.type).toBe('int')
      expect(ctx.lookup('y')!.type).toBe('float')
    })
  })

  describe('getVisibleDeclarations', () => {
    it('should return all visible declarations with shadowing', () => {
      ctx.declare('a', 'int')
      ctx.declare('b', 'float')
      ctx.pushScope()
      ctx.declare('a', 'double') // shadows outer 'a'
      ctx.declare('c', 'char')

      const visible = ctx.getVisibleDeclarations()
      expect(visible).toHaveLength(3) // a(double), c, b
      const names = visible.map(d => d.name)
      expect(names).toContain('a')
      expect(names).toContain('b')
      expect(names).toContain('c')
      // Should get shadowed version
      const aDecl = visible.find(d => d.name === 'a')
      expect(aDecl!.type).toBe('double')
    })
  })

  describe('type queries', () => {
    it('should report known types', () => {
      ctx.declare('x', 'int')
      expect(ctx.isKnownType('x')).toBe(true)
      expect(ctx.isKnownType('y')).toBe(false)
    })

    it('should return type for declared variable', () => {
      ctx.declare('x', 'int')
      expect(ctx.getType('x')).toBe('int')
      expect(ctx.getType('y')).toBeNull()
    })
  })

  describe('directives and includes', () => {
    it('should track using directives without duplicates', () => {
      ctx.addUsingDirective('std')
      ctx.addUsingDirective('std')
      ctx.addUsingDirective('chrono')
      expect(ctx.getUsingDirectives()).toEqual(['std', 'chrono'])
    })

    it('should track includes without duplicates', () => {
      ctx.addInclude('iostream')
      ctx.addInclude('iostream')
      ctx.addInclude('vector')
      expect(ctx.getIncludes()).toEqual(['iostream', 'vector'])
    })

    it('should track macro definitions', () => {
      ctx.addMacroDefinition('MAX 100')
      ctx.addMacroDefinition('MIN 0')
      expect(ctx.getMacroDefinitions()).toEqual(['MAX 100', 'MIN 0'])
    })
  })
})
