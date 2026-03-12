# 模糊測試報告 — C++ Types & Advanced Ops — 2026-03-13

## 摘要
- 語言：C++
- 範疇：types, advanced operators (easy)
- 產生的程式數：10
- 成功執行：10
- Round-trip PASS：10 (修復後)
- SEMANTIC_DIFF（bug）：1 (已修復)
- COMPILE_FAIL（bug）：0
- LIFT_FAIL（限制）：0
- EXPECTED_DEGRADATION：0

## 發現的 Bug

### Bug 1：enum 帶自訂值在 lift→generate 後遺失值（已修復）

- **輸入**：
```cpp
enum Status { OK = 200, NOT_FOUND = 404, ERROR = 500 };
enum Level { LOW = -1, MEDIUM = 0, HIGH = 1 };
enum Bits { A = 1, B = 2, C = 4, D = 8 };
```
- **預期輸出**：保留自訂值 `OK = 200, NOT_FOUND = 404, ERROR = 500`
- **實際輸出**：丟失值，變成 `OK, NOT_FOUND, ERROR`（預設 0, 1, 2）
- **根本原因**：`src/languages/cpp/core/lifters/strategies.ts` 的 `cpp:liftEnum` strategy 只使用 `e.namedChildren[0]?.text` 取得 enumerator 名稱，忽略了 `value` field
- **修復**：改用 `e.childForFieldName('name')` 和 `e.childForFieldName('value')` 分別提取名稱和值，組合為 `NAME = VALUE` 格式

## 覆蓋缺口
無 — 所有 10 個程式的概念都已完整支援

## 產生的回歸測試
- `tests/integration/fuzz-cpp-types-ops.test.ts` — 10 個 round-trip 回歸測試

## 待修復 Bug
無 — 所有發現的 bug 都已修復
