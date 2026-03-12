# Round-Trip 測試報告 — C++ Type System & Advanced Ops — 2026-03-12

## 摘要
- 語言：C++
- 測試程式數：10
- PASS：9
- ROUNDTRIP_DRIFT：1（bitwise.cpp）
- RAW_NODES：0
- STDOUT 比對：9/10 一致（bitwise_gen.cpp 編譯失敗）

## 測試涵蓋概念
cpp_ternary, cpp_cast, bitwise_not, cpp_increment, cpp_compound_assign, cpp_sizeof, cpp_enum, cpp_typedef, cpp_using_alias, arithmetic（含 &, |, ^, <<, >> 位元運算子）

## 測試程式清單

| # | 檔案 | 描述 | P1 穩定 | Raw 節點 | Stdout |
|---|------|------|---------|----------|--------|
| 1 | ternary.cpp | 三元運算子搭配比較、算術 | PASS | 0 | MATCH |
| 2 | cast.cpp | C-style cast（int, double, char） | PASS | 0 | MATCH |
| 3 | bitwise.cpp | 位元 NOT, AND, OR, XOR, shift | DRIFT | 0 | COMPILE_FAIL* |
| 4 | increment.cpp | 前綴/後綴 ++/-- | PASS | 0 | MATCH |
| 5 | compound_assign.cpp | +=, -=, *=, /=, %= | PASS | 0 | MATCH |
| 6 | sizeof_test.cpp | sizeof 型別與變數 | PASS | 0 | MATCH |
| 7 | enum_test.cpp | enum 宣告與使用 | PASS | 0 | MATCH |
| 8 | typedef_using.cpp | typedef 與 using alias | PASS | 0 | MATCH |
| 9 | mixed_ops.cpp | 混合三元、遞增、複合指定 | PASS | 0 | MATCH |
| 10 | complex_types.cpp | enum + typedef + sizeof + cast 混合 | PASS | 0 | MATCH |

## 測試流程
1. 編譯並執行原始 .cpp 檔案，記錄預期 stdout
2. 透過 runner（lift -> generate）產生 _gen.cpp
3. 對 _gen.cpp 再做一次 lift -> generate（P1 雙重 roundtrip 檢查）
4. 編譯並執行 _gen.cpp，比對 stdout 與原始程式一致

## 已知限制
- **bitwise.cpp P1 DRIFT**：位元運算子（`&`, `|`, `^`, `<<`, `>>`）在 `cout <<` 表達式中遺失括號。原始碼 `cout << (a & b) << endl;` 被 lift 正確但 generate 時缺少外層括號，產生 `cout << a & b << endl;`，造成運算子優先順序錯誤導致編譯失敗。第二次 roundtrip 時 tree-sitter 解析已損壞的程式碼，產生完全不同的結果。
  - 根本原因：arithmetic 概念的 renderer 未根據上下文（如在 `<<` 運算子的 operand 位置）自動加括號
  - 位元 NOT（`~`）不受影響，因為它是一元運算子
  - 若位元運算結果先存入變數再 cout，則不受此問題影響

## 產生的回歸測試
- `tests/integration/roundtrip-types-advanced-ops.test.ts`
