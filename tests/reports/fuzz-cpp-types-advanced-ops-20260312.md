# 模糊測試報告 — C++ 型別系統與進階運算 — 2026-03-12

## 摘要
- 語言：C++
- 產生的程式數：10
- 原始程式全部編譯通過：10
- Round-trip PASS：7
- ROUNDTRIP_DRIFT：2
- SEMANTIC_DIFF：1

## 測試覆蓋範圍
| 編號 | 描述 | 狀態 |
|------|------|------|
| types_adv_001 | 三元運算子巢狀與表達式中使用 | PASS |
| types_adv_002 | C 風格型別轉換 (int/double/char) | PASS |
| types_adv_003 | 前置/後置 increment/decrement 在表達式中 | ROUNDTRIP_DRIFT |
| types_adv_004 | 複合賦值運算 (+=, -=, *=, /=, %=) | PASS |
| types_adv_005 | sizeof 對各種型別與表達式 | PASS |
| types_adv_006 | enum 顯式值、enum 在 switch 中 | SEMANTIC_DIFF |
| types_adv_007 | typedef 與 using 型別別名 | PASS |
| types_adv_008 | 位元反轉 (~) 對整數 | PASS |
| types_adv_009 | 混合：三元 + 型別轉換 + increment + 複合賦值 | ROUNDTRIP_DRIFT |
| types_adv_010 | 混合：enum + 三元 + 型別轉換 + 複合賦值 + 位元反轉 | PASS |

## 已知限制

### ROUNDTRIP_DRIFT: increment/decrement 在變數初始化中（003, 009）
- **問題**：`int b = ++a;` 產出 `int b =     ++a;\n;`，多出空行與分號
- **原因**：increment 表達式在變數初始化的 RHS 語境中，lifter 將其拆分為獨立的 increment statement + 變數宣告，導致程式碼格式異常
- **影響**：第二次 round-trip 時進一步惡化，但第一次產出仍可編譯
- **範疇**：需改進 increment/decrement 在 initializer context 中的 lift 策略

### SEMANTIC_DIFF: enum 顯式值遺失（006）
- **問題**：`enum Fruit { APPLE = 10, BANANA = 20, CHERRY = 30 }` → `enum Fruit { APPLE, BANANA, CHERRY }`
- **原因**：enum lifter 未保留 enumerator 的顯式值（`= 10` 等），僅記錄名稱
- **影響**：`BANANA` 的值從 `20` 變為 `1`，語義不同
- **範疇**：需擴充 enum lifter/renderer 支援顯式值

## 直譯器限制（非 roundtrip 問題）

以下為直譯器執行層面的限制，不影響 lift/render roundtrip 正確性：
- **char 轉型顯示**：`(char)65` 直譯器輸出 `65` 而非 `A`（未實作 int→char 顯示轉換）
- **sizeof 陣列元素計數**：`sizeof(arr)/sizeof(arr[0])` 直譯器回傳 `1`（無真實記憶體模型）
- **enum 常數解析**：`Direction dir = SOUTH` 直譯器無法解析 enum 常數為變數值（SOUTH 被視為未宣告變數）

## 產生的回歸測試
- `tests/integration/fuzz-cpp-types-advanced-ops.test.ts`（13 個 PASS 測試 + 6 個 todo + 7 個 skipped）
