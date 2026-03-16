# Implementation Plan: 統一積木提取器架構

**Branch**: `048-unify-extractor` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/048-unify-extractor/spec.md`

## Summary

消除 BlockExtractorRegistry 和 PatternExtractor 的雙重提取路徑。擴充 renderMapping 加入 `dynamicRules`，讓 PatternExtractor 能處理動態積木（變動參數、多模式 input）。同時統一 PatternRenderer 使用同一套 dynamicRules。BlocklyPanel 改為序列化 Blockly.Block 為 BlockState 後交給 PatternExtractor。最終刪除 ~48 個手寫 extractor 和 BlockExtractorRegistry。

## Technical Context

**Language/Version**: TypeScript 5.x + Blockly 12.4.1
**Primary Dependencies**: Blockly（積木渲染/序列化）, Vitest（測試）
**Storage**: N/A（記憶體中的 Registry）
**Testing**: Vitest（`npm test`）+ `npx tsc --noEmit`
**Target Platform**: 瀏覽器
**Project Type**: 教育用 Web 應用（內部架構重構）
**Performance Goals**: N/A（重構，不改變效能特性）
**Constraints**: 所有 2900+ 既有測試不修改即通過
**Scale/Scope**: 影響 ~10 個核心檔案，~48 個 extractor + ~12 個 renderStrategy 轉為 JSON

## Constitution Check

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. 簡約優先 | ✅ PASS | 消除雙重系統是減少複雜度，不是增加 |
| II. 測試驅動開發 | ✅ PASS | 每階段都有對應的測試驗證 |
| III. Git 紀律 | ✅ PASS | 每個邏輯步驟 commit |
| IV. 規格文件保護 | ✅ PASS | 不涉及 spec/plan 刪除 |
| V. 繁體中文優先 | ✅ PASS | 文件以繁體中文撰寫 |

## Project Structure

### Documentation

```text
specs/048-unify-extractor/
├── spec.md
├── plan.md              # 本文件
├── research.md
├── data-model.md
└── checklists/
    └── requirements.md
```

### Source Code

```text
src/
├── core/
│   ├── projection/
│   │   ├── pattern-extractor.ts    # 擴充：支援 extraState + dynamicRules
│   │   ├── pattern-renderer.ts     # 擴充：使用同一套 dynamicRules
│   │   └── common-mappings.ts      # 維持
│   ├── registry/
│   │   ├── block-extractor-registry.ts  # 最終刪除
│   │   └── render-strategy-registry.ts  # 最終刪除
│   └── types.ts                    # 擴充 RenderMapping 型別
├── languages/cpp/
│   ├── extractors/register.ts      # 最終刪除
│   ├── renderers/strategies.ts     # 最終刪除
│   └── **/*.json                   # 更新 renderMapping 加入 dynamicRules
└── ui/
    └── panels/blockly-panel.ts     # 改為序列化→PatternExtractor
```

## Implementation Phases

### Phase A: 定義 dynamicRules 型別和格式（基礎）

根據研究結果，現有動態積木的 extraState 使用以下 pattern：

| Pattern | 範例 | extraState 格式 |
|---------|------|----------------|
| 重複 expression input | func_call ARG_0..N | `{ argCount: N }` |
| 重複 field 組 | func_def TYPE_0/PARAM_0..N | `{ paramCount: N }` |
| 多模式 slot | scanf select/compose | `{ args: [{mode, text?}] }` |
| 多變數宣告 | var_declare NAME_0/INIT_0..N | `{ items: ['var','var_init',...] }` |
| if-elseif 鏈 | if + ELSEIF_COND_0..N | `{ elseifCount: N, hasElse: bool }` |
| 重複 expression slot | print EXPR_0..N | `{ itemCount: N }` |

**dynamicRules 格式設計**：

```typescript
interface DynamicRule {
  /** extraState 中取得數量的路徑，如 "argCount" 或 "args.length" */
  countSource: string
  /** 產生的語義 children slot 名稱 */
  childSlot: string
  /** 積木 input/field 名稱模式，{i} 為索引佔位符 */
  inputPattern?: string   // 如 "ARG_{i}" → 取 input_value
  fieldPattern?: string   // 如 "TYPE_{i}" → 取 field
  /** 多模式支援：extraState 路徑取得每個元素的模式 */
  modeSource?: string     // 如 "args[{i}].mode"
  modes?: Record<string, ModeExtractRule>
  /** 每個元素產生的子節點 concept（用於 field 組模式） */
  childConcept?: string   // 如 "param_decl"
  childFields?: Record<string, string>  // field pattern → property 映射
}

interface ModeExtractRule {
  /** 從 field 取值並包裝為指定 concept */
  field?: string          // extraState 路徑取值
  wrap?: string           // 包裝為此 concept
  /** 從 input 取值（expression 模式） */
  input?: string          // input pattern
}
```

### Phase B: PatternExtractor 擴充（P1 核心）

1. `extract()` 方法增加第四步：處理 `dynamicRules`
2. 讀取 `block.extraState`，根據 `countSource` 取得動態元素數量
3. 對每個動態元素：
   - 如果有 `inputPattern`：從 `block.inputs[resolved]` 提取子節點
   - 如果有 `fieldPattern`：從 `block.fields[resolved]` 提取屬性
   - 如果有 `modeSource`：從 extraState 讀取模式，按 `modes` 分別處理
   - 如果有 `childConcept` + `childFields`：組合多個 field 為一個子節點
4. 結果放入 `children[childSlot]`

### Phase C: PatternRenderer 擴充（雙向統一）

1. `render()` 方法增加 dynamicRules 處理
2. 根據 `childSlot` 讀取 SemanticNode 的 children
3. 反向建立：
   - `extraState` 中設定 count/mode 資訊
   - 建立動態 input/field（`ARG_0`、`TYPE_0` 等）
4. 移除 RenderStrategyRegistry 和所有手寫 renderStrategy

### Phase D: BlocklyPanel 統一（接入 PatternExtractor）

1. 移除 `extractBlockInner` 中的 BlockExtractorRegistry 查詢
2. 改為：`Blockly.serialization.blocks.save(block)` → `PatternExtractor.extract(blockState)`
3. 保留 `raw_code` fallback
4. 移除 `generateFromTemplate` fallback（PatternExtractor 已能處理所有有 concept 的積木）

### Phase E: 遷移所有手寫 extractor/strategy 為 JSON

逐一將 48 個 extractor 和 12 個 renderStrategy 轉為 blockSpec JSON 的 `renderMapping.dynamicRules`。按分類：
1. 靜態積木（~20 個）：只需確認 auto-derive 正確，不需 dynamicRules
2. 動態重複 input（func_call、print、forward_decl）：加 `inputPattern` 規則
3. 動態重複 field 組（func_def、var_declare、doc_comment）：加 `fieldPattern` + `childConcept` 規則
4. 多模式 slot（scanf、printf、input）：加 `modeSource` + `modes` 規則
5. if-elseif 鏈：特殊的巢狀規則
6. 驗證每個遷移後的 roundtrip 行為不變

### Phase F: 清理和刪除

1. 刪除 `src/languages/cpp/extractors/register.ts`
2. 刪除 `src/core/registry/block-extractor-registry.ts`
3. 刪除 `src/languages/cpp/renderers/strategies.ts`
4. 刪除 `src/core/registry/render-strategy-registry.ts`
5. 移除 `blockly-panel.ts` 中所有 BlockExtractorRegistry 引用
6. 移除 `pattern-renderer.ts` 中所有 RenderStrategyRegistry 引用
7. 驗證全部 2900+ 測試通過

## Risk Assessment

| 風險 | 可能性 | 影響 | 緩解 |
|------|--------|------|------|
| if-elseif 鏈邏輯太複雜無法用宣告式表達 | 中 | 高 | 設計遞迴/巢狀 dynamicRule；如果確實無法表達，保留此一特例的策略函式 |
| Blockly.serialization.blocks.save() 的 BlockState 與 PatternExtractor 的 BlockState 格式不完全相容 | 中 | 中 | 加一層薄轉換函式 |
| 多模式 slot 的 extraState 格式複雜 | 低 | 中 | 先處理 select/compose 兩種模式，未來模式可擴充 |
| 遷移過程中某些積木的 roundtrip 行為改變 | 中 | 高 | 每個積木遷移後立即跑 concept identity 測試 |

## Complexity Tracking

無 Constitution 違規。
