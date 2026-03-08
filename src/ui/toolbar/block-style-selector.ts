import * as Blockly from 'blockly'
import type { BlockStylePreset, BlockStylePresetId } from '../../languages/style'
import { BLOCK_STYLE_PRESETS } from '../../languages/style'

export class BlockStyleSelector {
  private select: HTMLSelectElement
  private onChangeCallback: ((preset: BlockStylePreset) => void) | null = null

  constructor(parent: HTMLElement) {
    this.select = document.createElement('select')
    this.select.className = 'toolbar-select'
    this.select.title = '積木風格'

    for (const preset of Object.values(BLOCK_STYLE_PRESETS)) {
      const option = document.createElement('option')
      option.value = preset.id
      option.textContent = (Blockly.Msg as Record<string, string>)[preset.nameKey] || preset.id
      this.select.appendChild(option)
    }

    this.select.addEventListener('change', () => {
      const id = this.select.value as BlockStylePresetId
      const preset = BLOCK_STYLE_PRESETS[id]
      if (preset) this.onChangeCallback?.(preset)
    })

    parent.appendChild(this.select)
  }

  onChange(callback: (preset: BlockStylePreset) => void): void {
    this.onChangeCallback = callback
  }

  getCurrentPreset(): BlockStylePreset {
    const id = this.select.value as BlockStylePresetId
    return BLOCK_STYLE_PRESETS[id] ?? BLOCK_STYLE_PRESETS.scratch
  }
}
