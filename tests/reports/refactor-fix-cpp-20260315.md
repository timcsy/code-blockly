# 概念修復報告（C++）— 2026-03-15

## 修復摘要

| 修復項目 | 數量 | 詳情 |
|----------|------|------|
| 移除雙重註冊 | 2 | cpp:vector_push_back, cpp:vector_size |
| 新增 noop executor | 7 | cpp_ifdef, cpp_ifndef, block_comment, doc_comment, cpp_raw_code, cpp_raw_expression, cpp_case, cpp_default |
| 新增 generator | 7 | comment, block_comment, doc_comment, cpp_raw_code, cpp_raw_expression, cpp_ifdef, cpp_ifndef |
| 新增 lifter | 3 | cpp_ifdef (preproc_ifdef), cpp_ifndef (preproc_ifndef), cpp_struct_member_access/cpp_struct_pointer_access (field_expression) |

## 完備率變化

- 修復前：86/157 = **54.8%**（5/5 完整）
- 修復後：121/155 = **78.1%**（5/5 完整）
- 改善：+23.3 百分點

## 剩餘不完整概念（34 個，全部 4/5）

### 設計限制 — 容器方法類型消歧（15 個）

lifter 的 `call_expression` dispatcher 無法區分容器類型（需要 type info），共用方法（empty, clear, push_back 等）預設映射到 vector 概念。以下概念僅供 Blockly 積木使用：

- `cpp_map_access`, `cpp_map_empty`
- `cpp_queue_empty`, `cpp_queue_pop`, `cpp_queue_push`
- `cpp_set_count`, `cpp_set_empty`, `cpp_set_erase`
- `cpp_stack_empty`
- `cpp_string_clear`, `cpp_string_declare`, `cpp_string_empty`, `cpp_string_push_back`
- `cpp_method_call`

### 設計限制 — Blockly-only 概念（3 個）

generator 結構與源碼格式不匹配，lifter 無法正確反向映射：

- `cpp_free` — generator 預期 `children.ptr`，源碼為 `free(ptr)`
- `cpp_malloc` — generator 加入 cast 和 sizeof，源碼結構不同
- `cpp_pointer_declare` — 源碼 lift 為 `var_declare` with pointer type

### Fallback 概念（1 個）

- `cpp_raw_code` — 此概念 IS the fallback，不需要 lifter（由核心 lifter 自動建立）

### Stream 宣告（3 個）

- `cpp_ifstream_declare`, `cpp_ofstream_declare`, `cpp_stringstream_declare` — 可加 declaration lifter，但需要 type matching

### 審計誤報 — Execute（4 個）

以下概念透過 template literal 在 interpreter.ts 中註冊，審計腳本未偵測：

- `cpp_isalpha`, `cpp_isdigit`, `cpp_toupper`, `cpp_tolower`

### 缺少測試（12 個）

- `cpp_ifstream_declare`, `cpp_ofstream_declare`, `cpp_stringstream_declare`
- `cpp_case`, `cpp_cast`, `cpp_default`
- `cpp_memcpy`, `cpp_memset`
- `cpp_pointer_assign`, `cpp_strcat`, `cpp_strncmp`, `cpp_strncpy`

## 修改的檔案

| 檔案 | 修改 |
|------|------|
| `src/languages/cpp/std/vector/concepts.json` | 移除 2 個雙重註冊 |
| `src/interpreter/interpreter.ts` | 新增 7 個 noop executor |
| `src/languages/cpp/core/generators/statements.ts` | 新增 7 個 generator |
| `src/languages/cpp/lifters/index.ts` | 新增 ifdef/ifndef lifter |
| `src/languages/cpp/core/lifters/expressions.ts` | 新增 field_expression lifter |

## 驗證

- TypeScript：✅ 無錯誤
- npm test：✅ 143 passed, 2702 tests, 0 failed
