import type * as monaco from 'monaco-editor'

type KeyDef = string | { label: string; action: string; wide?: number }

// Termux-style shortcut row: Tab, Ctrl, common symbols, arrows
const SHORTCUT_ROW: KeyDef[] = [
  { label: '▼', action: 'collapse' },
  { label: 'Esc', action: 'esc' },
  { label: 'Tab', action: 'tab' },
  { label: 'Ctrl', action: 'ctrl' },
  { label: '/', action: 'type-/' },
  { label: '-', action: 'type--' },
  { label: '_', action: 'type-_' },
  { label: '↑', action: 'up' },
  { label: '↓', action: 'down' },
  { label: '←', action: 'left' },
  { label: '→', action: 'right' },
]

const ALPHA_ROWS: KeyDef[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  [{ label: '⇧', action: 'shift', wide: 1.4 }, 'z', 'x', 'c', 'v', 'b', 'n', 'm', { label: '⌫', action: 'backspace', wide: 1.4 }],
  [{ label: '123', action: 'layer-sym', wide: 1.3 }, { label: '中', action: 'native-ime', wide: 1 }, { label: '␣', action: 'space', wide: 4 }, { label: '.', action: 'type-.' }, { label: '↵', action: 'enter', wide: 1.3 }],
]

const SYM_ROWS: KeyDef[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '=', '[', ']', '{', '}', '(', ')', '<', '>'],
  [{ label: '#+=', action: 'layer-extra', wide: 1.4 }, ';', ':', "'", '"', ',', '.', '/', { label: '⌫', action: 'backspace', wide: 1.4 }],
  [{ label: 'ABC', action: 'layer-alpha', wide: 1.3 }, { label: '中', action: 'native-ime', wide: 1 }, { label: '␣', action: 'space', wide: 4 }, { label: '.', action: 'type-.' }, { label: '↵', action: 'enter', wide: 1.3 }],
]

const EXTRA_ROWS: KeyDef[][] = [
  ['!', '@', '#', '$', '%', '^', '&', '*', '~', '`'],
  ['\\', '|', '?', '+', '_', '\t'],
  [{ label: '123', action: 'layer-sym', wide: 1.4 }, { label: '⇧', action: 'shift', wide: 1 }, { label: '␣', action: 'space', wide: 3 }, { label: '⌫', action: 'backspace', wide: 1.4 }],
  [{ label: 'ABC', action: 'layer-alpha', wide: 1.3 }, { label: '中', action: 'native-ime', wide: 1 }, { label: '←', action: 'left' }, { label: '→', action: 'right' }, { label: '↵', action: 'enter', wide: 1.3 }],
]

type Layer = 'alpha' | 'sym' | 'extra'

/** Target mode: either Monaco editor or a plain input element */
interface InputTarget {
  input: HTMLInputElement
  onSubmit: (value: string) => void
}

export class CodeKeyboard {
  private container: HTMLElement
  private editor: monaco.editor.IStandaloneCodeEditor | null = null
  private inputTarget: InputTarget | null = null
  private layer: Layer = 'alpha'
  private shifted = false
  private ctrlActive = false
  private backspaceTimer: ReturnType<typeof setInterval> | null = null
  private onNativeIMECallback: (() => void) | null = null
  private onCollapseCallback: (() => void) | null = null

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div')
    this.container.className = 'code-keyboard'
    this.container.style.display = 'none'
    parent.appendChild(this.container)
    this.render()
  }

  setEditor(editor: monaco.editor.IStandaloneCodeEditor): void {
    this.editor = editor
  }

  /** Attach a plain input element as the keyboard target (e.g. console input) */
  attachInput(input: HTMLInputElement, onSubmit: (value: string) => void): void {
    this.inputTarget = { input, onSubmit }
  }

  /** Detach the plain input target, reverting to Monaco editor */
  detachInput(): void {
    this.inputTarget = null
  }

  onNativeIME(callback: () => void): void {
    this.onNativeIMECallback = callback
  }

  onCollapse(callback: () => void): void {
    this.onCollapseCallback = callback
  }

  show(): void {
    this.container.style.display = ''
    // Suppress native keyboard by blurring any focused input
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    // Update CSS variable for toast positioning after layout
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty(
        '--kb-height', `${this.container.offsetHeight}px`,
      )
    })
  }

  hide(): void {
    this.container.style.display = 'none'
    this.stopBackspaceRepeat()
    document.documentElement.style.setProperty('--kb-height', '0px')
  }

  isVisible(): boolean {
    return this.container.style.display !== 'none'
  }

  getElement(): HTMLElement {
    return this.container
  }

  private get isInputMode(): boolean {
    return this.inputTarget !== null
  }

  private render(): void {
    this.container.innerHTML = ''

    // Termux-style shortcut row (always visible)
    const shortcutEl = document.createElement('div')
    shortcutEl.className = 'code-kb-row code-kb-shortcuts'
    for (const key of SHORTCUT_ROW) {
      const btn = document.createElement('button')
      btn.className = 'code-kb-key code-kb-shortcut-key'
      const isObj = typeof key === 'object'
      const label = isObj ? key.label : key
      const action = isObj ? key.action : 'type'
      btn.textContent = label
      if (action === 'ctrl' && this.ctrlActive) btn.classList.add('code-kb-active')
      if (action === 'shift' && this.shifted) btn.classList.add('code-kb-active')
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        this.handleKey(action, isObj ? undefined : key)
      })
      shortcutEl.appendChild(btn)
    }
    this.container.appendChild(shortcutEl)

    // Main keyboard rows
    const rows = this.layer === 'alpha' ? ALPHA_ROWS : this.layer === 'sym' ? SYM_ROWS : EXTRA_ROWS
    for (const row of rows) {
      const rowEl = document.createElement('div')
      rowEl.className = 'code-kb-row'

      for (const key of row) {
        const btn = document.createElement('button')
        btn.className = 'code-kb-key'

        const isObj = typeof key === 'object'
        const label = isObj ? key.label : (this.shifted ? key.toUpperCase() : key)
        const action = isObj ? key.action : 'type'
        const wide = isObj ? key.wide : undefined

        btn.textContent = label === '\t' ? 'Tab' : label
        if (wide) btn.style.flex = `${wide}`
        if (action === 'shift' && this.shifted) btn.classList.add('code-kb-active')

        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          this.handleKey(action, isObj ? undefined : key)
          if (action === 'backspace') {
            this.startBackspaceRepeat()
          }
        })
        btn.addEventListener('pointerup', () => this.stopBackspaceRepeat())
        btn.addEventListener('pointerleave', () => this.stopBackspaceRepeat())

        rowEl.appendChild(btn)
      }

      this.container.appendChild(rowEl)
    }
  }

  private handleKey(action: string, char?: string): void {
    if (action === 'collapse') {
      this.hide()
      this.onCollapseCallback?.()
      return
    }
    // Route to input mode or editor mode
    if (this.isInputMode) {
      this.handleInputKey(action, char)
    } else {
      this.handleEditorKey(action, char)
    }
  }

  // ─── Plain input mode (console) ───

  private handleInputKey(action: string, char?: string): void {
    const target = this.inputTarget
    if (!target) return
    const input = target.input

    // Ctrl combos for input
    if (this.ctrlActive && action === 'type' && char) {
      const key = char.toLowerCase()
      if (key === 'c') { input.selectionStart = input.selectionEnd = input.value.length }
      else if (key === 'a') { input.select() }
      this.ctrlActive = false
      this.render()
      return
    }

    // type-X shortcut actions
    if (action.startsWith('type-')) {
      this.insertAtCursor(input, action.slice(5))
      return
    }

    switch (action) {
      case 'type': {
        const text = this.shifted && char ? char.toUpperCase() : (char ?? '')
        if (char === '\t') {
          this.insertAtCursor(input, '\t')
        } else {
          this.insertAtCursor(input, text)
        }
        if (this.shifted) { this.shifted = false; this.render() }
        break
      }
      case 'backspace': {
        const start = input.selectionStart ?? input.value.length
        const end = input.selectionEnd ?? start
        if (start !== end) {
          input.value = input.value.slice(0, start) + input.value.slice(end)
          input.selectionStart = input.selectionEnd = start
        } else if (start > 0) {
          input.value = input.value.slice(0, start - 1) + input.value.slice(start)
          input.selectionStart = input.selectionEnd = start - 1
        }
        break
      }
      case 'enter':
        target.onSubmit(input.value)
        break
      case 'space':
        this.insertAtCursor(input, ' ')
        break
      case 'tab':
        this.insertAtCursor(input, '\t')
        break
      case 'left': {
        const pos = input.selectionStart ?? 0
        if (this.shifted) {
          input.selectionStart = Math.max(0, pos - 1)
        } else {
          input.selectionStart = input.selectionEnd = Math.max(0, pos - 1)
        }
        break
      }
      case 'right': {
        const pos = input.selectionEnd ?? input.value.length
        if (this.shifted) {
          input.selectionEnd = Math.min(input.value.length, pos + 1)
        } else {
          input.selectionStart = input.selectionEnd = Math.min(input.value.length, pos + 1)
        }
        break
      }
      case 'up':
      case 'down':
      case 'esc':
        // No-op for plain input
        break
      case 'shift':
        this.shifted = !this.shifted
        this.render()
        break
      case 'ctrl':
        this.ctrlActive = !this.ctrlActive
        this.render()
        break
      case 'layer-alpha': this.layer = 'alpha'; this.render(); break
      case 'layer-sym': this.layer = 'sym'; this.render(); break
      case 'layer-extra': this.layer = 'extra'; this.render(); break
      case 'native-ime':
        this.onNativeIMECallback?.()
        break
    }
  }

  private insertAtCursor(input: HTMLInputElement, text: string): void {
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    input.value = input.value.slice(0, start) + text + input.value.slice(end)
    const newPos = start + text.length
    input.selectionStart = input.selectionEnd = newPos
  }

  // ─── Monaco editor mode ───

  private handleEditorKey(action: string, char?: string): void {
    if (!this.editor) return

    // Ctrl combos
    if (this.ctrlActive && action === 'type' && char) {
      this.handleCtrlCombo(char)
      this.ctrlActive = false
      this.render()
      return
    }

    // type-X shortcut actions
    if (action.startsWith('type-')) {
      this.editor.trigger('keyboard', 'type', { text: action.slice(5) })
      return
    }

    switch (action) {
      case 'type': {
        const text = this.shifted && char ? char.toUpperCase() : (char ?? '')
        if (char === '\t') {
          if (this.shifted) {
            this.editor.trigger('keyboard', 'outdent', null)
          } else {
            this.editor.trigger('keyboard', 'tab', null)
          }
        } else {
          this.editor.trigger('keyboard', 'type', { text })
        }
        if (this.shifted) { this.shifted = false; this.render() }
        break
      }
      case 'backspace':
        this.editor.trigger('code-keyboard', 'deleteLeft', null)
        break
      case 'enter':
        this.editor.trigger('keyboard', 'type', { text: '\n' })
        break
      case 'space':
        this.editor.trigger('keyboard', 'type', { text: ' ' })
        break
      case 'tab':
        if (this.shifted) {
          this.editor.trigger('keyboard', 'outdent', null)
          this.shifted = false
          this.render()
        } else {
          this.editor.trigger('keyboard', 'tab', null)
        }
        break
      case 'esc':
        this.editor.trigger('code-keyboard', 'closeFindWidget', null)
        break
      case 'left':
        this.editor.trigger('code-keyboard', this.shifted ? 'cursorLeftSelect' : 'cursorLeft', null)
        break
      case 'right':
        this.editor.trigger('code-keyboard', this.shifted ? 'cursorRightSelect' : 'cursorRight', null)
        break
      case 'up':
        this.editor.trigger('code-keyboard', this.shifted ? 'cursorUpSelect' : 'cursorUp', null)
        break
      case 'down':
        this.editor.trigger('code-keyboard', this.shifted ? 'cursorDownSelect' : 'cursorDown', null)
        break
      case 'shift':
        this.shifted = !this.shifted
        this.render()
        break
      case 'ctrl':
        this.ctrlActive = !this.ctrlActive
        this.render()
        break
      case 'layer-alpha': this.layer = 'alpha'; this.render(); break
      case 'layer-sym': this.layer = 'sym'; this.render(); break
      case 'layer-extra': this.layer = 'extra'; this.render(); break
      case 'native-ime':
        this.onNativeIMECallback?.()
        break
    }
  }

  private handleCtrlCombo(char: string): void {
    if (!this.editor) return
    const key = char.toLowerCase()
    switch (key) {
      case 'z': this.editor.trigger('code-keyboard', 'undo', null); break
      case 'y': this.editor.trigger('code-keyboard', 'redo', null); break
      case 'a': this.editor.trigger('code-keyboard', 'editor.action.selectAll', null); break
      case 'c': document.execCommand('copy'); break
      case 'v': document.execCommand('paste'); break
      case 'x': document.execCommand('cut'); break
      case 'd': this.editor.trigger('code-keyboard', 'editor.action.copyLinesDownAction', null); break
      case '/': this.editor.trigger('code-keyboard', 'editor.action.commentLine', null); break
      case 'f': this.editor.trigger('code-keyboard', 'actions.find', null); break
    }
  }

  private startBackspaceRepeat(): void {
    this.stopBackspaceRepeat()
    this.backspaceTimer = setInterval(() => {
      if (this.isInputMode) {
        this.handleInputKey('backspace')
      } else {
        this.editor?.trigger('code-keyboard', 'deleteLeft', null)
      }
    }, 80)
  }

  private stopBackspaceRepeat(): void {
    if (this.backspaceTimer) {
      clearInterval(this.backspaceTimer)
      this.backspaceTimer = null
    }
  }
}
