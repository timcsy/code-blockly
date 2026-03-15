# 概念審計報告（C++）— 2026-03-15

## 總覽

| 項目 | 數值 |
|------|------|
| 已註冊概念 | 157 |
| 五路完整（5/5） | 86（54.8%） |
| 部分實作（1-4/5） | 71（45.2%） |
| 死概念（0/5） | 0（0.0%） |
| 信心合規 | ❌ FAIL |
| 雙重註冊 | 2（vector 模組） |
| Render 缺失 renderMapping | 108/155 |

---

## A1. 四路完備性矩陣

### 統計

- 完整（5/5）：86 個（54.8%）
- 部分（1-4/5）：71 個（45.2%）
- 死概念（0/5）：0 個（0.0%）

### 缺失路徑摘要

| 路徑 | 缺失數 | 概念 |
|------|--------|------|
| **Lift** | 31 | cpp:vector_push_back, cpp:vector_size, cpp_ifdef, cpp_ifndef, cpp_ifstream_declare, cpp_ofstream_declare, cpp_raw_code, cpp_stringstream_declare, cpp_compound_assign_expr, cpp_free, cpp_increment_expr, cpp_malloc, cpp_map_access, cpp_map_empty, cpp_method_call, cpp_pointer_declare, cpp_queue_empty, cpp_queue_pop, cpp_queue_push, cpp_scanf_expr, cpp_set_count, cpp_set_empty, cpp_set_erase, cpp_stack_empty, cpp_string_clear, cpp_string_declare, cpp_string_empty, cpp_string_push_back, cpp_struct_member_access, cpp_struct_pointer_access, var_declare_expr |
| **Render** | 2 | cpp:vector_push_back, cpp:vector_size |
| **Generate** | 13 | cpp:vector_push_back, cpp:vector_size, cpp_ifdef, cpp_ifndef, cpp_raw_code, block_comment, comment, cpp_isalpha, cpp_isdigit, cpp_raw_expression, cpp_tolower, cpp_toupper, doc_comment |
| **Execute** | 40 | cpp:vector_push_back, cpp:vector_size, cpp_ifdef, cpp_ifndef, cpp_ifstream_declare, cpp_ofstream_declare, cpp_raw_code, cpp_stringstream_declare, block_comment, comment, cpp_case, cpp_isalpha, cpp_isdigit, cpp_raw_expression, cpp_tolower, cpp_toupper, doc_comment, cpp_abs, cpp_accumulate, cpp_atof, cpp_atoi, cpp_define, cpp_exit, cpp_fill, cpp_gcd, cpp_include, cpp_include_local, cpp_iota, cpp_lcm, cpp_make_pair, cpp_max, cpp_min, cpp_pair_declare, cpp_partial_sum, cpp_rand, cpp_reverse, cpp_sort, cpp_srand, cpp_swap, cpp_using_namespace |
| **Test** | 12 | cpp_ifstream_declare, cpp_ofstream_declare, cpp_stringstream_declare, cpp_case, cpp_cast, cpp_default, cpp_memcpy, cpp_memset, cpp_pointer_assign, cpp_strcat, cpp_strncmp, cpp_strncpy |

### 1/5 分數（最差）

| 概念 | 來源 | Lift | Render | Generate | Execute | Test |
|------|------|------|--------|----------|---------|------|
| cpp:vector_push_back | std/vector | ❌ | ❌ | ❌ | ❌ | ✅ |
| cpp:vector_size | std/vector | ❌ | ❌ | ❌ | ❌ | ✅ |

### 2/5 分數

| 概念 | 來源 | Lift | Render | Generate | Execute | Test |
|------|------|------|--------|----------|---------|------|
| cpp_ifdef | core | ❌ | ✅ | ❌ | ❌ | ✅ |
| cpp_ifndef | core | ❌ | ✅ | ❌ | ❌ | ✅ |
| cpp_ifstream_declare | std/fstream | ❌ | ✅ | ✅ | ❌ | ❌ |
| cpp_ofstream_declare | std/fstream | ❌ | ✅ | ✅ | ❌ | ❌ |
| cpp_raw_code | core | ❌ | ✅ | ❌ | ❌ | ✅ |
| cpp_stringstream_declare | std/sstream | ❌ | ✅ | ✅ | ❌ | ❌ |

### 3/5 分數

| 概念 | 來源 | Lift | Render | Generate | Execute | Test |
|------|------|------|--------|----------|---------|------|
| block_comment | core | ✅ | ✅ | ❌ | ❌ | ✅ |
| comment | core | ✅ | ✅ | ❌ | ❌ | ✅ |
| cpp_case | core | ✅ | ✅ | ✅ | ❌ | ❌ |
| cpp_isalpha | std/cctype | ✅ | ✅ | ❌ | ❌ | ✅ |
| cpp_isdigit | std/cctype | ✅ | ✅ | ❌ | ❌ | ✅ |
| cpp_raw_expression | core | ✅ | ✅ | ❌ | ❌ | ✅ |
| cpp_tolower | std/cctype | ✅ | ✅ | ❌ | ❌ | ✅ |
| cpp_toupper | std/cctype | ✅ | ✅ | ❌ | ❌ | ✅ |
| doc_comment | core | ✅ | ✅ | ❌ | ❌ | ✅ |

### 4/5 分數（54 個概念）

省略完整列表。最常見的缺失模式：
- 缺 Execute：40 個（大多為 STD 函式和宣告性概念）
- 缺 Lift：31 個（大多為 STD 容器方法和表達式版本概念）
- 缺 Test：12 個（大多為 cstring 函式和 core 語法）

---

## A2. 信心等級合規報告

### 結果：❌ FAIL

| 檢查項 | 狀態 | 詳情 |
|--------|------|------|
| `warning` 使用 | ❌ 從未使用 | 0 處設定 warning — 所有 pattern 直接設 high |
| composite 語義驗證 | ❌ 缺失 | `cpp_count_for` composite pattern 僅做結構匹配，無語義驗證即設 high |
| 一對多映射 warning | ❌ 缺失 | 5 個一對多映射全部設 high |
| raw_code 降級 | ✅ 部分合規 | 核心 lifter 有 4 處 fallback；STD lifter 回傳 null 由核心處理 |

### 一對多映射（無 warning）

1. **`binary_expression`**：arithmetic/compare/logic（priority 5）+ print/input chain（priority 15）
2. **`identifier`**：var_ref（priority 0）+ endl/builtin_constant（priority 5）
3. **`comment`**：comment + doc_comment + block_comment（各 priority 0）
4. **`pointer_expression`**：cpp_address_of + cpp_pointer_deref（各 priority 5）
5. **`unary_expression`**：cpp_unary_not + cpp_unary_negate（各 priority 5）

### composite pattern 問題

`cpp_count_for` composite pattern（`lift-patterns.json:176-194`）：
- `matchComposite`（`pattern-lifter.ts:281-354`）只做 AST 結構匹配
- 不驗證迴圈變數是否在條件/body 中使用
- 不驗證 from/to 表達式合理性
- 直接設 `high` confidence

---

## A3. 雙重註冊報告

### 概念命名雙重註冊（HIGH severity）

| 舊名 | 新名 | 模組 | 影響 |
|------|------|------|------|
| `cpp_vector_push_back` | `cpp:vector_push_back` | std/vector | 同模組兩筆，abstract concept 不同 |
| `cpp_vector_size` | `cpp:vector_size` | std/vector | 同模組兩筆，abstract concept 不同 |

`cpp_vector_push_back`（5/5 完整）和 `cpp:vector_push_back`（1/5 幾乎死）共存。後者是冗餘的。

### 命名不一致

- **冒號 vs 底線前綴**：大部分概念用 `cpp_xxx`，但 cmath 用 `cpp:math_xxx`、vector 部分用 `cpp:vector_xxx`
- **無前綴核心概念**：`bitwise_not`、`forward_decl`、`builtin_constant`、`comment`、`doc_comment`、`block_comment` — 這些可能是有意的通用概念

### JSON pattern ↔ hand-written lifter 重疊

15 個重疊，全部為 **FALLBACK** 模式（JSON pattern 使用 `liftStrategy` 委派給 hand-written 函式）。這是安全的設計模式。

---

## A4. Render 一致性報告

### 結果

| 項目 | 數值 |
|------|------|
| 總 BlockSpec | 155 |
| 有 renderMapping | 47（30%） |
| 無 renderMapping | 108（70%） |
| 有 explicit renderStrategy | 5 |
| i18n 合規（%{BKY_...}） | 149/150（99.3%） |
| expressionCounterpart 配對 | 3 |

### 缺 renderMapping 的影響

108 個 BlockSpec 缺少 renderMapping，這些積木依賴 PatternRenderer 的 auto-derive fallback。auto-derive 從 blockDef 的 args 推導映射，**多數情況下可正常運作**，但若 JSON 欄位名稱與語義樹屬性名不匹配，會在積木風格切換時暴露問題。

---

## 建議修復優先順序

### P0 — 立即修復

1. **移除 vector 雙重註冊**：刪除 `cpp:vector_push_back` 和 `cpp:vector_size`（1/5 的那組），保留 `cpp_vector_push_back` 和 `cpp_vector_size`（5/5）
2. **補齊 Execute 路徑**：40 個概念缺 executor。宣告性概念（include、using_namespace、define、comment 等）需 noop executor；STD 函式需實作計算邏輯

### P1 — 高優先

3. **補齊 Lift 路徑**：31 個概念缺 lifter。大多為 STD 容器方法（已有 generator 但缺 lifter 導致 lift 斷裂）
4. **補齊 Generate 路徑**：13 個概念缺 generator（comment、cctype、raw_code 等）
5. **信心等級修復**：在 composite pattern 加入語義驗證；在一對多映射加入 warning

### P2 — 中優先

6. **補齊 Test 路徑**：12 個概念缺測試
7. **renderMapping 補齊**：108 個 BlockSpec 缺 renderMapping（auto-derive 多數可用，但顯式定義更安全）

### P3 — 低優先

8. **命名一致性**：統一 `cpp_` vs `cpp:` 前綴風格
9. **ifdef/ifndef 完整化**：目前只有 Render + Test，需補 Lift、Generate、Execute
