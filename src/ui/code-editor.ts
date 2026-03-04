import { EditorView, basicSetup } from 'codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { EditorState, type Extension, StateEffect, StateField, type Range, RangeSet } from '@codemirror/state'
import { Decoration, type DecorationSet, type ViewUpdate, gutter, GutterMarker } from '@codemirror/view'

// Effect to set or clear highlight
const setHighlight = StateEffect.define<{ from: number; to: number } | null>()

// Decoration style for highlighted lines
const highlightMark = Decoration.line({ class: 'cm-highlighted-line' })

// StateField to manage highlight decorations
const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(highlights, tr) {
    for (const e of tr.effects) {
      if (e.is(setHighlight)) {
        if (e.value === null) return Decoration.none
        const { from, to } = e.value
        const doc = tr.state.doc
        const decorations: Range<Decoration>[] = []
        for (let pos = from; pos <= to && pos <= doc.lines; pos++) {
          const line = doc.line(pos)
          decorations.push(highlightMark.range(line.from))
        }
        return Decoration.set(decorations)
      }
    }
    return highlights.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})

// --- Breakpoint support ---

const toggleBreakpoint = StateEffect.define<{ pos: number; on: boolean }>()

class BreakpointMarker extends GutterMarker {
  toDOM() {
    const el = document.createElement('div')
    el.className = 'cm-breakpoint-marker'
    el.textContent = '\u25CF'
    return el
  }
}

const breakpointMarker = new BreakpointMarker()

const breakpointState = StateField.define<RangeSet<GutterMarker>>({
  create() { return RangeSet.empty },
  update(set, tr) {
    set = set.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(toggleBreakpoint)) {
        if (e.value.on) {
          set = set.update({ add: [breakpointMarker.range(e.value.pos)] })
        } else {
          set = set.update({ filter: (from) => from !== e.value.pos })
        }
      }
    }
    return set
  },
})

export class CodeEditor {
  private view: EditorView | null = null
  private container: HTMLElement
  private onChangeCallback: ((code: string) => void) | null = null
  private onCursorChangeCallback: ((line: number) => void) | null = null
  private suppressChange = false
  private extensions: Extension[] = []
  private breakpoints = new Set<number>() // 0-based line numbers

  constructor(container: HTMLElement) {
    this.container = container
  }

  init(): void {
    const self = this

    const bpGutter = gutter({
      class: 'cm-breakpoint-gutter',
      markers: v => v.state.field(breakpointState),
      initialSpacer: () => breakpointMarker,
      domEventHandlers: {
        mousedown(view, line) {
          const lineNum = view.state.doc.lineAt(line.from).number - 1 // 0-based
          const bps = view.state.field(breakpointState)
          let has = false
          bps.between(line.from, line.from, () => { has = true })
          view.dispatch({
            effects: toggleBreakpoint.of({ pos: line.from, on: !has }),
          })
          if (has) {
            self.breakpoints.delete(lineNum)
          } else {
            self.breakpoints.add(lineNum)
          }
          return true
        },
      },
    })

    this.extensions = [
      breakpointState,
      bpGutter,
      basicSetup,
      cpp(),
      highlightField,
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && !this.suppressChange && this.onChangeCallback) {
          this.onChangeCallback(update.state.doc.toString())
        }
        if (update.selectionSet && this.onCursorChangeCallback) {
          const pos = update.state.selection.main.head
          const line = update.state.doc.lineAt(pos).number - 1 // 0-based
          this.onCursorChangeCallback(line)
        }
      }),
    ]

    const state = EditorState.create({
      doc: '',
      extensions: this.extensions,
    })

    this.view = new EditorView({
      state,
      parent: this.container,
    })
  }

  onChange(callback: (code: string) => void): void {
    this.onChangeCallback = callback
  }

  onCursorChange(callback: (line: number) => void): void {
    this.onCursorChangeCallback = callback
  }

  getCode(): string {
    return this.view?.state.doc.toString() ?? ''
  }

  setCode(code: string): void {
    if (!this.view) return
    this.suppressChange = true
    this.view.setState(EditorState.create({
      doc: code,
      extensions: this.extensions,
    }))
    this.reapplyBreakpoints()
    this.suppressChange = false
  }

  /** Highlight lines (0-based startLine to endLine) */
  addHighlight(startLine: number, endLine: number): void {
    if (!this.view) return
    // Convert 0-based to 1-based for CodeMirror
    this.view.dispatch({
      effects: setHighlight.of({ from: startLine + 1, to: endLine + 1 }),
    })
  }

  /** Clear all highlights */
  clearHighlight(): void {
    if (!this.view) return
    this.view.dispatch({
      effects: setHighlight.of(null),
    })
  }

  /** Get all breakpoint lines (0-based) */
  getBreakpoints(): Set<number> {
    return this.breakpoints
  }

  /** Check if a line has a breakpoint (0-based) */
  hasBreakpoint(line: number): boolean {
    return this.breakpoints.has(line)
  }

  private reapplyBreakpoints(): void {
    if (!this.view) return
    const effects: StateEffect<{ pos: number; on: boolean }>[] = []
    for (const line of this.breakpoints) {
      const cmLine = line + 1 // 1-based
      if (cmLine <= this.view.state.doc.lines) {
        const lineObj = this.view.state.doc.line(cmLine)
        effects.push(toggleBreakpoint.of({ pos: lineObj.from, on: true }))
      }
    }
    if (effects.length > 0) {
      this.view.dispatch({ effects })
    }
  }

  dispose(): void {
    if (this.view) {
      this.view.destroy()
      this.view = null
    }
  }
}
