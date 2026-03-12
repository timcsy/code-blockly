# 概念探索：C++ — 型別系統與進階運算

## 摘要
- 語言：C++
- 目標：const, constexpr, auto, typedef, using alias, sizeof, bitwise operations, ternary operator, cast, increment/decrement, compound assignment, enum
- 發現概念總數：18（含已實作與新增）
- 已實作概念：15
- 尚未實作概念：3（bitwise_and, bitwise_or, bitwise_xor）
- 通用概念：0、語言特定概念：18
- 涵蓋的 Topic 層級樹節點：L1a（函式與迴圈）、L1b（控制流進階）、L1c（型別系統）

## 概念目錄 (by Topic level)

### L1a: 函式與迴圈 — 已歸屬

| 概念名稱 | conceptId | 語法 | 語義意義 | 積木輸入 | Layer | 狀態 | 備註 |
|---|---|---|---|---|---|---|---|
| `cpp_increment` | `cpp_increment` | `i++;` / `++i;` | 遞增或遞減（statement） | NAME(field), OP(dropdown: ++/--), POSITION(dropdown: prefix/postfix) | lang-core | 已實作 | 有 expression 版本 `cpp_increment_expr` |
| `cpp_increment_expr` | `cpp_increment_expr` | `i++` / `++i` | 遞增或遞減（expression） | NAME(field), OP(dropdown), POSITION(dropdown) | lang-core | 已實作 | renderMapping 自動切換 |
| `cpp_compound_assign` | `cpp_compound_assign` | `x += 5;` | 複合賦值（statement） | NAME(field), OP(dropdown: +=/-=/*=//=/%=), VALUE(expr) | lang-core | 已實作 | 有 expression 版本 |
| `cpp_compound_assign_expr` | `cpp_compound_assign_expr` | `x += 5` | 複合賦值（expression） | NAME(field), OP(dropdown), VALUE(expr) | lang-core | 已實作 | renderMapping 自動切換 |

### L1b: 控制流進階 — 已歸屬

| 概念名稱 | conceptId | 語法 | 語義意義 | 積木輸入 | Layer | 狀態 | 備註 |
|---|---|---|---|---|---|---|---|
| `cpp_ternary` | `cpp_ternary` | `a ? b : c` | 三元條件運算式 | CONDITION(expr), TRUE_EXPR(expr), FALSE_EXPR(expr) | lang-core | 已實作 | order=3，需注意括號 |
| `cpp_cast` | `cpp_cast` | `(int)x` | C 風格型別轉換 | TARGET_TYPE(dropdown: int/float/double/char/long long), VALUE(expr) | lang-core | 已實作 | order=8 |
| `bitwise_not` | `bitwise_not` | `~x` | 位元反轉 | OPERAND(expr) | lang-core | 已實作 | AST: unary_expression, constraint operator="~" |
| `cpp_sizeof` | `cpp_sizeof` | `sizeof(int)` | 取得型別或變數的位元組大小 | TARGET(field) | lang-core | 已實作 | order=20 |
| `cpp_enum` | `cpp_enum` | `enum Color { RED, GREEN, BLUE };` | 列舉型別定義 | NAME(field), VALUES(field: 逗號分隔字串) | lang-core | 已實作 | VALUES 為純文字輸入 |

### L1c: 型別系統 — 已歸屬

| 概念名稱 | conceptId | 語法 | 語義意義 | 積木輸入 | Layer | 狀態 | 備註 |
|---|---|---|---|---|---|---|---|
| `cpp_const_declare` | `cpp_const_declare` | `const int MAX = 100;` | 宣告不可變常數 | TYPE(dropdown), NAME(field), VALUE(expr) | lang-core | 已實作 | qualifier=const |
| `cpp_constexpr_declare` | `cpp_constexpr_declare` | `constexpr int SIZE = 10;` | 宣告編譯期常數 | TYPE(dropdown), NAME(field), VALUE(expr) | lang-core | 已實作 | 無 string 型別選項 |
| `cpp_auto_declare` | `cpp_auto_declare` | `auto x = expr;` | 自動推導型別宣告 | NAME(field), VALUE(expr) | lang-core | 已實作 | 必須有初始值 |
| `cpp_typedef` | `cpp_typedef` | `typedef int myint;` | 定義型別別名（舊式） | ORIG_TYPE(field), ALIAS(field) | lang-core | 已實作 | C 語法 |
| `cpp_using_alias` | `cpp_using_alias` | `using ll = long long;` | 定義型別別名（新式） | ALIAS(field), ORIG_TYPE(field) | lang-core | 已實作 | C++11 語法 |

### 尚未實作 — 需新增

| 概念名稱 | 建議 conceptId | 語法 | 語義意義 | 建議積木輸入 | Layer | 建議歸屬 | 備註 |
|---|---|---|---|---|---|---|---|
| bitwise_and | `cpp_bitwise_and` | `a & b` | 位元 AND | LEFT(expr), RIGHT(expr) | lang-core | L1b | 二元位元運算 |
| bitwise_or | `cpp_bitwise_or` | `a \| b` | 位元 OR | LEFT(expr), RIGHT(expr) | lang-core | L1b | 二元位元運算 |
| bitwise_xor | `cpp_bitwise_xor` | `a ^ b` | 位元 XOR | LEFT(expr), RIGHT(expr) | lang-core | L1b | 二元位元運算 |

> **設計抉擇**：二元位元運算（`&`, `|`, `^`, `<<`, `>>`）可有兩種實作策略：
> 1. **獨立概念**：每個運算一個概念（如上表），語義最清晰但概念數量多。
> 2. **統一 bitwise 概念**：類似 `arithmetic` 用 operator dropdown 合併（`conceptId: cpp_bitwise`，operator 選項為 `&`, `|`, `^`, `<<`, `>>`），與現有 `arithmetic` / `logic` 設計一致。
>
> **建議**：採用策略 2（統一 `cpp_bitwise` 概念），與 `arithmetic` 和 `logic` 的設計模式保持一致。`bitwise_not` 保持獨立（類似 `logic_not` / `negate` 為一元運算）。

## 依賴關係圖

```
                    ┌─────────────────────────────────────────┐
                    │         expression（任意表達式）          │
                    └──┬──────┬──────┬──────┬──────┬──────┬───┘
                       │      │      │      │      │      │
               ┌───────┘      │      │      │      │      └────────┐
               ▼              ▼      ▼      ▼      ▼              ▼
        cpp_ternary    cpp_cast  bitwise  sizeof  increment  compound_assign
        (condition,    (value)   (left,   (target) (name)    (name, value)
         true, false)            right)

  var_declare ◄── cpp_const_declare（加 const 修飾）
              ◄── cpp_constexpr_declare（加 constexpr 修飾）
              ◄── cpp_auto_declare（省略型別）

  獨立宣告（無依賴）：
    cpp_typedef ──── 純文字欄位
    cpp_using_alias ── 純文字欄位
    cpp_enum ──── 純文字欄位

  已存在 bitwise_not（一元） ← 新增 cpp_bitwise（二元）互補
```

### 概念間語義關聯

| 來源概念 | 關聯概念 | 關係 |
|---|---|---|
| `cpp_const_declare` | `var_declare` | 特化（加 const 修飾詞） |
| `cpp_constexpr_declare` | `cpp_const_declare` | 特化（編譯期求值） |
| `cpp_auto_declare` | `var_declare` | 特化（省略顯式型別） |
| `cpp_cast` | `cpp_static_cast` | C 風格 vs C++ 風格，互為替代 |
| `cpp_increment` | `cpp_compound_assign` | 語義相近（i++ 等同 i += 1） |
| `cpp_increment` | `cpp_increment_expr` | statement/expression 雙版本 |
| `cpp_compound_assign` | `cpp_compound_assign_expr` | statement/expression 雙版本 |
| `bitwise_not` | `cpp_bitwise`（新） | 一元/二元互補 |
| `cpp_typedef` | `cpp_using_alias` | 新舊語法替代 |
| `cpp_enum` | `cpp_switch` | 常見搭配使用（switch on enum） |

## 建議實作順序

以下為**尚未實作概念**的建議順序（已實作的 15 個概念無需額外工作）：

1. **cpp_bitwise**（統一二元位元運算）
   - 新增 concept 定義至 `concepts.json`：`conceptId: "cpp_bitwise"`, `abstractConcept: "bitwise"`, `properties: ["operator"]`, `children: { left: "expression", right: "expression" }`, `role: "expression"`
   - 新增 block 定義至 `blocks.json`：operator dropdown 含 `&`, `|`, `^`, `<<`, `>>`
   - AST pattern: `binary_expression`，constraint 檢查 operator 為位元運算子
   - codeTemplate: `${LEFT} ${OP} ${RIGHT}`，order 需依運算子優先級設定

2. **（可選）bitwise compound assign 擴充**
   - 現有 `cpp_compound_assign` 的 OP dropdown 僅含 `+=`, `-=`, `*=`, `/=`, `%=`
   - 可擴充加入 `&=`, `|=`, `^=`, `<<=`, `>>=`
   - 這不需要新概念，只需修改現有 block 定義的 dropdown 選項

## 跨語言對應

| C++ 概念 | 通用抽象概念 | Python 對應 | Java 對應 | 備註 |
|---|---|---|---|---|
| `cpp_const_declare` | `const_declare` | 無（慣例用大寫） | `final` 變數 | Python 無真正 const |
| `cpp_constexpr_declare` | `constexpr_declare` | 無 | 無 | C++ 獨有 |
| `cpp_auto_declare` | `auto_declare` | 預設行為（動態型別） | `var`（Java 10+） | |
| `cpp_typedef` | `typedef` | 無 | 無 | C/C++ 獨有 |
| `cpp_using_alias` | `using_alias` | `TypeAlias`（PEP 613） | 無 | |
| `cpp_sizeof` | `sizeof` | `sys.getsizeof()` | 無直接對應 | |
| `bitwise_not` | `bitwise_not` | `~x` | `~x` | 語法相同 |
| `cpp_bitwise`（新） | `bitwise` | `&`, `\|`, `^`, `<<`, `>>` | 相同 | 可提升為 universal |
| `cpp_ternary` | `ternary` | `b if a else c` | `a ? b : c` | Python 語法順序不同 |
| `cpp_cast` | `cast` | `int(x)` | `(int)x` | 各語言語法差異大 |
| `cpp_increment` | `increment` | 無（Python 無 ++） | `i++` / `++i` | Python 用 `+= 1` |
| `cpp_compound_assign` | `compound_assign` | `x += 5` | `x += 5` | 語法幾乎相同 |
| `cpp_enum` | `enum` | `enum.Enum` class | `enum` 關鍵字 | 語義相似、語法不同 |

### 可提升為 universal 的候選

- **`bitwise`**（二元位元運算）：C/C++、Java、Python、JavaScript 全部支援 `&`, `|`, `^`, `<<`, `>>`，語法完全一致，非常適合提升為 universal layer
- **`ternary`**：大多數語言支援，但語法差異較大（Python 為 `x if cond else y`），可考慮提升
- **`compound_assign`**：幾乎所有命令式語言支援，語法高度一致，適合提升

## 需注意的邊界案例

### 型別修飾相關
1. **const 初始化必要性**：`const int x;` 在 C++ 中不合法（必須初始化），但 blocks 目前允許空的 VALUE input，需考慮是否加驗證
2. **constexpr 與 const 差異**：constexpr 要求值在編譯期可求值，blocks 目前無法驗證這一點
3. **constexpr 無 string 型別**：`cpp_constexpr_declare` 的 TYPE dropdown 不含 string（正確，因為 `std::string` 在 C++17 前不能 constexpr）
4. **auto 必須初始化**：`auto x;` 不合法，block 設計正確（VALUE 為必要 input）

### 位元運算相關
5. **位元運算優先級**：`&` < `^` < `|`，但都低於比較運算子，`a & b == c` 實際解析為 `a & (b == c)`，初學者常犯錯
6. **左移右移的溢位**：左移超過型別位元寬度為未定義行為
7. **有號數右移**：算術右移 vs 邏輯右移在 C++ 中依實作定義（implementation-defined）
8. **bitwise_not 已存在但無對應二元運算**：目前 `bitwise_not`（~）已實作，但 `&`, `|`, `^` 等二元位元運算尚無專用概念

### 轉型相關
9. **C 風格 cast vs C++ cast**：`(int)x` 和 `static_cast<int>(x)` 兩者都已有概念，但教學上應引導學生使用 C++ 風格
10. **cast 與 sizeof 的 tree-sitter 節點**：`(int)x` 為 `cast_expression`，`sizeof(int)` 為 `sizeof_expression`

### 遞增遞減相關
11. **前綴 vs 後綴語義差異**：`i++` 返回舊值，`++i` 返回新值；在 statement 情境下無差異，但在 expression 中（如 `a[i++]`）行為不同
12. **statement/expression 雙版本 extraState 契約**：`cpp_increment` 和 `cpp_increment_expr` 的 saveExtraState/loadExtraState 格式必須完全相同（已知架構陷阱，見 `docs/technical-experiences.md` §21）

### enum 相關
13. **enum 值為純文字欄位**：目前 VALUES 用單一 `field_input` 存逗號分隔字串，無法支援指定值（如 `RED = 0, GREEN = 1`），這是已知的技術債
14. **enum class**（C++11 scoped enum）尚未支援，未來可考慮新增 `cpp_enum_class` 概念
15. **tree-sitter lift**：`cpp_enum` 目前無 `astPattern` 定義，意味著 code-to-blocks 尚未支援 enum 的反向轉換
