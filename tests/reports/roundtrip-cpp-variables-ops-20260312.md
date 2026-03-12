# Round-Trip 測試報告：C++ Variables & Operators

日期：2026-03-12
Branch：036-cpp-variables-ops

## 測試範圍

12 個概念：number_literal, string_literal, cpp_char_literal, builtin_constant, var_ref, var_declare, var_assign, arithmetic, compare, logic, logic_not, negate

## 語義管線結果（lift → generate → re-lift → re-generate）

| # | 程式 | 結果 | 節點數 | 細節 |
|---|------|------|--------|------|
| 1 | t01_number_literal | ✅ PASS | 16 | 乾淨語義樹，二次穩定 |
| 2 | t02_string_literal | ✅ PASS | 12 | 乾淨語義樹，二次穩定 |
| 3 | t03_builtin_constant | ✅ PASS | 21 | 乾淨語義樹，二次穩定 |
| 4 | t04_variables | ✅ PASS | 22 | 乾淨語義樹，二次穩定 |
| 5 | t05_arithmetic | ✅ PASS | 35 | 乾淨語義樹，二次穩定 |
| 6 | t06_compare | ✅ PASS | 50 | 乾淨語義樹，二次穩定 |
| 7 | t07_logic | ✅ PASS | 38 | 乾淨語義樹，二次穩定 |
| 8 | t08_negate | ✅ PASS | 18 | 乾淨語義樹，二次穩定 |
| 9 | t09_combined | ✅ PASS | 49 | 乾淨語義樹，二次穩定 |
| 10 | t10_precedence | ✅ PASS | 24 | 乾淨語義樹，二次穩定 |

## Stdout 等價性驗證（g++ 編譯執行）

| # | 程式 | 結果 |
|---|------|------|
| 1 | t01_number_literal | ✅ stdout 匹配 |
| 2 | t02_string_literal | ✅ stdout 匹配 |
| 3 | t03_string_literal | ✅ stdout 匹配 |
| 4 | t04_variables | ✅ stdout 匹配 |
| 5 | t05_arithmetic | ✅ stdout 匹配 |
| 6 | t06_compare | ✅ stdout 匹配 |
| 7 | t07_logic | ✅ stdout 匹配 |
| 8 | t08_negate | ✅ stdout 匹配 |
| 9 | t09_combined | ✅ stdout 匹配 |
| 10 | t10_precedence | ✅ stdout 匹配 |

## 修復項目

1. **cpp_char_literal generator** — 新增於 `src/languages/cpp/core/generators/expressions.ts`
2. **cpp_char_literal executor** — 新增於 `src/interpreter/executors/literals.ts`
3. **cpp_auto_declare executor 型別錯誤** — `0` → `{ type: 'int', value: 0 }` (pre-existing bug)

## Vitest 測試覆蓋

新增 `tests/integration/roundtrip-variables-ops.test.ts`（50+ 個測試案例）

## 摘要

- 管線結果：**10/10 PASS**
- Stdout 比較：**10/10 匹配**
- 降級節點：**0**
- P1 違規（roundtrip drift）：**0**
