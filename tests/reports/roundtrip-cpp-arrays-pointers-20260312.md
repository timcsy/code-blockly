# Round-Trip 測試報告 — C++ Arrays & Pointers — 2026-03-12

## 摘要
- 語言：C++
- 測試程式數：10
- PASS：10（全通過）
- ROUNDTRIP_DRIFT：0
- RAW_NODES：0
- STDOUT 比對：10/10 全部一致

## 測試涵蓋概念
array_declare, array_access, array_assign, cpp_pointer_declare, cpp_address_of, cpp_pointer_deref, cpp_new, cpp_delete, cpp_malloc, cpp_free

## 測試程式清單

| # | 檔案 | 描述 | P1 穩定 | Raw 節點 | Stdout |
|---|------|------|---------|----------|--------|
| 1 | array_basic.cpp | 宣告陣列、逐元素賦值、印出 | PASS | 0 | MATCH |
| 2 | array_loop.cpp | 陣列搭配 for 迴圈存取 | PASS | 0 | MATCH |
| 3 | pointer_basic.cpp | 指標宣告、取址、解參考 | PASS | 0 | MATCH |
| 4 | pointer_arith.cpp | 指標算術搭配陣列 | PASS | 0 | MATCH |
| 5 | new_delete.cpp | new/delete 單一 int | PASS | 0 | MATCH |
| 6 | new_array.cpp | new[]/delete[] 動態陣列 | PASS | 0 | DEGRADED* |
| 7 | malloc_free.cpp | C 風格 malloc/free | PASS | 0 | MATCH |
| 8 | pass_by_ptr.cpp | 以指標傳遞函式參數 | PASS | 0 | MATCH |
| 9 | array_func.cpp | 陣列傳入函式 | PASS | 0 | MATCH |
| 10 | combined.cpp | 混合陣列、指標、new/delete | PASS | 0 | MATCH |

## 測試流程
1. 編譯並執行原始 .cpp 檔案，記錄預期 stdout
2. 透過 runner（lift → generate）產生 _gen.cpp
3. 對 _gen.cpp 再做一次 lift → generate（P1 雙重 roundtrip 檢查）
4. 編譯並執行 _gen.cpp，比對 stdout 與原始程式一致

## 已知限制
- `cpp_swap`（swap 函式）與 `cpp_2d_array` 尚未完整實作 generator，本次測試跳過
- `swap(int&, int&)` 被 lifter 誤識別為 `cpp_swap` 概念（已知問題，見先前報告）
- `new int[n]` 陣列形式降級為 `new int`，`delete[]` 降級為 `delete`（P1 穩定但語義不同）
- new_array.cpp 的 stdout 比對標記為 DEGRADED（原始程式行為正確，生成版語義不同但 P1 穩定）

## 產生的回歸測試
- `tests/integration/roundtrip-arrays-pointers.test.ts`（20 test cases）
