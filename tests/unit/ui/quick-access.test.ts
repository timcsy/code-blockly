import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Blockly before import
vi.mock('blockly', () => ({
  Msg: {
    QA_VAR: 'Variable',
    QA_PRINT: 'Print',
    QA_INPUT: 'Input',
    QA_IF: 'If',
    QA_LOOP: 'Loop',
    QA_FUNC: 'Function',
    QA_TOOLTIP_VAR: 'Add variable',
  },
}))

import { QuickAccessBar } from '../../../src/ui/toolbar/quick-access-bar'

describe('QuickAccessBar', () => {
  let parent: HTMLElement
  let bar: QuickAccessBar

  beforeEach(() => {
    parent = document.createElement('div')
    bar = new QuickAccessBar(parent)
  })

  it('should create bar element', () => {
    expect(parent.querySelector('.quick-access-bar')).toBeTruthy()
  })

  it('should render buttons for default level', () => {
    const buttons = parent.querySelectorAll('.qa-btn')
    // Level 1 (intermediate) should show L0 + L1 blocks
    expect(buttons.length).toBeGreaterThanOrEqual(5)
  })

  it('should filter buttons by level', () => {
    bar.setLevel(0)
    const buttons = parent.querySelectorAll('.qa-btn')
    // L0 should not show Function (L1)
    const labels = Array.from(buttons).map(b => b.textContent)
    expect(labels).not.toContain('Function')
  })

  it('should show all blocks at level 2', () => {
    bar.setLevel(2)
    const buttons = parent.querySelectorAll('.qa-btn')
    expect(buttons.length).toBe(6)
  })

  it('should fire callback on button click', () => {
    const callback = vi.fn()
    bar.onBlockCreate(callback)
    const buttons = parent.querySelectorAll('.qa-btn')
    ;(buttons[0] as HTMLElement).click()
    expect(callback).toHaveBeenCalledWith('u_var_declare')
  })
})
