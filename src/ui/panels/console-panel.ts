export class ConsolePanel {
  private container: HTMLElement
  private outputEl: HTMLElement
  private statusEl: HTMLElement
  private inputRow: HTMLElement | null = null
  private lines: string[] = []
  private inputResolve: ((value: string) => void) | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.container.classList.add('console-panel')

    this.outputEl = document.createElement('div')
    this.outputEl.className = 'console-output'
    this.container.appendChild(this.outputEl)

    this.statusEl = document.createElement('div')
    this.statusEl.className = 'console-status'
    this.container.appendChild(this.statusEl)

  }

  log(text: string): void {
    this.lines.push(text)
    const line = document.createElement('div')
    line.className = 'console-line'
    line.textContent = text
    this.outputEl.appendChild(line)
    this.scrollToBottom()
  }

  error(text: string): void {
    this.lines.push(`[ERROR] ${text}`)
    const line = document.createElement('div')
    line.className = 'console-line console-error'
    line.textContent = text
    this.outputEl.appendChild(line)
    this.scrollToBottom()
  }

  clear(): void {
    this.lines = []
    this.outputEl.innerHTML = ''
    this.setStatus('')
    this.removeInputRow()
  }

  setStatus(text: string, type: '' | 'running' | 'error' | 'completed' = ''): void {
    this.statusEl.textContent = text
    this.statusEl.className = `console-status ${type}`
  }

  promptInput(prompt?: string): Promise<string> {
    return new Promise((resolve) => {
      this.inputResolve = resolve

      if (prompt) {
        this.log(prompt)
      }

      this.removeInputRow()

      this.inputRow = document.createElement('div')
      this.inputRow.className = 'console-input-row'

      const input = document.createElement('input')
      input.className = 'console-input'
      input.type = 'text'
      input.placeholder = '...'

      const btn = document.createElement('button')
      btn.className = 'console-input-btn'
      btn.textContent = '↵'

      const submit = () => {
        const val = input.value
        this.log(`> ${val}`)
        this.removeInputRow()
        if (this.inputResolve) {
          this.inputResolve(val)
          this.inputResolve = null
        }
      }

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit()
      })
      btn.addEventListener('click', submit)

      this.inputRow.appendChild(input)
      this.inputRow.appendChild(btn)
      this.container.insertBefore(this.inputRow, this.statusEl)

      input.focus()
    })
  }

  showOutputUpTo(count: number): void {
    const children = this.outputEl.children
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement
      el.style.display = i < count ? '' : 'none'
    }
  }

  getLines(): string[] {
    return [...this.lines]
  }

  getElement(): HTMLElement {
    return this.container
  }

  private removeInputRow(): void {
    if (this.inputRow) {
      this.inputRow.remove()
      this.inputRow = null
    }
  }

  private scrollToBottom(): void {
    this.outputEl.scrollTop = this.outputEl.scrollHeight
  }
}
