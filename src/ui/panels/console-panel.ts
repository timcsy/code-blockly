export class ConsolePanel {
  private container: HTMLElement
  private outputEl: HTMLElement
  private lines: string[] = []

  constructor(container: HTMLElement) {
    this.container = container
    this.container.classList.add('console-panel')

    const header = document.createElement('div')
    header.className = 'panel-header'
    header.innerHTML = `
      <span class="panel-title">Console</span>
      <button class="panel-clear-btn" title="清空">✕</button>
    `
    this.container.appendChild(header)

    this.outputEl = document.createElement('div')
    this.outputEl.className = 'console-output'
    this.container.appendChild(this.outputEl)

    header.querySelector('.panel-clear-btn')?.addEventListener('click', () => this.clear())
  }

  log(text: string): void {
    this.lines.push(text)
    const line = document.createElement('div')
    line.className = 'console-line'
    line.textContent = text
    this.outputEl.appendChild(line)
    this.outputEl.scrollTop = this.outputEl.scrollHeight
  }

  error(text: string): void {
    this.lines.push(`[ERROR] ${text}`)
    const line = document.createElement('div')
    line.className = 'console-line console-error'
    line.textContent = text
    this.outputEl.appendChild(line)
    this.outputEl.scrollTop = this.outputEl.scrollHeight
  }

  clear(): void {
    this.lines = []
    this.outputEl.innerHTML = ''
  }

  getLines(): string[] {
    return [...this.lines]
  }

  getElement(): HTMLElement {
    return this.container
  }
}
