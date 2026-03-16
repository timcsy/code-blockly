# Research: 統一積木提取器架構

## R1: 現有雙重系統的完整盤點

**Decision**: 系統有 48 個手寫 extractor + 12 個手寫 renderStrategy，分為靜態（~20 個，可被 auto-derive 取代）和動態（~28+12 個，需要 dynamicRules）。

**Rationale**: 完整盤點後確認所有動態邏輯都屬於 5 種 pattern（重複 input、重複 field 組、多模式 slot、多變數宣告、if-elseif 鏈）。

**Alternatives considered**: 保留部分手寫 extractor 給最複雜的積木（if-elseif）— 但 spec clarification 決定完全統一。

## R2: Blockly 序列化 API 相容性

**Decision**: `Blockly.serialization.blocks.save()` 產生的 JSON 與 PatternExtractor 的 BlockState 接口**大致相容**，但需要一層薄轉換。

**Rationale**: Blockly 序列化的 inputs 格式是 `{ "COND": { "block": {...} } }`，與 BlockState 的 `inputs: Record<string, { block: BlockState }>` 一致。但 fields 格式不同：Blockly 用 `{ "TYPE": "int" }` 而 BlockState 也用相同格式。extraState 直接對應。

**Alternatives considered**: 讓 PatternExtractor 直接操作 Blockly.Block — 但這會引入對 Blockly API 的耦合。

## R3: dynamicRules 的可擴充性設計

**Decision**: dynamicRules 是陣列，每個元素描述一個動態 pattern。新增 pattern 只需加新元素。核心引擎根據 `countSource` 和 `inputPattern`/`fieldPattern`/`modeSource` 的有無自動選擇處理邏輯。

**Rationale**: 陣列格式比單一物件更靈活——同一個積木可以有多個獨立的動態維度（如 func_def 有動態參數 + 固定的 RETURN_TYPE）。

**Alternatives considered**: 用策略名稱（如 `"type": "repeat-input"`, `"type": "multi-mode"`）— 但這要求引擎預先知道所有策略類型，違反 P3 開放擴充。

## R4: if-elseif 鏈的處理方案

**Decision**: if-elseif 使用特殊的 `flattenElseIf` 規則，透過 `childSlot: "else_body"` 遞迴展開。extract 時讀取 `extraState.elseifCount` 建立 ELSEIF_CONDITION_i + ELSEIF_THEN_i；render 時從巢狀的 if 結構中攤平。

**Rationale**: if-elseif 是唯一需要「樹→扁平列表」轉換的 pattern。其他所有動態 pattern 都是「列表→列表」映射。

**Alternatives considered**: 保留 if-elseif 的手寫 strategy — 但違反「全統一」的設計目標。
