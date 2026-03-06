import * as Blockly from 'blockly'
import { BlocklyPanel } from './panels/blockly-panel'
import { MonacoPanel } from './panels/monaco-panel'
import { SplitPane } from './layout/split-pane'
import { SyncController } from './sync-controller'
import type { SyncError } from './sync-controller'
import { registerCppLanguage } from '../languages/cpp/generators'
import { registerCppLifters } from '../languages/cpp/lifters'
import { Lifter } from '../core/lift/lifter'
import { CppParser } from '../languages/cpp/parser'
import { BlockSpecRegistry } from '../core/block-spec-registry'
import { StorageService } from '../core/storage'
import type { SavedState } from '../core/storage'
import { LocaleLoader } from '../i18n/loader'
import { LevelSelector } from './toolbar/level-selector'
import { StyleSelector } from './toolbar/style-selector'
import { LocaleSelector } from './toolbar/locale-selector'
import { isBlockAvailable } from '../core/cognitive-levels'
import type { StylePreset, BlockSpec, CognitiveLevel } from '../core/types'
import universalBlocks from '../blocks/universal.json'
import apcsPreset from '../languages/cpp/styles/apcs.json'
import competitivePreset from '../languages/cpp/styles/competitive.json'
import googlePreset from '../languages/cpp/styles/google.json'

const STYLE_PRESETS: StylePreset[] = [
  apcsPreset as StylePreset,
  competitivePreset as StylePreset,
  googlePreset as StylePreset,
]

const DEFAULT_STYLE: StylePreset = STYLE_PRESETS[0]

export class App {
  private blocklyPanel: BlocklyPanel | null = null
  private monacoPanel: MonacoPanel | null = null
  private syncController: SyncController | null = null
  private blockSpecRegistry: BlockSpecRegistry
  private localeLoader: LocaleLoader
  private storageService: StorageService
  private levelSelector: LevelSelector | null = null
  private currentLevel: CognitiveLevel = 1
  private _codeToBlocksInProgress = false

  constructor() {
    this.blockSpecRegistry = new BlockSpecRegistry()
    this.localeLoader = new LocaleLoader()
    this.storageService = new StorageService()
  }

  async init(): Promise<void> {
    // 1. Register C++ code generators
    registerCppLanguage()

    // 2. Load locale
    this.localeLoader.setBlocklyMsg(Blockly.Msg as Record<string, string>)
    await this.localeLoader.load('zh-TW')

    // 3. Load block specs
    this.blockSpecRegistry.loadFromJSON(universalBlocks as unknown as BlockSpec[])

    // 4. Register all blocks with Blockly from JSON definitions
    this.registerBlocksFromSpecs()

    // 5. Build UI layout
    const appEl = document.getElementById('app')
    if (!appEl) throw new Error('#app element not found')

    // Create toolbar
    const toolbar = document.createElement('header')
    toolbar.id = 'toolbar'
    toolbar.innerHTML = `
      <div class="toolbar-left">
        <span class="toolbar-title">Code Blockly</span>
      </div>
      <div class="toolbar-actions">
        <button id="sync-blocks-btn" title="積木 → 程式碼">積木→程式碼</button>
        <button id="sync-code-btn" title="程式碼 → 積木">程式碼→積木</button>
        <span class="toolbar-separator"></span>
        <span id="level-selector-mount"></span>
        <span class="toolbar-separator"></span>
        <span id="style-selector-mount"></span>
        <span id="locale-selector-mount"></span>
        <span class="toolbar-separator"></span>
        <button id="undo-btn" title="復原">↩</button>
        <button id="redo-btn" title="重做">↪</button>
        <button id="clear-btn" title="清空">清空</button>
        <span class="toolbar-separator"></span>
        <button id="export-btn" title="匯出">匯出</button>
        <button id="import-btn" title="匯入">匯入</button>
      </div>
    `
    appEl.appendChild(toolbar)

    // Create main area with split pane
    const main = document.createElement('main')
    main.id = 'editors'
    appEl.appendChild(main)

    const splitPane = new SplitPane(main)

    // Create status bar
    const statusBar = document.createElement('footer')
    statusBar.id = 'status-bar'
    statusBar.innerHTML = '<span>C++ | APCS Style | zh-TW</span>'
    appEl.appendChild(statusBar)

    // 6. Initialize Blockly panel
    const blocklyContainer = splitPane.getLeftPanel()
    blocklyContainer.id = 'blockly-panel'
    this.blocklyPanel = new BlocklyPanel({ container: blocklyContainer })
    this.blocklyPanel.init(this.buildToolbox())

    // 7. Initialize Monaco panel
    const monacoContainer = splitPane.getRightPanel()
    monacoContainer.id = 'monaco-panel'
    this.monacoPanel = new MonacoPanel(monacoContainer)
    this.monacoPanel.init(false) // editable for US2

    // 8. Create sync controller
    this.syncController = new SyncController(
      this.blocklyPanel,
      this.monacoPanel,
      'cpp',
      DEFAULT_STYLE,
    )

    // 8b. Setup code→blocks pipeline (US2)
    await this.setupCodeToBlocksPipeline()

    // 9. Wire events
    this.blocklyPanel.onChange(() => {
      if (this._codeToBlocksInProgress) return
      this.syncController!.syncBlocksToCode()
      this.autoSave()
    })

    // 10. Setup toolbar buttons + selectors
    this.setupToolbar()
    this.setupLevelSelector()
    this.setupStyleSelector()
    this.setupLocaleSelector()

    // 11. Restore saved state
    this.restoreState()
  }

  private registerBlocksFromSpecs(): void {
    const specs = this.blockSpecRegistry.getAll()
    for (const spec of specs) {
      const blockDef = spec.blockDef
      const blockType = blockDef?.type as string | undefined
      if (!blockType) continue
      if (Blockly.Blocks[blockType]) continue

      // Register basic blocks from JSON definition
      Blockly.Blocks[blockType] = {
        init: function (this: Blockly.Block) {
          this.jsonInit(blockDef)
        },
      }
    }

    // Register dynamic blocks that need custom init
    this.registerDynamicBlocks()
  }

  private registerDynamicBlocks(): void {
    // u_var_declare with mutator gear (must override JSON-registered version)
    {
      const getTypeOptions = () => {
        return [
          [Blockly.Msg['TYPE_INT'] || 'int', 'int'],
          [Blockly.Msg['TYPE_FLOAT'] || 'float', 'float'],
          [Blockly.Msg['TYPE_DOUBLE'] || 'double', 'double'],
          [Blockly.Msg['TYPE_CHAR'] || 'char', 'char'],
          [Blockly.Msg['TYPE_BOOL'] || 'bool', 'bool'],
          [Blockly.Msg['TYPE_STRING'] || 'string', 'string'],
        ] as Array<[string, string]>
      }

      Blockly.Blocks['u_var_declare'] = {
        items_: ['var_init'] as string[],
        init: function (this: Blockly.Block & { items_: string[]; rebuildInputs_: () => void }) {
          this.appendDummyInput('HEADER')
            .appendField(Blockly.Msg['U_VAR_DECLARE_HEADER'] || '宣告')
            .appendField(new Blockly.FieldDropdown(getTypeOptions) as Blockly.Field, 'TYPE')
          // Default shape: one var with init
          this.appendValueInput('INIT_0')
            .appendField(new Blockly.FieldTextInput('x') as Blockly.Field, 'NAME_0')
            .appendField('=')
          this.setInputsInline(false)
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#FF8C1A')
          this.setTooltip(Blockly.Msg['U_VAR_DECLARE_TOOLTIP'] || '宣告變數')
        },
        saveExtraState: function (this: Blockly.Block & { items_: string[] }) {
          return { items: this.items_ }
        },
        loadExtraState: function (this: Blockly.Block & { items_: string[]; rebuildInputs_: () => void }, state: { items?: string[] }) {
          this.items_ = state?.items ?? ['var_init']
          this.rebuildInputs_()
        },
        rebuildInputs_: function (this: Blockly.Block & { items_: string[] }) {
          // Save connected blocks
          const savedBlocks: (Blockly.Block | null)[] = []
          const savedNames: string[] = []
          for (let i = 0; ; i++) {
            const initInput = this.getInput(`INIT_${i}`)
            const varInput = this.getInput(`VAR_${i}`)
            if (!initInput && !varInput) break
            savedNames.push(this.getFieldValue(`NAME_${i}`) ?? `v${i}`)
            if (initInput) {
              savedBlocks.push(initInput.connection?.targetBlock() ?? null)
            } else {
              savedBlocks.push(null)
            }
          }
          // Remove all existing var rows
          for (let i = 0; ; i++) {
            const removed = this.getInput(`INIT_${i}`) || this.getInput(`VAR_${i}`)
            if (!removed) break
            if (this.getInput(`INIT_${i}`)) this.removeInput(`INIT_${i}`)
            if (this.getInput(`VAR_${i}`)) this.removeInput(`VAR_${i}`)
          }
          // Rebuild rows based on items_
          for (let j = 0; j < this.items_.length; j++) {
            const name = savedNames[j] ?? `v${j}`
            if (this.items_[j] === 'var_init') {
              this.appendValueInput(`INIT_${j}`)
                .appendField(new Blockly.FieldTextInput(name) as Blockly.Field, `NAME_${j}`)
                .appendField('=')
              // Reconnect
              if (savedBlocks[j] && this.getInput(`INIT_${j}`)?.connection) {
                this.getInput(`INIT_${j}`)!.connection!.connect(savedBlocks[j]!.outputConnection!)
              }
            } else {
              this.appendDummyInput(`VAR_${j}`)
                .appendField(new Blockly.FieldTextInput(name) as Blockly.Field, `NAME_${j}`)
            }
          }
        },
      }
    }

    // u_print with dynamic inputs
    {
      Blockly.Blocks['u_print'] = {
        itemCount_: 1,
        init: function (this: Blockly.Block & { itemCount_: number; updateShape_: () => void }) {
          this.appendValueInput('EXPR0')
            .appendField(Blockly.Msg['U_PRINT_MSG'] || '輸出')
          this.setInputsInline(true)
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#5CA65C')
          this.setTooltip(Blockly.Msg['U_PRINT_TOOLTIP'] || '輸出值')
        },
        saveExtraState: function (this: Blockly.Block & { itemCount_: number }) {
          return { itemCount: this.itemCount_ }
        },
        loadExtraState: function (this: Blockly.Block & { itemCount_: number; updateShape_: () => void }, state: { itemCount: number }) {
          this.itemCount_ = state.itemCount ?? 1
          this.updateShape_()
        },
        updateShape_: function (this: Blockly.Block & { itemCount_: number }) {
          // Remove excess inputs
          let i = this.itemCount_
          while (this.getInput(`EXPR${i}`)) {
            this.removeInput(`EXPR${i}`)
            i++
          }
          // Add missing inputs
          for (let j = 1; j < this.itemCount_; j++) {
            if (!this.getInput(`EXPR${j}`)) {
              this.appendValueInput(`EXPR${j}`)
            }
          }
        },
      }
    }

    // u_input
    {
      Blockly.Blocks['u_input'] = {
        init: function (this: Blockly.Block) {
          this.appendDummyInput()
            .appendField(Blockly.Msg['U_INPUT_MSG'] || '輸入')
            .appendField(new Blockly.FieldTextInput('x') as Blockly.Field, 'NAME_0')
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#5CA65C')
          this.setTooltip(Blockly.Msg['U_INPUT_TOOLTIP'] || '讀取輸入')
        },
      }
    }

    // u_endl
    {
      Blockly.Blocks['u_endl'] = {
        init: function (this: Blockly.Block) {
          this.appendDummyInput()
            .appendField('endl')
          this.setOutput(true, 'Expression')
          this.setColour('#5CA65C')
          this.setTooltip(Blockly.Msg['U_ENDL_TOOLTIP'] || '換行')
        },
      }
    }

    // u_if with condition/then/else
    {
      Blockly.Blocks['u_if'] = {
        init: function (this: Blockly.Block) {
          this.appendValueInput('CONDITION')
            .appendField(Blockly.Msg['U_IF_MSG'] || '如果')
          this.appendStatementInput('THEN')
            .appendField(Blockly.Msg['U_IF_THEN'] || '則')
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#5B80A5')
          this.setTooltip(Blockly.Msg['U_IF_TOOLTIP'] || '條件判斷')
        },
      }
    }

    {
      Blockly.Blocks['u_if_else'] = {
        init: function (this: Blockly.Block) {
          this.appendValueInput('CONDITION')
            .appendField(Blockly.Msg['U_IF_MSG'] || '如果')
          this.appendStatementInput('THEN')
            .appendField(Blockly.Msg['U_IF_THEN'] || '則')
          this.appendStatementInput('ELSE')
            .appendField(Blockly.Msg['U_IF_ELSE'] || '否則')
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#5B80A5')
          this.setTooltip(Blockly.Msg['U_IF_ELSE_TOOLTIP'] || '條件判斷（含否則）')
        },
      }
    }

    // u_while_loop
    {
      Blockly.Blocks['u_while_loop'] = {
        init: function (this: Blockly.Block) {
          this.appendValueInput('CONDITION')
            .appendField(Blockly.Msg['U_WHILE_MSG'] || '當')
          this.appendStatementInput('BODY')
            .appendField(Blockly.Msg['U_WHILE_DO'] || '重複')
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#5B80A5')
          this.setTooltip(Blockly.Msg['U_WHILE_TOOLTIP'] || 'while 迴圈')
        },
      }
    }

    // u_count_loop
    {
      Blockly.Blocks['u_count_loop'] = {
        init: function (this: Blockly.Block) {
          this.appendDummyInput()
            .appendField(Blockly.Msg['U_COUNT_LOOP_MSG'] || '計數')
            .appendField(new Blockly.FieldTextInput('i') as Blockly.Field, 'VAR')
          this.appendValueInput('FROM')
            .appendField(Blockly.Msg['U_COUNT_LOOP_FROM'] || '從')
          this.appendValueInput('TO')
            .appendField(Blockly.Msg['U_COUNT_LOOP_TO'] || '到')
          this.appendStatementInput('BODY')
            .appendField(Blockly.Msg['U_COUNT_LOOP_DO'] || '重複')
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#5B80A5')
          this.setTooltip(Blockly.Msg['U_COUNT_LOOP_TOOLTIP'] || 'for 迴圈')
        },
      }
    }

    // u_break, u_continue
    {
      Blockly.Blocks['u_break'] = {
        init: function (this: Blockly.Block) {
          this.appendDummyInput().appendField(Blockly.Msg['U_BREAK_MSG'] || '跳出')
          this.setPreviousStatement(true, 'Statement')
          this.setColour('#5B80A5')
          this.setTooltip('break')
        },
      }
    }
    {
      Blockly.Blocks['u_continue'] = {
        init: function (this: Blockly.Block) {
          this.appendDummyInput().appendField(Blockly.Msg['U_CONTINUE_MSG'] || '繼續')
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#5B80A5')
          this.setTooltip('continue')
        },
      }
    }

    // u_func_def with dynamic parameter support
    {
      Blockly.Blocks['u_func_def'] = {
        paramCount_: 0,
        init: function (this: Blockly.Block & { paramCount_: number; updateShape_: () => void }) {
          this.appendDummyInput('HEADER')
            .appendField(Blockly.Msg['U_FUNC_DEF_MSG'] || '定義函式')
            .appendField(new Blockly.FieldDropdown([
              ['void', 'void'], ['int', 'int'], ['float', 'float'],
              ['double', 'double'], ['bool', 'bool'], ['string', 'string'],
            ]) as Blockly.Field, 'RETURN_TYPE')
            .appendField(new Blockly.FieldTextInput('main') as Blockly.Field, 'NAME')
          this.appendDummyInput('PARAMS_LABEL')
            .appendField('(')
          this.appendDummyInput('PARAMS_END')
            .appendField(')')
          this.appendStatementInput('BODY')
          this.setInputsInline(true)
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#995BA5')
          this.setTooltip(Blockly.Msg['U_FUNC_DEF_TOOLTIP'] || '定義函式')
        },
        saveExtraState: function (this: Blockly.Block & { paramCount_: number }) {
          if (this.paramCount_ > 0) {
            return { paramCount: this.paramCount_ }
          }
          return null
        },
        loadExtraState: function (this: Blockly.Block & { paramCount_: number; updateShape_: () => void }, state: { paramCount: number }) {
          this.paramCount_ = state?.paramCount ?? 0
          this.updateShape_()
        },
        updateShape_: function (this: Blockly.Block & { paramCount_: number }) {
          // Remove old param inputs
          let i = 0
          while (this.getInput(`PARAM_${i}`)) {
            this.removeInput(`PARAM_${i}`)
            i++
          }
          // Add param inputs before PARAMS_END
          for (let j = 0; j < this.paramCount_; j++) {
            const input = this.appendDummyInput(`PARAM_${j}`)
            if (j > 0) input.appendField(',')
            input.appendField(new Blockly.FieldDropdown([
              ['int', 'int'], ['float', 'float'], ['double', 'double'],
              ['char', 'char'], ['bool', 'bool'], ['string', 'string'],
            ]) as Blockly.Field, `TYPE_${j}`)
            input.appendField(new Blockly.FieldTextInput(`p${j}`) as Blockly.Field, `PARAM_${j}`)
            // Move before PARAMS_END
            this.moveInputBefore(`PARAM_${j}`, 'PARAMS_END')
          }
        },
      }
    }

    // u_func_call with dynamic argument support
    {
      Blockly.Blocks['u_func_call'] = {
        argCount_: 0,
        init: function (this: Blockly.Block & { argCount_: number }) {
          this.appendDummyInput()
            .appendField(Blockly.Msg['U_FUNC_CALL_MSG'] || '呼叫')
            .appendField(new Blockly.FieldTextInput('myFunction') as Blockly.Field, 'NAME')
          this.setInputsInline(true)
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#995BA5')
          this.setTooltip(Blockly.Msg['U_FUNC_CALL_TOOLTIP'] || '呼叫函式')
        },
        saveExtraState: function (this: Blockly.Block & { argCount_: number }) {
          if (this.argCount_ > 0) {
            return { argCount: this.argCount_ }
          }
          return null
        },
        loadExtraState: function (this: Blockly.Block & { argCount_: number; updateShape_: () => void }, state: { argCount: number }) {
          this.argCount_ = state?.argCount ?? 0
          this.updateShape_()
        },
        updateShape_: function (this: Blockly.Block & { argCount_: number }) {
          let i = 0
          while (this.getInput(`ARG_${i}`)) {
            this.removeInput(`ARG_${i}`)
            i++
          }
          for (let j = 0; j < this.argCount_; j++) {
            this.appendValueInput(`ARG_${j}`)
              .appendField(j === 0 ? '(' : ',')
          }
          if (this.argCount_ > 0) {
            if (!this.getInput('ARGS_END')) {
              this.appendDummyInput('ARGS_END').appendField(')')
            }
          } else {
            if (this.getInput('ARGS_END')) {
              this.removeInput('ARGS_END')
            }
          }
        },
      }
    }

    // u_return
    {
      Blockly.Blocks['u_return'] = {
        init: function (this: Blockly.Block) {
          this.appendValueInput('VALUE')
            .appendField(Blockly.Msg['U_RETURN_MSG'] || '回傳')
          this.setPreviousStatement(true, 'Statement')
          this.setColour('#995BA5')
          this.setTooltip(Blockly.Msg['U_RETURN_TOOLTIP'] || '回傳值')
        },
      }
    }

    // u_array_declare
    {
      Blockly.Blocks['u_array_declare'] = {
        init: function (this: Blockly.Block) {
          this.appendDummyInput()
            .appendField(Blockly.Msg['U_ARRAY_DECLARE_MSG'] || '陣列')
            .appendField(new Blockly.FieldDropdown([
              ['int', 'int'], ['float', 'float'], ['double', 'double'],
              ['char', 'char'], ['bool', 'bool'],
            ]) as Blockly.Field, 'TYPE')
            .appendField(new Blockly.FieldTextInput('arr') as Blockly.Field, 'NAME')
            .appendField('[')
            .appendField(new Blockly.FieldNumber(10, 1) as Blockly.Field, 'SIZE')
            .appendField(']')
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#FF8C1A')
          this.setTooltip(Blockly.Msg['U_ARRAY_DECLARE_TOOLTIP'] || '宣告陣列')
        },
      }
    }

    // c_raw_code — with unresolved visual distinction
    {
      Blockly.Blocks['c_raw_code'] = {
        init: function (this: Blockly.Block) {
          this.appendDummyInput()
            .appendField(new Blockly.FieldTextInput('// raw code') as Blockly.Field, 'CODE')
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#888888')
          this.setTooltip('Raw code')
        },
        saveExtraState: function (this: Blockly.Block & { unresolved_?: boolean; nodeType_?: string }) {
          const state: Record<string, unknown> = {}
          if (this.unresolved_) {
            state.unresolved = true
            state.nodeType = this.nodeType_ ?? ''
          }
          return state
        },
        loadExtraState: function (this: Blockly.Block & { unresolved_?: boolean; nodeType_?: string }, state: Record<string, unknown>) {
          if (state.unresolved) {
            this.unresolved_ = true
            this.nodeType_ = (state.nodeType as string) ?? ''
            this.setColour('#AA6644')
            this.setTooltip(`Unresolved: ${this.nodeType_}`)
          }
        },
      }
    }

    // u_array_access
    {
      Blockly.Blocks['u_array_access'] = {
        init: function (this: Blockly.Block) {
          this.appendValueInput('INDEX')
            .appendField(new Blockly.FieldTextInput('arr') as Blockly.Field, 'NAME')
            .appendField('[')
          this.appendDummyInput()
            .appendField(']')
          this.setInputsInline(true)
          this.setOutput(true, 'Expression')
          this.setColour('#FF8C1A')
          this.setTooltip(Blockly.Msg['U_ARRAY_ACCESS_TOOLTIP'] || '陣列存取')
        },
      }
    }

    // c_comment_line
    {
      Blockly.Blocks['c_comment_line'] = {
        init: function (this: Blockly.Block) {
          this.appendDummyInput()
            .appendField('//')
            .appendField(new Blockly.FieldTextInput('comment') as Blockly.Field, 'TEXT')
          this.setPreviousStatement(true, 'Statement')
          this.setNextStatement(true, 'Statement')
          this.setColour('#AAAAAA')
          this.setTooltip('Comment')
        },
      }
    }
  }

  private buildToolbox(level?: CognitiveLevel): object {
    const lv = level ?? this.currentLevel

    const filterBlocks = (types: string[]) =>
      types.filter(t => isBlockAvailable(t, lv)).map(t => ({ kind: 'block', type: t }))

    const categories = [
      {
        kind: 'category',
        name: Blockly.Msg['CATEGORY_DATA'] || '資料',
        colour: '#FF8C1A',
        contents: filterBlocks([
          'u_var_declare', 'u_var_assign', 'u_var_ref', 'u_number', 'u_string',
          'u_array_declare', 'u_array_access',
        ]),
      },
      {
        kind: 'category',
        name: Blockly.Msg['CATEGORY_OPERATORS'] || '運算',
        colour: '#59C059',
        contents: filterBlocks([
          'u_arithmetic', 'u_compare', 'u_logic', 'u_logic_not', 'u_negate',
        ]),
      },
      {
        kind: 'category',
        name: Blockly.Msg['CATEGORY_CONTROL'] || '控制',
        colour: '#5B80A5',
        contents: filterBlocks([
          'u_if', 'u_if_else', 'u_while_loop', 'u_count_loop', 'u_break', 'u_continue',
        ]),
      },
      {
        kind: 'category',
        name: Blockly.Msg['CATEGORY_FUNCTIONS'] || '函式',
        colour: '#995BA5',
        contents: filterBlocks([
          'u_func_def', 'u_func_call', 'u_return',
        ]),
      },
      {
        kind: 'category',
        name: Blockly.Msg['CATEGORY_IO'] || '輸入/輸出',
        colour: '#5CA65C',
        contents: filterBlocks([
          'u_print', 'u_input', 'u_endl',
        ]),
      },
    ]

    // Only include categories with at least one block
    return {
      kind: 'categoryToolbox',
      contents: categories.filter(c => c.contents.length > 0),
    }
  }

  private async setupCodeToBlocksPipeline(): Promise<void> {
    const lifter = new Lifter()
    registerCppLifters(lifter)

    const parser = new CppParser()
    await parser.init()

    // Adapt CppParser (async) to CodeParser interface (sync-like)
    // We store the last parse result and use it synchronously
    const codeParser = {
      _lastTree: null as unknown,
      parse(_code: string) {
        // CppParser.parse is async, but we pre-parse before sync
        return { rootNode: this._lastTree }
      },
    }

    this.syncController!.setCodeToBlocksPipeline(lifter, codeParser)

    // Override syncCodeToBlocks to handle async parsing
    const originalSync = this.syncController!.syncCodeToBlocks.bind(this.syncController!)
    const monacoPanel = this.monacoPanel!

    this.syncController!.syncCodeToBlocks = () => {
      const code = monacoPanel.getCode()
      this._codeToBlocksInProgress = true
      parser.parse(code).then(tree => {
        codeParser._lastTree = tree.rootNode
        originalSync()
        // Clear flag after event loop settles (deferred Blockly events)
        setTimeout(() => { this._codeToBlocksInProgress = false }, 0)
      }).catch(err => {
        console.error('Parse error:', err)
        this._codeToBlocksInProgress = false
      })
      return false
    }

    this.syncController!.onError((errors: SyncError[]) => {
      const messages = errors.map(e => e.message).join('\n')
      console.warn('Sync errors:', messages)
      this.showStatusMessage(`⚠ ${errors.length} 個語法錯誤`, 3000)
    })
  }

  private setupLevelSelector(): void {
    const mount = document.getElementById('level-selector-mount')
    if (!mount) return
    this.levelSelector = new LevelSelector(mount)
    this.levelSelector.setLevel(this.currentLevel)
    this.levelSelector.onChange((level) => {
      this.currentLevel = level
      this.updateToolboxForLevel(level)
    })
  }

  private setupStyleSelector(): void {
    const mount = document.getElementById('style-selector-mount')
    if (!mount) return
    const selector = new StyleSelector(mount, STYLE_PRESETS)
    selector.onChange((style) => {
      this.syncController?.setStyle(style)
      this.syncController?.syncBlocksToCode()
      this.updateStatusBar(style)
    })
  }

  private setupLocaleSelector(): void {
    const mount = document.getElementById('locale-selector-mount')
    if (!mount) return
    const selector = new LocaleSelector(mount)
    selector.onChange(async (locale) => {
      await this.localeLoader.load(locale)
      // Re-render blocks to update messages
      this.syncController?.syncBlocksToCode()
    })
  }

  private updateStatusBar(style?: StylePreset): void {
    const statusBar = document.getElementById('status-bar')
    if (!statusBar) return
    const s = style ?? DEFAULT_STYLE
    const styleName = s.name['zh-TW'] || s.id
    statusBar.innerHTML = `<span>C++ | ${styleName}</span>`
  }

  private updateToolboxForLevel(level: CognitiveLevel): void {
    if (!this.blocklyPanel) return
    const workspace = this.blocklyPanel.getWorkspace()
    if (!workspace) return
    const toolbox = this.buildToolbox(level)
    workspace.updateToolbox(toolbox as Blockly.utils.toolbox.ToolboxDefinition)
  }

  private showStatusMessage(msg: string, duration = 3000): void {
    const statusBar = document.getElementById('status-bar')
    if (!statusBar) return
    const original = statusBar.innerHTML
    statusBar.innerHTML = `<span>${msg}</span>`
    setTimeout(() => { statusBar.innerHTML = original }, duration)
  }

  private setupToolbar(): void {
    // Replace elements to remove old event listeners (prevent HMR duplication)
    const replaceBtn = (id: string) => {
      const el = document.getElementById(id)
      if (el) {
        const clone = el.cloneNode(true) as HTMLElement
        el.parentNode?.replaceChild(clone, el)
        return clone
      }
      return null
    }

    replaceBtn('sync-blocks-btn')?.addEventListener('click', () => {
      this.syncController?.syncBlocksToCode()
    })
    replaceBtn('sync-code-btn')?.addEventListener('click', () => {
      this.syncController?.syncCodeToBlocks()
    })
    replaceBtn('undo-btn')?.addEventListener('click', () => {
      this.blocklyPanel?.undo()
    })
    replaceBtn('redo-btn')?.addEventListener('click', () => {
      this.blocklyPanel?.redo()
    })
    replaceBtn('clear-btn')?.addEventListener('click', () => {
      this.blocklyPanel?.clear()
    })
    replaceBtn('export-btn')?.addEventListener('click', () => {
      this.exportWorkspace()
    })
    replaceBtn('import-btn')?.addEventListener('click', () => {
      this.importWorkspace()
    })
  }

  private exportWorkspace(): void {
    const state: SavedState = {
      version: 1,
      tree: this.syncController?.getCurrentTree() ?? null,
      blocklyState: this.blocklyPanel?.getState() ?? {},
      code: this.monacoPanel?.getCode() ?? '',
      language: 'cpp',
      styleId: 'apcs',
      level: this.currentLevel,
      lastModified: new Date().toISOString(),
    }
    const blob = this.storageService.exportToBlob(state)
    this.storageService.downloadBlob(blob, `code-blockly-${Date.now()}.json`)
    this.showStatusMessage('已匯出', 2000)
  }

  private importWorkspace(): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const state = this.storageService.importFromJSON(reader.result as string)
        if (!state) {
          this.showStatusMessage('匯入失敗：無效的 JSON', 3000)
          return
        }
        if (state.blocklyState && Object.keys(state.blocklyState).length > 0) {
          this.blocklyPanel?.setState(state.blocklyState)
        }
        if (state.code) {
          this.monacoPanel?.setCode(state.code)
        }
        this.showStatusMessage('已匯入', 2000)
      }
      reader.readAsText(file)
    })
    input.click()
  }

  private autoSave(): void {
    this.storageService.save({
      blocklyState: this.blocklyPanel?.getState() ?? {},
      code: this.monacoPanel?.getCode() ?? '',
      tree: this.syncController?.getCurrentTree() ?? null,
      level: this.currentLevel,
    })
  }

  private restoreState(): void {
    const state = this.storageService.load()
    if (!state) return
    try {
      if (state.blocklyState && Object.keys(state.blocklyState).length > 0) {
        this.blocklyPanel?.setState(state.blocklyState)
      }
      if (state.code) {
        this.monacoPanel?.setCode(state.code)
      }
    } catch (err) {
      console.warn('Failed to restore saved state, clearing:', err)
      this.storageService.clear()
    }
  }

  dispose(): void {
    this.blocklyPanel?.dispose()
    this.monacoPanel?.dispose()
  }
}
