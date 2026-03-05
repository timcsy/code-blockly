# 快速啟動測試場景：Semantic Model Interpreter

## 場景 1：Hello World（US1 最小驗證）

**輸入 SemanticModel**:
```json
{
  "program": {
    "concept": "program",
    "properties": {},
    "children": {
      "body": [
        {
          "concept": "print",
          "properties": {},
          "children": {
            "values": [
              { "concept": "string_literal", "properties": { "value": "Hello World" }, "children": {} }
            ]
          }
        }
      ]
    }
  }
}
```

**預期輸出**: console 面板顯示 `Hello World`
**預期狀態**: completed

## 場景 2：變數 + 算術 + 輸出（US1 核心驗證）

**程式邏輯**: `int x = 3; int y = 4; print(x + y);`

**預期輸出**: console 面板顯示 `7`

## 場景 3：Input 讀取（US2 驗證）

**程式邏輯**: `int n; input(n); print(n * 2);`
**預填輸入佇列**: `["5"]`

**預期輸出**: console 面板顯示 `10`

## 場景 4：迴圈（US1 流程控制驗證）

**程式邏輯**: `for (int i = 1; i <= 5; i++) { print(i); print(endl); }`

**預期輸出**:
```
1
2
3
4
5
```

## 場景 5：遞迴函式（US1 進階驗證）

**程式邏輯**:
```
int factorial(int n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
print(factorial(5));
```

**預期輸出**: `120`

## 場景 6：逐步執行（US3 驗證）

**程式邏輯**: `int a = 1; int b = 2; int c = a + b; print(c);`

**預期步驟**:
| 步驟 | 執行語句 | 變數狀態 |
|------|----------|----------|
| 1 | `int a = 1` | a=1 |
| 2 | `int b = 2` | a=1, b=2 |
| 3 | `int c = a + b` | a=1, b=2, c=3 |
| 4 | `print(c)` | a=1, b=2, c=3, 輸出="3" |

## 場景 7：無窮迴圈保護（邊界情況驗證）

**程式邏輯**: `while (true) { }`

**預期行為**: 步數達 10,000 後中止，顯示錯誤訊息

## 場景 8：執行期錯誤（邊界情況驗證）

**程式邏輯**: `print(x);`（x 未宣告）

**預期行為**: 顯示友善錯誤訊息，高亮相關積木
