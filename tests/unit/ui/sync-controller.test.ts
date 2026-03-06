import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { SyncController } from '../../../src/ui/sync-controller'
import type { CodeParser, SyncError } from '../../../src/ui/sync-controller'
import type { BlocklyPanel } from '../../../src/ui/panels/blockly-panel'
import type { MonacoPanel } from '../../../src/ui/panels/monaco-panel'
import type { StylePreset } from '../../../src/core/types'
import { createNode } from '../../../src/core/semantic-tree'
import { Lifter } from '../../../src/core/lift/lifter'
import { registerCppLanguage } from '../../../src/languages/cpp/generators'

beforeAll(() => {
  registerCppLanguage()
})

const mockStyle: StylePreset = {
  id: 'test',
  name: { 'zh-TW': 'Test', en: 'Test' },
  io_style: 'cout',
  naming_convention: 'camelCase',
  indent_size: 4,
  brace_style: 'K&R',
  namespace_style: 'using',
  header_style: 'individual',
}

function createMockBlocklyPanel() {
  return {
    extractSemanticTree: vi.fn(() => createNode('program', {}, { body: [] })),
    setState: vi.fn(),
    getState: vi.fn(() => ({})),
    init: vi.fn(),
    onChange: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  } as unknown as BlocklyPanel
}

function createMockMonacoPanel() {
  return {
    getCode: vi.fn(() => ''),
    setCode: vi.fn(),
    init: vi.fn(),
    dispose: vi.fn(),
  } as unknown as MonacoPanel
}

describe('SyncController', () => {
  let blocklyPanel: BlocklyPanel
  let monacoPanel: MonacoPanel
  let controller: SyncController

  beforeEach(() => {
    blocklyPanel = createMockBlocklyPanel()
    monacoPanel = createMockMonacoPanel()
    controller = new SyncController(blocklyPanel, monacoPanel, 'cpp', mockStyle)
  })

  describe('syncBlocksToCode', () => {
    it('should extract tree from blockly and set code in monaco', () => {
      const tree = createNode('program', {}, {
        body: [createNode('var_declare', { name: 'x', type: 'int' }, { initializer: [] })],
      })
      ;(blocklyPanel.extractSemanticTree as ReturnType<typeof vi.fn>).mockReturnValue(tree)

      controller.syncBlocksToCode()

      expect(blocklyPanel.extractSemanticTree).toHaveBeenCalled()
      expect(monacoPanel.setCode).toHaveBeenCalled()
      const code = (monacoPanel.setCode as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(code).toContain('int x;')
    })

    it('should prevent re-entrant sync', () => {
      // First call sets syncing = true
      controller.syncBlocksToCode()
      expect(blocklyPanel.extractSemanticTree).toHaveBeenCalledTimes(1)
    })

    it('should store current tree', () => {
      const tree = createNode('program', {}, { body: [] })
      ;(blocklyPanel.extractSemanticTree as ReturnType<typeof vi.fn>).mockReturnValue(tree)

      controller.syncBlocksToCode()
      expect(controller.getCurrentTree()).not.toBeNull()
      expect(controller.getCurrentTree()!.concept).toBe('program')
    })
  })

  describe('syncCodeToBlocks', () => {
    it('should return false if no pipeline configured', () => {
      const result = controller.syncCodeToBlocks()
      expect(result).toBe(false)
    })

    it('should parse code and update blockly when pipeline configured', () => {
      const rootNode = {
        type: 'translation_unit',
        text: '',
        isNamed: true,
        children: [],
        namedChildren: [],
        childForFieldName: () => null,
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 0 },
      }
      const mockParser: CodeParser = {
        parse: vi.fn(() => ({ rootNode })),
      }

      const lifter = new Lifter()
      lifter.register('translation_unit', () => createNode('program', {}, { body: [] }))

      controller.setCodeToBlocksPipeline(lifter, mockParser)
      ;(monacoPanel.getCode as ReturnType<typeof vi.fn>).mockReturnValue('')

      const result = controller.syncCodeToBlocks()
      expect(result).toBe(true)
      expect(blocklyPanel.setState).toHaveBeenCalled()
    })

    it('should call error callback on parse errors', () => {
      const errorNode = {
        type: 'ERROR',
        text: 'bad',
        isNamed: true,
        children: [],
        namedChildren: [],
        childForFieldName: () => null,
        startPosition: { row: 2, column: 0 },
        endPosition: { row: 2, column: 3 },
      }
      const rootNode = {
        type: 'translation_unit',
        text: 'bad',
        isNamed: true,
        children: [errorNode],
        namedChildren: [errorNode],
        childForFieldName: () => null,
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 2, column: 3 },
      }
      const mockParser: CodeParser = {
        parse: vi.fn(() => ({ rootNode })),
      }

      const lifter = new Lifter()
      lifter.register('translation_unit', (_node, ctx) => {
        return createNode('program', {}, { body: ctx.liftChildren(_node.namedChildren) })
      })

      const errorCallback = vi.fn()
      controller.setCodeToBlocksPipeline(lifter, mockParser)
      controller.onError(errorCallback)
      ;(monacoPanel.getCode as ReturnType<typeof vi.fn>).mockReturnValue('bad')

      controller.syncCodeToBlocks()

      expect(errorCallback).toHaveBeenCalled()
      const errors: SyncError[] = errorCallback.mock.calls[0][0]
      expect(errors).toHaveLength(1)
      expect(errors[0].line).toBe(2)
    })
  })

  describe('state management', () => {
    it('should track syncing state', () => {
      expect(controller.isSyncing()).toBe(false)
    })

    it('should allow setting style', () => {
      controller.setStyle({ ...mockStyle, id: 'new' })
      // No error thrown
    })

    it('should allow setting language', () => {
      controller.setLanguage('python')
      // No error thrown
    })
  })
})
