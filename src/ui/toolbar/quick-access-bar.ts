import type { CognitiveLevel } from '../../core/types'
import { isBlockAvailable } from '../../core/cognitive-levels'
import * as Blockly from 'blockly'

export interface QuickAccessItem {
  blockType: string
  labelKey: string
  tooltipKey: string
}

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  { blockType: 'u_var_declare', labelKey: 'QA_VAR', tooltipKey: 'QA_TOOLTIP_VAR' },
  { blockType: 'u_print', labelKey: 'QA_PRINT', tooltipKey: 'QA_TOOLTIP_PRINT' },
  { blockType: 'u_input', labelKey: 'QA_INPUT', tooltipKey: 'QA_TOOLTIP_INPUT' },
  { blockType: 'u_if', labelKey: 'QA_IF', tooltipKey: 'QA_TOOLTIP_IF' },
  { blockType: 'u_while_loop', labelKey: 'QA_LOOP', tooltipKey: 'QA_TOOLTIP_LOOP' },
  { blockType: 'u_func_def', labelKey: 'QA_FUNC', tooltipKey: 'QA_TOOLTIP_FUNC' },
]

export class QuickAccessBar {
  private container: HTMLElement
  private onCreateBlock: ((blockType: string) => void) | null = null
  private currentLevel: CognitiveLevel = 1

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div')
    this.container.className = 'quick-access-bar'
    parent.appendChild(this.container)
    this.render()
  }

  onBlockCreate(callback: (blockType: string) => void): void {
    this.onCreateBlock = callback
  }

  setLevel(level: CognitiveLevel): void {
    this.currentLevel = level
    this.render()
  }

  private render(): void {
    this.container.innerHTML = ''
    for (const item of QUICK_ACCESS_ITEMS) {
      if (!isBlockAvailable(item.blockType, this.currentLevel)) continue
      const btn = document.createElement('button')
      btn.className = 'qa-btn'
      btn.textContent = Blockly.Msg[item.labelKey] || item.labelKey
      btn.title = Blockly.Msg[item.tooltipKey] || ''
      btn.addEventListener('click', () => {
        this.onCreateBlock?.(item.blockType)
      })
      this.container.appendChild(btn)
    }
  }

  getElement(): HTMLElement {
    return this.container
  }
}
