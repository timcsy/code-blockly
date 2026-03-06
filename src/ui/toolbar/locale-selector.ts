export class LocaleSelector {
  private select: HTMLSelectElement
  private onChangeCallback: ((locale: string) => void) | null = null

  constructor(parent: HTMLElement) {
    this.select = document.createElement('select')
    this.select.className = 'toolbar-select'
    this.select.title = '語言'

    const locales = [
      { id: 'zh-TW', label: '中文' },
      { id: 'en', label: 'English' },
    ]

    for (const loc of locales) {
      const option = document.createElement('option')
      option.value = loc.id
      option.textContent = loc.label
      this.select.appendChild(option)
    }

    this.select.addEventListener('change', () => {
      this.onChangeCallback?.(this.select.value)
    })

    parent.appendChild(this.select)
  }

  onChange(callback: (locale: string) => void): void {
    this.onChangeCallback = callback
  }

  getLocale(): string {
    return this.select.value
  }
}
