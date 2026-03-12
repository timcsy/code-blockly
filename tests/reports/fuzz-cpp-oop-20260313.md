# 模糊測試報告 — C++ OOP — 2026-03-13

## 摘要
- 語言：C++
- 難度：easy-medium
- 範疇：OOP (struct, class, constructor, destructor, operator overload, virtual, override, inheritance)
- 產生的程式數：10
- 成功編譯/執行：10
- Round-trip PASS：6
- COMPILE_FAIL：3（pointer member access `->` 不支援）
- STDOUT_DIFF：1（inner block scope flattened）
- EXPECTED_DEGRADATION：4（含 3 COMPILE_FAIL + 1 STDOUT_DIFF）
- P1 穩定性：10/10 全部 STABLE

## 修復的 Bug

### Bug 1：struct constructor 生成 `void` 回傳型別
- 根因：struct_specifier 使用 JSON pattern `liftBody`，未偵測 constructor
- 修復：新增 `cpp:liftStructDef` strategy，使用 `liftClassMember` 辨識 constructor/destructor
- 影響：fuzz_1, fuzz_9

### Bug 2：多變數 field declaration 只保留第一個
- 根因：`field_declaration` 的 `double x, y;` 只提取第一個 declarator
- 修復：`liftClassMember` 偵測多 declarator 並建立 `_multi_field` 節點
- 影響：fuzz_2, fuzz_4, fuzz_7

### Bug 3：protected access specifier 被當作 private
- 根因：class lifter 只處理 `public:` 和 `private:`，無 `protected:` 分支
- 修復：class lifter 新增 `protected` section + generator 輸出 `protected:`
- 影響：fuzz_8

### Bug 4：`loadBlockSpecs` 不傳遞 `liftStrategy`
- 根因：`pattern-lifter.ts` 的 `loadBlockSpecs` 方法建立 entry 時遺漏 `liftStrategy` 欄位
- 修復：在 entry 建構時加入 `liftStrategy: ap.liftStrategy`
- 影響：所有使用 blocks.json `liftStrategy` 的概念

## 覆蓋缺口

1. **Pointer member access**：`ptr->method()` 生成為 `ptr.method()`（fuzz_3, fuzz_4, fuzz_8）
2. **Standalone block scope**：`{ ... }` 內部 block 被攤平（fuzz_5）
3. **Static member**：`static int count;` 和 `int Widget::count = 0;` 不支援（fuzz_10）
4. **const method qualifier**：`void print() const` 的 `const` 遺失

## 產生的回歸測試
- `tests/integration/fuzz-cpp-oop.test.ts`：新增 8 個測試（4 describe × 2 it）+ 3 個 it.todo

## 建議後續
1. 新增 `ptr->member` / `ptr->method()` 概念支援
2. 支援 standalone block scope (`{ ... }`)
3. 支援 static member declarations
4. 保留 `const` method qualifier
