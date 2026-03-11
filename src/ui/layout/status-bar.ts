import type { StylePreset } from '../../core/types'

export interface StatusBarState {
  language: string
  style: StylePreset
  topicName: string
  syncStatus: 'idle' | 'syncing' | 'error'
  locale: string
}

export class StatusBar {
  private container: HTMLElement
  private state: StatusBarState

  constructor(parent: HTMLElement, initialState: Partial<StatusBarState> = {}) {
    this.container = document.createElement('footer')
    this.container.id = 'status-bar'
    parent.appendChild(this.container)

    this.state = {
      language: initialState.language ?? 'C++',
      style: initialState.style ?? { id: 'apcs', name: { 'zh-TW': 'APCS', en: 'APCS' }, io_style: 'cout', naming_convention: 'camelCase', indent_size: 4, brace_style: 'K&R', namespace_style: 'using', header_style: 'individual' } as StylePreset,
      topicName: initialState.topicName ?? '初學 C++',
      syncStatus: initialState.syncStatus ?? 'idle',
      locale: initialState.locale ?? 'zh-TW',
    }

    this.render()
  }

  update(partial: Partial<StatusBarState>): void {
    Object.assign(this.state, partial)
    this.render()
  }

  showMessage(msg: string, duration = 3000): void {
    const original = this.container.innerHTML
    this.container.innerHTML = `<span class="status-message">${msg}</span>`
    setTimeout(() => { this.container.innerHTML = original }, duration)
  }

  private render(): void {
    const styleName = this.state.style.name['zh-TW'] || this.state.style.id
    const syncIcon = this.state.syncStatus === 'syncing' ? '⟳' :
                     this.state.syncStatus === 'error' ? '⚠' : '✓'

    this.container.innerHTML = `
      <span class="status-item">${this.state.language}</span>
      <span class="status-sep">|</span>
      <span class="status-item">${styleName}</span>
      <span class="status-sep">|</span>
      <span class="status-item">${this.state.topicName}</span>
      <span class="status-sep">|</span>
      <span class="status-item">${this.state.locale}</span>
      <span class="status-spacer"></span>
      <span class="status-item status-sync">${syncIcon} Sync</span>
    `
  }

  getElement(): HTMLElement {
    return this.container
  }
}
