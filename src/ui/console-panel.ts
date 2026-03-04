import type { ExecutionStatus } from '../interpreter/types'

export class ConsolePanel {
  private element: HTMLElement
  private outputEl: HTMLElement
  private statusEl: HTMLElement
  private inputEl: HTMLInputElement
  private inputContainer: HTMLElement
  private stdinTextarea: HTMLTextAreaElement
  private stdinSection: HTMLElement
  private onInputResolve: ((value: string) => void) | null = null

  constructor(container: HTMLElement) {
    this.element = container

    // Header with status
    const header = document.createElement('div')
    header.className = 'console-header'
    this.statusEl = document.createElement('span')
    this.statusEl.className = 'console-status'
    const title = document.createElement('span')
    title.className = 'console-title'
    title.textContent = 'Console'
    header.appendChild(title)
    header.appendChild(this.statusEl)
    this.element.appendChild(header)

    // Output area
    this.outputEl = document.createElement('pre')
    this.outputEl.className = 'console-output'
    this.element.appendChild(this.outputEl)

    // Inline input
    this.inputContainer = document.createElement('div')
    this.inputContainer.className = 'console-input-container'
    this.inputContainer.style.display = 'none'
    const inputLabel = document.createElement('span')
    inputLabel.className = 'console-input-label'
    inputLabel.textContent = '> '
    this.inputEl = document.createElement('input')
    this.inputEl.className = 'console-input'
    this.inputEl.type = 'text'
    this.inputEl.placeholder = '輸入值後按 Enter...'
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.onInputResolve) {
        const val = this.inputEl.value
        this.inputEl.value = ''
        this.inputContainer.style.display = 'none'
        this.appendOutput(val + '\n')
        const resolve = this.onInputResolve
        this.onInputResolve = null
        resolve(val)
      }
    })
    this.inputContainer.appendChild(inputLabel)
    this.inputContainer.appendChild(this.inputEl)
    this.element.appendChild(this.inputContainer)

    // Stdin pre-fill section (collapsible)
    this.stdinSection = document.createElement('div')
    this.stdinSection.className = 'stdin-section'
    const stdinHeader = document.createElement('div')
    stdinHeader.className = 'stdin-header'
    const stdinLabel = document.createElement('span')
    stdinLabel.className = 'stdin-label'
    stdinLabel.textContent = 'Stdin 預填輸入'
    const stdinToggle = document.createElement('span')
    stdinToggle.className = 'stdin-toggle'
    stdinToggle.textContent = '▼'
    stdinHeader.appendChild(stdinLabel)
    stdinHeader.appendChild(stdinToggle)
    this.stdinTextarea = document.createElement('textarea')
    this.stdinTextarea.className = 'stdin-textarea'
    this.stdinTextarea.placeholder = '每行一個輸入值（執行前填入）'
    stdinHeader.addEventListener('click', () => {
      const isHidden = this.stdinTextarea.style.display === 'none'
      this.stdinTextarea.style.display = isHidden ? 'block' : 'none'
      stdinToggle.textContent = isHidden ? '▲' : '▼'
    })
    this.stdinSection.appendChild(stdinHeader)
    this.stdinSection.appendChild(this.stdinTextarea)
    this.element.appendChild(this.stdinSection)
  }

  appendOutput(text: string): void {
    this.outputEl.textContent += text
    this.outputEl.scrollTop = this.outputEl.scrollHeight
  }

  clear(): void {
    this.outputEl.textContent = ''
    this.hideInput()
  }

  setStatus(status: ExecutionStatus, errorMsg?: string): void {
    this.statusEl.className = 'console-status'
    switch (status) {
      case 'running':
        this.statusEl.textContent = '⏵ 執行中'
        this.statusEl.classList.add('status-running')
        break
      case 'paused':
        this.statusEl.textContent = '⏸ 等待輸入'
        this.statusEl.classList.add('status-paused')
        break
      case 'completed':
        this.statusEl.textContent = '✓ 已完成'
        this.statusEl.classList.add('status-completed')
        break
      case 'error':
        this.statusEl.textContent = '✗ ' + (errorMsg || '錯誤')
        this.statusEl.classList.add('status-error')
        break
      default:
        this.statusEl.textContent = ''
        break
    }
  }

  /** Show inline input and return a promise that resolves when user submits */
  promptInput(): Promise<string> {
    return new Promise((resolve) => {
      this.onInputResolve = resolve
      this.inputContainer.style.display = 'flex'
      this.inputEl.focus()
    })
  }

  hideInput(): void {
    this.inputContainer.style.display = 'none'
    this.onInputResolve = null
    this.inputEl.value = ''
  }

  getElement(): HTMLElement {
    return this.element
  }

  getStdinTextarea(): HTMLTextAreaElement {
    return this.stdinTextarea
  }
}
