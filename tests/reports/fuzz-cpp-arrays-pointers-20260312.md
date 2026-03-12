# Fuzz Test Report -- C++ Arrays & Pointers -- 2026-03-12

## 摘要
- 語言：C++
- 測試程式數量：10
- 成功執行：10（原始程式皆可編譯執行）
- Round-trip PASS：6（P1 穩定）
- g++ 編譯 PASS：8
- COMPILE_FAIL：2
- SEMANTIC_DIFF：2
- ROUNDTRIP_DRIFT：0

## 測試重點
本次測試聚焦於陣列（array）與指標（pointer）相關概念的邊界情況：
- 陣列初始化（含初始值）
- 陣列邊界存取（不越界）
- 指標算術搭配陣列基址
- 以指標傳遞陣列給函式
- 多個指標指向相同資料
- new/delete 動態配置模式
- malloc/free 模式
- 取址與解參考鏈（&*ptr, *&var, **&p）
- 指標陣列（array of pointers）
- 函式回傳指標（指向全域變數）

## 測試結果

| # | 程式 | 狀態 | 說明 |
|---|------|------|------|
| 1 | 陣列初始化加總 | SEMANTIC_DIFF | `int a[5] = {10,20,30,40,50}` 初始值在 lift 後遺失，產生未初始化陣列 |
| 2 | 陣列邊界存取 | PASS | arr[0], arr[4], arr[9] 正確存取 |
| 3 | 指標算術與陣列基址 | SEMANTIC_DIFF | `int arr[5] = {2,4,6,8,10}` 初始值遺失，指標算術本身正確 |
| 4 | 以指標傳遞陣列給函式 | PASS | fillArray(int* arr, int n) 正確 roundtrip |
| 5 | 多指標指向相同資料 | PASS | *p1, *p2 皆正確修改同一變數 |
| 6 | new/delete 模式 | PASS | 動態配置、計算、釋放皆正確 |
| 7 | malloc/free 模式 | PASS | (int*)malloc + sizeof + free 皆正確 roundtrip |
| 8 | 取址解參考鏈 | PASS | *&x, *p, **&p 皆正確 roundtrip |
| 9 | 指標陣列 | COMPILE_FAIL | `int* ptrs[3]` 被 lift 為 `int x;`，變數名遺失且型別錯誤 |
| 10 | 函式回傳指標 | COMPILE_FAIL | `int*` 回傳型別產生為 `int getGlobalPtr()()` 語法錯誤 |

## 測試驗證方式
1. 每個程式先以 g++ -std=c++17 編譯並執行，記錄預期 stdout
2. 透過 Semorphe lifter 將 C++ 原始碼提升為語意樹
3. 透過 PatternRenderer 產生 C++ 程式碼（roundtrip 1）
4. 再次提升產生的程式碼並比對（roundtrip 2，P1 穩定性）
5. 編譯產生的程式碼並比對 stdout 輸出

## 發現的問題

### BUG-1: 陣列初始化列表遺失
- **程式**: arr_001, arr_003
- **症狀**: `int a[5] = {10, 20, 30, 40, 50}` 經過 lift→generate 後變為 `int a[5];`，初始值列表完全遺失
- **影響**: 產生的程式碼使用未初始化陣列，導致不確定行為（garbage values）
- **分類**: SEMANTIC_DIFF
- **根因推測**: Lifter 處理 `init_declarator` 時未處理 `initializer_list` 節點，僅保留陣列宣告

### BUG-2: 指標陣列宣告型別錯誤
- **程式**: arr_009
- **症狀**: `int* ptrs[3]` 被 lift 為 `int x;`，完全遺失：(1) 指標型別 (2) 陣列維度 (3) 變數名稱
- **影響**: 編譯失敗，後續對 ptrs 的存取全部為未宣告識別碼
- **分類**: COMPILE_FAIL
- **根因推測**: Lifter 不支援「指標陣列」型別組合（`type* name[size]`），fallback 到預設 int 宣告

### BUG-3: 函式回傳指標型別產生語法錯誤
- **程式**: arr_010
- **症狀**: `int* getGlobalPtr()` 的回傳型別 `int*` 被產生為 `int getGlobalPtr()()` — 雙括號語法錯誤
- **影響**: 編譯失敗
- **分類**: COMPILE_FAIL
- **根因推測**: Code generator 將 `int*` 回傳型別的 `*` 誤解為函式指標語法，或指標回傳型別的 renderer 有缺陷

## 已知限制
- 本次測試未涵蓋多維動態陣列（`new int[m][n]`）
- 未測試 `const` 指標或指向 `const` 的指標
- 未測試函式指標（`int (*fp)(int)`）
- 未測試 `nullptr` 比較
- 未測試 `delete[]`（陣列 delete）
- 未測試 `realloc`

## 產生的迴歸測試
- `tests/integration/fuzz-cpp-arrays-pointers.test.ts`（含 20 測試案例）
