# 模糊測試報告 — C++ Variables & Operators — 2026-03-12

## 摘要
- 語言：C++
- 產生的程式數：10
- 成功執行：10
- Round-trip PASS：6
- SEMANTIC_DIFF（已修復）：1
- COMPILE_FAIL（Phase 3 I/O scope）：2
- ROUNDTRIP_DRIFT（Phase 2 scope）：1

## 發現並修復的 Bug

### Bug 1：雙重取負 `-(-a)` → `--a`（已修復）
- **程式**：vars_ops_007
- **原始碼**：`int d = -(-a);`
- **錯誤輸出**：`int d = --a;`（pre-decrement，語義不同）
- **修復**：在 negate generator 中偵測嵌套 negate/deref/address-of，加入括號保護
- **修復位置**：`src/languages/cpp/core/generators/expressions.ts`

## 已知限制（非 Phase 1 scope）

### COMPILE_FAIL: cout 鏈中的括號遺失
- **程式**：vars_ops_005, vars_ops_009
- `cout << (a && b)` → 括號被移除 → `cout << a && b << endl` 編譯失敗
- **範疇**：Phase 3 I/O 概念的 cout chain lifter

### ROUNDTRIP_DRIFT: 變數初始化中的 increment 表達式
- **程式**：vars_ops_008
- `int b = a++;` 的 post-increment 在初始化語境中處理有問題
- **範疇**：Phase 2 控制流概念

## 產生的回歸測試
- `tests/integration/fuzz-cpp-variables-ops.test.ts`（12 個 PASS 測試 + 3 個 todo）
