# Fuzz Test Report -- C++ Functions & I/O -- 2026-03-12

## 摘要
- 語言：C++
- 測試程式數量：10
- 成功執行：10
- Round-trip PASS：10（全部 P1 穩定）
- g++ 編譯 PASS：10
- Interpreter PASS：9
- Interpreter PARTIAL：1（#define 巨集展開缺失）
- COMPILE_FAIL：0
- SEMANTIC_DIFF：0
- ROUNDTRIP_DRIFT：0

## 測試重點
本次測試聚焦於函式定義、函式呼叫、回傳值、cout/cin 輸出、I/O 鏈接等概念的邊界情況：
- 函式呼叫其他函式（組合式）
- 遞迴函式
- 多參數函式
- cout 鏈接混合型別（int, string, endl）
- 回傳值用於表達式
- void 函式 vs 有回傳值函式
- `#define` 巨集常數
- 巢狀函式呼叫作為引數
- 全域變數搭配 void/value 函式
- bool 回傳型別函式

## 測試結果

| # | 程式 | 狀態 | 說明 |
|---|------|------|------|
| 1 | 函式呼叫函式 (sumOfSquares) | PASS | square() + sumOfSquares() 組合 |
| 2 | 遞迴冪次函式 (power) | PASS | 遞迴 base case + 遞迴呼叫 |
| 3 | void 函式 + 迴圈 (printLine) | PASS | void 函式內含 for 迴圈 |
| 4 | 巢狀函式呼叫作引數 (maxOfThree) | PASS | maxVal(maxVal(a,b), c) |
| 5 | 全域變數 + void/value 函式 (counter) | PASS | tick() 修改全域變數, getCount() 回傳 |
| 6 | 回傳值用於表達式 (sumRange) | PASS | sumRange(1,5) + sumRange(6,10) |
| 7 | #define 巨集常數 (collatzSteps) | PARTIAL | Roundtrip + g++ 編譯 PASS；直譯器缺少 #define 展開 |
| 8 | bool 函式 + 函式呼叫函式 (countEven) | PASS | isEven() 回傳 bool, countEven() 呼叫 isEven() |
| 9 | cout 鏈接混合型別 + 表達式 | PASS | 除法、取餘數結果直接 cout |
| 10 | 巢狀函式呼叫引數 (apply_twice) | PASS | apply_twice(apply_twice(1,2), 3) |

## 測試驗證方式
1. 每個程式先以 g++ -std=c++17 編譯並執行，記錄預期 stdout
2. 透過 Semorphe lifter 將 C++ 原始碼提升為語意樹
3. 透過 PatternRenderer 產生 C++ 程式碼（roundtrip 1）
4. 再次提升產生的程式碼並比對（roundtrip 2，P1 穩定性）
5. 編譯產生的程式碼並比對 stdout 輸出

## 發現的問題

### BUG: 直譯器缺少 #define 巨集展開
- **程式**: fuzz_007（collatzSteps + `#define LIMIT 100`）
- **症狀**: `RUNTIME_ERR_UNDECLARED_VAR: LIMIT`
- **分析**: lifter 正確將 `#define LIMIT 100` 提升為 `cpp_define` 語意節點，code generator 也正確產生 `#define LIMIT 100`，g++ 編譯執行正確。但 SemanticInterpreter 不認識 `cpp_define`，不會將巨集名稱注入 scope，導致 `LIMIT` 變成未宣告變數。
- **影響**: 僅影響直譯器執行，不影響 lift/roundtrip/g++ 編譯
- **分類**: PARTIAL PASS（roundtrip stable，interpreter skip）

## 已知限制
- 本次測試未涵蓋函式多載（overloading）
- 未測試 `char` 回傳型別（已知問題，見 control-flow 報告）
- 未測試 `string` 型別參數或回傳值
- 未測試 `cin` 輸入（需確定性輸出）

## 產生的迴歸測試
- `tests/integration/fuzz-cpp-functions-io.test.ts`（19 PASS 測試 + 2 skipped）
