# Feature Specification: 統一積木提取器架構

**Feature Branch**: `048-unify-extractor`
**Created**: 2026-03-16
**Status**: Draft
**Input**: 消除 BlockExtractorRegistry 和 PatternExtractor 的雙重路徑問題，讓所有積木走同一條提取路徑，用宣告式規則處理動態結構。

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 靜態積木的積木→語義樹路徑與測試一致 (Priority: P1)

開發者修了 `PatternExtractor` 的 input 映射（如 `VALUE → initializer`），測試全部通過。但使用者在 UI 上操作積木時，`const int limit = max + 1` 的初始值仍然遺失——因為 UI 走的是另一條完全不同的提取路徑（BlockExtractorRegistry），修復根本沒生效。開發者期望修一次就修好，不需要在兩個系統中各修一次。

**Why this priority**: 這是本次重構的核心動機。測試和實際行為的路徑不一致，導致測試無法保障產品品質——修了測試過了但 app 壞了。

**Independent Test**: 修改 `PatternExtractor` 的映射規則後，UI 上的積木提取行為立即反映修改，不需要額外的手寫 extractor。

**Acceptance Scenarios**:

1. **Given** 一個沒有自訂 extractor 的靜態積木（如 `c_const_declare`）, **When** 使用者在 UI 上修改該積木的 VALUE input 並觸發積木→程式碼同步, **Then** 語義樹中的 `cpp_const_declare` 節點包含正確的 `initializer` children
2. **Given** 開發者修改了 `PatternExtractor` 的映射規則, **When** 同時執行測試和 UI 操作, **Then** 兩者的提取結果完全一致
3. **Given** 一個新增的 BlockSpec（只有 JSON 定義，沒有手寫 extractor）, **When** 使用者在 UI 上操作該積木, **Then** 積木能被正確提取為對應的語義節點，不會降級為 raw_code

---

### User Story 2 — 動態積木用宣告式規則描述提取邏輯 (Priority: P2)

概念開發者想新增一個帶有動態參數的積木（如自訂函式呼叫、可變數量的輸入值）。目前必須在 `extractors/register.ts` 中手寫 TypeScript extractor 函式。開發者希望只需要在 BlockSpec 的 `renderMapping` JSON 中宣告動態規則，不需要寫任何 TypeScript 程式碼。

**Why this priority**: 手寫 extractor 是擴充的瓶頸——每新增一個動態積木就要寫 TypeScript 並理解 Blockly 的 API。宣告式規則降低擴充門檻，也讓積木的提取邏輯可被檢視和測試。

**Independent Test**: 用 JSON 宣告一個動態規則，PatternExtractor 能根據 extraState 正確提取動態數量的子節點。

**Acceptance Scenarios**:

1. **Given** 一個 BlockSpec 定義了 `dynamicRules`（描述動態重複的 input pattern）, **When** 積木有 3 個動態 input（ARG_0, ARG_1, ARG_2）, **Then** PatternExtractor 讀取 extraState 並正確提取 3 個子節點
2. **Given** 一個動態積木的 extraState 中有多模式參數（select/input/expression）, **When** 某個參數在 select 模式、另一個在 expression 模式, **Then** PatternExtractor 根據 dynamicRules 中的模式宣告分別提取 dropdown 值或 input 子節點
3. **Given** 一個新的動態積木 pattern（未來可能出現的新模式）, **When** 開發者在 dynamicRules 中定義新的提取策略, **Then** PatternExtractor 能識別並處理該策略，不需要修改引擎程式碼

---

### User Story 3 — 刪除 BlockExtractorRegistry 及所有手寫 extractor (Priority: P3)

維護者希望消除程式碼庫中的雙重提取系統。所有現有的手寫 extractor（約 30 個）都應被等價的 JSON 宣告取代，`BlockExtractorRegistry` 和 `extractors/register.ts` 整個刪除。

**Why this priority**: 這是最終清理步驟，依賴 US1 和 US2 完成。在靜態和動態積木都能被 PatternExtractor 處理後，手寫 extractor 變成冗餘程式碼。

**Independent Test**: 刪除所有手寫 extractor 後，全部既有測試通過，UI 上所有積木的提取行為不變。

**Acceptance Scenarios**:

1. **Given** 所有手寫 extractor 已被轉為 JSON 宣告, **When** `extractors/register.ts` 和 `BlockExtractorRegistry` 被刪除, **Then** 所有既有測試通過且 UI 行為不變
2. **Given** 刪除後的程式碼庫, **When** 搜尋 `BlockExtractorRegistry`, **Then** 沒有任何引用

---

### Edge Cases

- 積木的 `extraState` 為 null 或格式不符預期時，dynamicRules 應安全降級（不當機，產生空的子節點陣列）
- 積木有 extraState 但沒有對應的 dynamicRules 時，忽略 extraState 中的動態結構
- 同一個積木同時有靜態 input 和動態 input（如 func_def 有固定的 RETURN_TYPE field + 動態的 PARAM_TYPE_i/PARAM_NAME_i fields），兩者需要共存
- dynamicRules 中的 inputPattern 或 fieldPattern 使用 `{i}` 佔位符，如果 extraState 報告 0 個動態元素，應產生空陣列而非錯誤
- 反向路徑（SemanticNode → BlockState render）也應使用同一套 dynamicRules，確保 render 和 extract 使用同一個真相來源
- 未來可能出現的新動態模式：不只是「重複 input」和「多模式選擇」，可能有巢狀動態結構、條件式 input 等

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: BlocklyPanel MUST 將 Blockly.Block 序列化為 BlockState 後交給 PatternExtractor 提取語義節點
- **FR-002**: PatternExtractor MUST 能處理靜態積木的提取（fields → properties、inputs → children），使用 deriveRenderMapping 或顯式 renderMapping
- **FR-003**: PatternExtractor MUST 能處理動態積木的提取，透過讀取 BlockState 的 `extraState` 並根據 `renderMapping.dynamicRules` 中的宣告式規則產生對應的子節點
- **FR-004**: `dynamicRules` 的描述格式 MUST 支援至少三種 pattern：動態重複 input、動態重複 field 組、多模式 input
- **FR-005**: `dynamicRules` MUST 是可擴充的——新增一種 pattern 只需要定義新的提取策略名稱和對應的處理邏輯，不需要修改核心引擎的結構
- **FR-006**: PatternExtractor 的提取結果 MUST 與現有手寫 extractor 的結果完全等價——所有既有測試不需修改即可通過
- **FR-007**: 同一個 BlockSpec 的 renderMapping MUST 同時用於正向（render: SemanticNode → BlockState）和反向（extract: BlockState → SemanticNode），確保單一真相來源
- **FR-008**: 當 PatternExtractor 無法識別一個積木類型時，MUST 降級為 `raw_code` 節點（保留現有 fallback 行為）
- **FR-009**: 所有現有的手寫 extractor MUST 被轉為等價的 JSON renderMapping 宣告（包含 dynamicRules），最終刪除 `BlockExtractorRegistry` 和 `extractors/register.ts`
- **FR-010**: 測試路徑和 UI 路徑 MUST 使用完全相同的 PatternExtractor 實例和映射規則

### Key Entities

- **PatternExtractor**: 統一的積木→語義節點提取引擎，讀取 BlockState 並根據 renderMapping（含 dynamicRules）產生 SemanticNode
- **BlockState**: Blockly 積木的序列化 JSON 表示（fields、inputs、extraState），作為 PatternExtractor 的統一輸入格式
- **renderMapping**: BlockSpec 中的映射宣告，描述積木欄位/輸入和語義屬性/子節點的對應關係
- **dynamicRules**: renderMapping 的擴充欄位，描述依賴 extraState 的動態結構提取規則

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 積木→語義樹的提取路徑從 2 條（BlockExtractorRegistry + PatternExtractor）減少為 1 條（PatternExtractor），消除測試與 UI 行為不一致的風險
- **SC-002**: 所有 170+ 個 BlockSpec 都能被 PatternExtractor 正確提取，不需要任何手寫 TypeScript extractor
- **SC-003**: 新增一個靜態積木只需要 JSON 定義（blockDef + concept + renderMapping），不需要寫任何 TypeScript 程式碼即可完成 lift → render → extract → generate 四路完備
- **SC-004**: 新增一個動態積木只需要在 renderMapping 中加入 dynamicRules JSON 宣告，不需要寫 TypeScript extractor
- **SC-005**: `BlockExtractorRegistry` 和 `extractors/register.ts` 被完全刪除，程式碼庫中不存在任何手寫 extractor
- **SC-006**: 所有既有測試（2900+ 個）在重構後不需修改即可通過

## Assumptions

- Blockly 的 `saveExtraState()` / `Blockly.serialization.blocks.save()` 能完整捕捉動態積木的所有狀態到 BlockState JSON 中
- 現有的 ~30 個手寫 extractor 的邏輯都可以用宣告式 dynamicRules 表達，沒有需要任意 TypeScript 邏輯的特殊情況
- PatternRenderer（正向 render）已經能處理動態結構，其邏輯可以作為 dynamicRules 設計的參考
- 重構期間可以暫時保留 BlockExtractorRegistry 作為 fallback，逐步遷移後再刪除

## Scope Boundaries

**包含**:
- PatternExtractor 擴充支援 extraState 和 dynamicRules
- BlocklyPanel 改為序列化→PatternExtractor 路徑
- 所有手寫 extractor 轉為 JSON 宣告
- 刪除 BlockExtractorRegistry
- renderMapping 的 dynamicRules 格式設計（可擴充）

**不包含**:
- PatternRenderer 的重構（正向 render 已經獨立運作，不在此次範圍）
- 新增積木概念（此次只統一提取架構）
- 跨語言支援（目前只有 C++，但設計應語言無關）
- Blockly mutator 的重新設計（保留現有 mutator 實作，只統一提取路徑）
