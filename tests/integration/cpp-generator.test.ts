import { describe, it, expect, beforeEach } from 'vitest'
import { CppGenerator } from '../../src/languages/cpp/generator'
import { BlockRegistry } from '../../src/core/block-registry'
import type { BlockSpec } from '../../src/core/types'
import basicBlocks from '../../src/languages/cpp/blocks/basic.json'
import advancedBlocks from '../../src/languages/cpp/blocks/advanced.json'
import specialBlocks from '../../src/languages/cpp/blocks/special.json'

describe('CppGenerator 整合測試', () => {
  let registry: BlockRegistry
  let generator: CppGenerator

  beforeEach(() => {
    registry = new BlockRegistry()
    const allBlocks = [...basicBlocks, ...advancedBlocks, ...specialBlocks] as BlockSpec[]
    allBlocks.forEach(spec => registry.register(spec))
    generator = new CppGenerator(registry)
  })

  describe('完整程式產生', () => {
    it('should generate a complete Hello World program', () => {
      const workspace = {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'c_include',
              id: 'inc1',
              fields: { HEADER: 'stdio.h' },
              next: {
                block: {
                  type: 'c_function_def',
                  id: 'main',
                  fields: { RETURN_TYPE: 'int', NAME: 'main', PARAMS: '' },
                  inputs: {
                    BODY: {
                      block: {
                        type: 'c_printf',
                        id: 'p1',
                        fields: { FORMAT: 'Hello, World!\\n', ARGS: '' },
                        next: {
                          block: {
                            type: 'c_return',
                            id: 'r1',
                            inputs: {
                              VALUE: { block: { type: 'c_number', id: 'n0', fields: { NUM: 0 } } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      }

      const code = generator.generate(workspace)
      expect(code).toContain('#include <stdio.h>')
      expect(code).toContain('int main()')
      expect(code).toContain('printf("Hello, World!\\n")')
      expect(code).toContain('return 0;')
    })

    it('should generate a for-loop program with printf', () => {
      const workspace = {
        blocks: {
          languageVersion: 0,
          blocks: [{
            type: 'c_for_loop',
            id: 'for1',
            inputs: {
              INIT: { block: { type: 'c_raw_expression', id: 'init', fields: { CODE: 'int i = 0' } } },
              COND: {
                block: {
                  type: 'c_compare_op',
                  id: 'cond',
                  fields: { OP: '<' },
                  inputs: {
                    A: { block: { type: 'c_variable_ref', id: 'i', fields: { NAME: 'i' } } },
                    B: { block: { type: 'c_number', id: 'n10', fields: { NUM: 10 } } },
                  },
                },
              },
              UPDATE: { block: { type: 'c_increment', id: 'inc', fields: { NAME: 'i', OP: '++' } } },
              BODY: {
                block: {
                  type: 'c_printf',
                  id: 'pf',
                  fields: { FORMAT: '%d\\n', ARGS: ', i' },
                },
              },
            },
          }],
        },
      }

      const code = generator.generate(workspace)
      expect(code).toContain('#include <stdio.h>')
      expect(code).toContain('for (int i = 0; i < 10; i++)')
      expect(code).toContain('printf("%d\\n", i)')
    })
  })

  describe('多積木組合', () => {
    it('should generate if-else with variable and comparison', () => {
      const workspace = {
        blocks: {
          languageVersion: 0,
          blocks: [{
            type: 'c_if_else',
            id: 'if1',
            inputs: {
              COND: {
                block: {
                  type: 'c_compare_op',
                  id: 'cmp',
                  fields: { OP: '>=' },
                  inputs: {
                    A: { block: { type: 'c_variable_ref', id: 'v1', fields: { NAME: 'score' } } },
                    B: { block: { type: 'c_number', id: 'n60', fields: { NUM: 60 } } },
                  },
                },
              },
              THEN: {
                block: {
                  type: 'c_printf',
                  id: 'p1',
                  fields: { FORMAT: 'Pass\\n', ARGS: '' },
                },
              },
              ELSE: {
                block: {
                  type: 'c_printf',
                  id: 'p2',
                  fields: { FORMAT: 'Fail\\n', ARGS: '' },
                },
              },
            },
          }],
        },
      }

      const code = generator.generate(workspace)
      expect(code).toContain('if (score >= 60)')
      expect(code).toContain('printf("Pass\\n")')
      expect(code).toContain('else')
      expect(code).toContain('printf("Fail\\n")')
    })

    it('should handle C++ cout with endl', () => {
      const workspace = {
        blocks: {
          languageVersion: 0,
          blocks: [{
            type: 'cpp_cout',
            id: 'cout1',
            inputs: {
              VALUE: { block: { type: 'c_string_literal', id: 's1', fields: { TEXT: 'Hello C++' } } },
            },
          }],
        },
      }

      const code = generator.generate(workspace)
      expect(code).toContain('#include <iostream>')
      expect(code).toContain('std::cout << "Hello C++"')
    })

    it('should handle vector declaration and push_back', () => {
      const workspace = {
        blocks: {
          languageVersion: 0,
          blocks: [{
            type: 'cpp_vector_declare',
            id: 'v1',
            fields: { TYPE: 'int', NAME: 'nums' },
            next: {
              block: {
                type: 'cpp_vector_push_back',
                id: 'pb1',
                fields: { VECTOR: 'nums' },
                inputs: {
                  VALUE: { block: { type: 'c_number', id: 'n42', fields: { NUM: 42 } } },
                },
              },
            },
          }],
        },
      }

      const code = generator.generate(workspace)
      expect(code).toContain('#include <vector>')
      expect(code).toContain('std::vector<int> nums;')
      expect(code).toContain('nums.push_back(42);')
    })
  })

  describe('#include 自動收集', () => {
    it('should collect imports from nested blocks', () => {
      const workspace = {
        blocks: {
          languageVersion: 0,
          blocks: [{
            type: 'c_function_def',
            id: 'fn',
            fields: { RETURN_TYPE: 'void', NAME: 'test', PARAMS: '' },
            inputs: {
              BODY: {
                block: {
                  type: 'c_printf',
                  id: 'p1',
                  fields: { FORMAT: 'test\\n', ARGS: '' },
                },
              },
            },
          }],
        },
      }

      const code = generator.generate(workspace)
      expect(code).toContain('#include <stdio.h>')
    })

    it('should collect multiple different imports', () => {
      const workspace = {
        blocks: {
          languageVersion: 0,
          blocks: [{
            type: 'cpp_sort',
            id: 's1',
            inputs: {
              BEGIN: { block: { type: 'c_raw_expression', id: 'b', fields: { CODE: 'v.begin()' } } },
              END: { block: { type: 'c_raw_expression', id: 'e', fields: { CODE: 'v.end()' } } },
            },
            next: {
              block: {
                type: 'c_printf',
                id: 'p1',
                fields: { FORMAT: 'sorted\\n', ARGS: '' },
              },
            },
          }],
        },
      }

      const code = generator.generate(workspace)
      expect(code).toContain('#include <algorithm>')
      expect(code).toContain('#include <stdio.h>')
    })
  })

  describe('使用全部積木定義載入', () => {
    it('should load all block specs without errors', () => {
      expect(registry.getByCategory('variables').length).toBeGreaterThan(0)
      expect(registry.getByCategory('operators').length).toBeGreaterThan(0)
      expect(registry.getByCategory('conditions').length).toBeGreaterThan(0)
      expect(registry.getByCategory('loops').length).toBeGreaterThan(0)
      expect(registry.getByCategory('io').length).toBeGreaterThan(0)
      expect(registry.getByCategory('functions').length).toBeGreaterThan(0)
    })

    it('should have unique block IDs across all JSON files', () => {
      const allIds = [...basicBlocks, ...advancedBlocks, ...specialBlocks].map(b => b.id)
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)
    })
  })
})
