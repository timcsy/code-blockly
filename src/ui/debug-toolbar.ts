/**
 * VSCode-style floating debug toolbar.
 * Shows during execution with Continue/Pause, Step, Step Out, Accelerate, Stop controls.
 */
export type DebugAction = 'continue' | 'pause' | 'step' | 'step-out' | 'accelerate' | 'stop'
export type DebugMode = 'running' | 'paused' | 'stepping'

export class DebugToolbar {
  private el: HTMLElement
  private continueBtn: HTMLButtonElement
  private pauseBtn: HTMLButtonElement
  private stepBtn: HTMLButtonElement
  private stepOutBtn: HTMLButtonElement
  private accelerateBtn: HTMLButtonElement
  private accelerateLevelInput: HTMLInputElement
  private accelerateLevel = 1
  private autoScrollBtn: HTMLButtonElement
  private autoScroll = false
  private stopBtn: HTMLButtonElement
  private handler: ((action: DebugAction) => void) | null = null
  private mode: DebugMode = 'running'

  // Drag state
  private dragging = false
  private dragOffsetX = 0
  private customLeft: number | null = null

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'debug-toolbar'
    this.el.style.display = 'none'

    // Drag handle
    const handle = document.createElement('div')
    handle.className = 'debug-toolbar-handle'
    handle.addEventListener('mousedown', (e) => this.onDragStart(e))
    this.el.appendChild(handle)

    // Continue (▶) — visible when paused
    this.continueBtn = this.createButton('debug-continue', '▶', 'Continue (F5)')
    this.continueBtn.addEventListener('click', () => this.handler?.('continue'))
    this.el.appendChild(this.continueBtn)

    // Pause (⏸) — visible when running
    this.pauseBtn = this.createButton('debug-pause', '⏸', 'Pause (F6)')
    this.pauseBtn.addEventListener('click', () => this.handler?.('pause'))
    this.el.appendChild(this.pauseBtn)

    this.el.appendChild(this.createSeparator())

    // Step (→) — visible when paused/stepping
    this.stepBtn = this.createButton('debug-step', '→', 'Step (F10)')
    this.stepBtn.addEventListener('click', () => this.handler?.('step'))
    this.el.appendChild(this.stepBtn)

    // Step Out (⤴) — visible when paused/stepping
    this.stepOutBtn = this.createButton('debug-step-out', '⤴', 'Step Out (Shift+F10)')
    this.stepOutBtn.addEventListener('click', () => this.handler?.('step-out'))
    this.el.appendChild(this.stepOutBtn)

    // Accelerate (⏩) — always visible, fast-forwards past current block
    this.accelerateBtn = this.createButton('debug-accelerate', '⏩', 'Accelerate (F11)')
    this.accelerateBtn.addEventListener('click', () => this.handler?.('accelerate'))
    this.el.appendChild(this.accelerateBtn)

    // Accelerate level input (number of loop levels to skip)
    this.accelerateLevelInput = document.createElement('input')
    this.accelerateLevelInput.type = 'number'
    this.accelerateLevelInput.className = 'debug-accelerate-level'
    this.accelerateLevelInput.min = '1'
    this.accelerateLevelInput.value = '1'
    this.accelerateLevelInput.title = 'Skip levels'
    this.accelerateLevelInput.addEventListener('input', () => {
      const v = parseInt(this.accelerateLevelInput.value, 10)
      this.accelerateLevel = (isNaN(v) || v < 1) ? 1 : v
    })
    this.el.appendChild(this.accelerateLevelInput)

    this.el.appendChild(this.createSeparator())

    // Auto-scroll toggle — syncs block and code view to center
    this.autoScrollBtn = this.createButton('debug-auto-scroll', '📌', 'Auto-scroll (sync view)')
    this.autoScrollBtn.addEventListener('click', () => {
      this.autoScroll = !this.autoScroll
      this.autoScrollBtn.classList.toggle('active', this.autoScroll)
    })
    this.el.appendChild(this.autoScrollBtn)

    this.el.appendChild(this.createSeparator())

    // Stop (■) — always visible
    this.stopBtn = this.createButton('debug-stop', '■', 'Stop (Shift+F5)')
    this.stopBtn.addEventListener('click', () => this.handler?.('stop'))
    this.el.appendChild(this.stopBtn)

    document.body.appendChild(this.el)

    // Drag move/end on document
    document.addEventListener('mousemove', (e) => this.onDragMove(e))
    document.addEventListener('mouseup', () => this.onDragEnd())

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.onKeyDown(e))
  }

  onAction(handler: (action: DebugAction) => void): void {
    this.handler = handler
  }

  show(mode: DebugMode): void {
    this.mode = mode
    this.updateButtons()
    this.el.style.display = 'flex'
    // Reset position to center if not custom-dragged
    if (this.customLeft === null) {
      this.el.style.left = '50%'
      this.el.style.transform = 'translateX(-50%)'
    }
  }

  hide(): void {
    this.el.style.display = 'none'
  }

  setMode(mode: DebugMode): void {
    this.mode = mode
    this.updateButtons()
  }

  getAccelerateLevel(): number {
    return this.accelerateLevel
  }

  isAutoScrollEnabled(): boolean {
    return this.autoScroll
  }

  isVisible(): boolean {
    return this.el.style.display !== 'none'
  }

  private updateButtons(): void {
    // Continue visible when paused/stepping, Pause visible when running
    this.continueBtn.style.display = this.mode === 'running' ? 'none' : 'flex'
    this.pauseBtn.style.display = this.mode === 'running' ? 'flex' : 'none'
    // Step and Step Out only available when paused/stepping
    this.stepBtn.style.display = this.mode === 'running' ? 'none' : 'flex'
    this.stepOutBtn.style.display = this.mode === 'running' ? 'none' : 'flex'
    // Accelerate always visible (usable during animation and paused)
  }

  private createButton(className: string, icon: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = className
    btn.textContent = icon
    btn.title = title
    return btn
  }

  private createSeparator(): HTMLElement {
    const sep = document.createElement('div')
    sep.className = 'debug-separator'
    return sep
  }

  // --- Drag ---

  private onDragStart(e: MouseEvent): void {
    this.dragging = true
    const rect = this.el.getBoundingClientRect()
    this.dragOffsetX = e.clientX - rect.left
    e.preventDefault()
  }

  private onDragMove(e: MouseEvent): void {
    if (!this.dragging) return
    const x = e.clientX - this.dragOffsetX
    this.el.style.left = `${x}px`
    this.el.style.transform = 'none'
    this.customLeft = x
  }

  private onDragEnd(): void {
    this.dragging = false
  }

  // --- Keyboard shortcuts ---

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.isVisible()) return
    // Don't capture if user is typing in an input/textarea
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return

    switch (e.key) {
      case 'F5':
        if (e.shiftKey) {
          e.preventDefault()
          this.handler?.('stop')
        } else {
          e.preventDefault()
          if (this.mode !== 'running') {
            this.handler?.('continue')
          }
        }
        break
      case 'F6':
        e.preventDefault()
        if (this.mode === 'running') {
          this.handler?.('pause')
        }
        break
      case 'F10':
        e.preventDefault()
        if (this.mode !== 'running') {
          if (e.shiftKey) {
            this.handler?.('step-out')
          } else {
            this.handler?.('step')
          }
        }
        break
      case 'F11':
        e.preventDefault()
        this.handler?.('accelerate')
        break
    }
  }

  dispose(): void {
    this.el.remove()
  }
}
