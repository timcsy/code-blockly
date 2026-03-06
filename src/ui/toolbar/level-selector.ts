import type { CognitiveLevel } from '../../core/types'

/**
 * Level selector: L0/L1/L2 segmented control in the toolbar.
 */
export class LevelSelector {
  private container: HTMLElement
  private buttons: HTMLButtonElement[] = []
  private currentLevel: CognitiveLevel = 1
  private onChangeCallback: ((level: CognitiveLevel) => void) | null = null

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div')
    this.container.className = 'level-selector'

    const levels: { label: string; value: CognitiveLevel }[] = [
      { label: 'L0', value: 0 },
      { label: 'L1', value: 1 },
      { label: 'L2', value: 2 },
    ]

    for (const { label, value } of levels) {
      const btn = document.createElement('button')
      btn.textContent = label
      btn.className = 'level-btn'
      btn.dataset.level = String(value)
      btn.title = this.getLevelTooltip(value)
      btn.addEventListener('click', () => this.setLevel(value))
      this.container.appendChild(btn)
      this.buttons.push(btn)
    }

    parent.appendChild(this.container)
    this.updateActive()
  }

  onChange(callback: (level: CognitiveLevel) => void): void {
    this.onChangeCallback = callback
  }

  getLevel(): CognitiveLevel {
    return this.currentLevel
  }

  setLevel(level: CognitiveLevel): void {
    if (this.currentLevel === level) return
    this.currentLevel = level
    this.updateActive()
    this.onChangeCallback?.(level)
  }

  private updateActive(): void {
    for (const btn of this.buttons) {
      const btnLevel = Number(btn.dataset.level)
      btn.classList.toggle('active', btnLevel === this.currentLevel)
    }
  }

  private getLevelTooltip(level: CognitiveLevel): string {
    switch (level) {
      case 0: return '初學 — 基本變數、運算、if/while、輸出入'
      case 1: return '進階 — 邏輯運算、函式、for 迴圈'
      case 2: return '完整 — 陣列、原始碼、預處理器'
    }
  }

  getElement(): HTMLElement {
    return this.container
  }
}
