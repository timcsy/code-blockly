import { describe, it, expect, beforeEach } from 'vitest'
import { VariablePanel } from '../../src/ui/variable-panel'
import { Scope } from '../../src/interpreter/scope'
import type { RuntimeValue } from '../../src/interpreter/types'

describe('VariablePanel', () => {
  let container: HTMLElement
  let panel: VariablePanel

  beforeEach(() => {
    container = document.createElement('div')
    panel = new VariablePanel(container)
  })

  it('should create panel element', () => {
    expect(container.querySelector('.variable-panel-header')).toBeTruthy()
    expect(container.querySelector('.variable-table')).toBeTruthy()
  })

  it('should display variables from scope', () => {
    const scope = new Scope()
    scope.declare('x', { type: 'int', value: 42 })
    scope.declare('name', { type: 'string', value: 'hello' })
    panel.update(scope)

    const rows = container.querySelectorAll('.variable-row')
    expect(rows.length).toBe(2)
  })

  it('should show variable name, type, and value', () => {
    const scope = new Scope()
    scope.declare('x', { type: 'int', value: 10 })
    panel.update(scope)

    const cells = container.querySelectorAll('.variable-cell')
    // name, type, value = 3 cells per row
    expect(cells.length).toBe(3)
    expect(cells[0].textContent).toBe('x')
    expect(cells[1].textContent).toBe('int')
    expect(cells[2].textContent).toBe('10')
  })

  it('should detect value changes and add flash class', () => {
    const scope = new Scope()
    scope.declare('x', { type: 'int', value: 1 })
    panel.update(scope)

    // Update with changed value
    scope.set('x', { type: 'int', value: 2 })
    panel.update(scope)

    const rows = container.querySelectorAll('.variable-row')
    expect(rows[0].classList.contains('value-changed')).toBe(true)
  })

  it('should clear all variables', () => {
    const scope = new Scope()
    scope.declare('x', { type: 'int', value: 1 })
    panel.update(scope)
    expect(container.querySelectorAll('.variable-row').length).toBe(1)

    panel.clear()
    expect(container.querySelectorAll('.variable-row').length).toBe(0)
  })

  it('should display parent scope variables', () => {
    const parent = new Scope()
    parent.declare('global', { type: 'int', value: 100 })
    const child = parent.createChild()
    child.declare('local', { type: 'int', value: 5 })
    panel.update(child)

    const rows = container.querySelectorAll('.variable-row')
    expect(rows.length).toBe(2)
  })
})
