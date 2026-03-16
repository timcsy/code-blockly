# Data Model: 統一積木提取器架構

## 影響的實體

### RenderMapping（擴充）

| 欄位 | 現行 | 新增 |
|------|------|------|
| `fields` | `Record<string, string>` | 不變 |
| `inputs` | `Record<string, string>` | 不變 |
| `statementInputs` | `Record<string, string>` | 不變 |
| `dynamicInputs` | `{ pattern, childSlot }` | 移除（被 dynamicRules 取代） |
| `strategy` | `string` | 移除（被 dynamicRules 取代） |
| `expressionCounterpart` | `string` | 不變 |
| **`dynamicRules`** | — | **新增：`DynamicRule[]`** |

### DynamicRule（新增）

```
DynamicRule {
  countSource: string          // extraState 中的數量路徑
  childSlot: string            // 產生的 children slot 名稱
  inputPattern?: string        // input 名稱模式 (ARG_{i})
  fieldPattern?: string        // field 名稱模式 (TYPE_{i})
  modeSource?: string          // extraState 中每個元素的模式路徑
  modes?: Record<string, ModeExtractRule>  // 模式→提取規則
  childConcept?: string        // 每個元素建立的子節點 concept
  childFields?: Record<string, string>     // field pattern → property
}
```

### ModeExtractRule（新增）

```
ModeExtractRule {
  field?: string               // 從 extraState 取值的路徑
  wrap?: string                // 包裝為指定 concept
  input?: string               // 從 block input 提取
}
```

### 刪除的實體

| 實體 | 原因 |
|------|------|
| `BlockExtractorRegistry` | 被 PatternExtractor + dynamicRules 取代 |
| `BlockExtractContext` | 同上 |
| `RenderStrategyRegistry` | 被 PatternRenderer + dynamicRules 取代 |
| `extractors/register.ts` | 所有 extractor 轉為 JSON dynamicRules |
| `renderers/strategies.ts` | 所有 strategy 轉為 JSON dynamicRules |
