import type { CognitiveLevel } from '../../core/types'

/** Definition for a single level option. */
export interface LevelDef {
  label: string
  value: CognitiveLevel
  tooltip: string
}

/** Default C++ level definitions. */
export const DEFAULT_LEVEL_DEFS: LevelDef[] = [
  { label: 'L0', value: 0, tooltip: '初學 — 基本變數、運算、if/while、輸出入' },
  { label: 'L1', value: 1, tooltip: '進階 — 邏輯運算、函式、for 迴圈' },
  { label: 'L2', value: 2, tooltip: '完整 — 陣列、原始碼、預處理器' },
]

/**
 * Level selector: L0/L1/L2 segmented control in the toolbar.
 */
export class LevelSelector {
  private container: HTMLElement
  private buttons: HTMLButtonElement[] = []
  private currentLevel: CognitiveLevel = 1
  private onChangeCallback: ((level: CognitiveLevel) => void) | null = null
  private levelDefs: LevelDef[]

  constructor(parent: HTMLElement, levelDefs: LevelDef[] = DEFAULT_LEVEL_DEFS) {
    this.levelDefs = levelDefs
    this.container = document.createElement('div')
    this.container.className = 'level-selector'

    for (const { label, value, tooltip } of this.levelDefs) {
      const btn = document.createElement('button')
      btn.textContent = label
      btn.className = 'level-btn'
      btn.dataset.level = String(value)
      btn.title = tooltip
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

  getElement(): HTMLElement {
    return this.container
  }
}
