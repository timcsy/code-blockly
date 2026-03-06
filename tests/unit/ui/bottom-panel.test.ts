import { describe, it, expect, beforeEach } from 'vitest'
import { BottomPanel } from '../../../src/ui/layout/bottom-panel'

describe('BottomPanel', () => {
  let container: HTMLElement
  let panel: BottomPanel

  beforeEach(() => {
    container = document.createElement('div')
    panel = new BottomPanel(container)
  })

  it('should create panel structure', () => {
    expect(container.querySelector('.bottom-panel-divider')).toBeTruthy()
    expect(container.querySelector('.bottom-panel-tabs')).toBeTruthy()
    expect(container.querySelector('.bottom-panel-content')).toBeTruthy()
  })

  it('should add tabs', () => {
    const p1 = document.createElement('div')
    const p2 = document.createElement('div')
    panel.addTab({ id: 'tab1', label: 'Tab 1', panel: p1 })
    panel.addTab({ id: 'tab2', label: 'Tab 2', panel: p2 })
    const buttons = container.querySelectorAll('.bottom-tab-btn')
    expect(buttons.length).toBe(2)
  })

  it('should activate first tab by default', () => {
    const p1 = document.createElement('div')
    panel.addTab({ id: 'tab1', label: 'Tab 1', panel: p1 })
    expect(panel.getActiveTabId()).toBe('tab1')
  })

  it('should switch active tab', () => {
    const p1 = document.createElement('div')
    const p2 = document.createElement('div')
    panel.addTab({ id: 'tab1', label: 'Tab 1', panel: p1 })
    panel.addTab({ id: 'tab2', label: 'Tab 2', panel: p2 })
    panel.activateTab('tab2')
    expect(panel.getActiveTabId()).toBe('tab2')
    expect(p1.style.display).toBe('none')
    expect(p2.style.display).toBe('')
  })

  it('should collapse and expand', () => {
    panel.collapse()
    expect(panel.isCollapsed()).toBe(true)
    panel.expand()
    expect(panel.isCollapsed()).toBe(false)
  })

  it('should expand when activating a tab while collapsed', () => {
    const p1 = document.createElement('div')
    panel.addTab({ id: 'tab1', label: 'Tab 1', panel: p1 })
    panel.collapse()
    expect(panel.isCollapsed()).toBe(true)
    panel.activateTab('tab1')
    expect(panel.isCollapsed()).toBe(false)
  })
})
