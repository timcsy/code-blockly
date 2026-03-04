import type { ExecutionStatus } from '../interpreter/types'

export class ConsolePanel {
  private element: HTMLElement
  private outputEl: HTMLElement
  private statusEl: HTMLElement

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
  }

  appendOutput(text: string): void {
    this.outputEl.textContent += text
    this.outputEl.scrollTop = this.outputEl.scrollHeight
  }

  clear(): void {
    this.outputEl.textContent = ''
  }

  setStatus(status: ExecutionStatus, errorMsg?: string): void {
    this.statusEl.className = 'console-status'
    switch (status) {
      case 'running':
        this.statusEl.textContent = '⏵ 執行中'
        this.statusEl.classList.add('status-running')
        break
      case 'paused':
        this.statusEl.textContent = '⏸ 已暫停'
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

  getElement(): HTMLElement {
    return this.element
  }
}
