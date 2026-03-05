# 資料模型：Semantic Model Interpreter

## 實體

### RuntimeValue（執行期值）

代表直譯器中所有值的統一型別。

| 欄位 | 型別 | 說明 |
|------|------|------|
| type | `'int' \| 'float' \| 'double' \| 'char' \| 'string' \| 'bool' \| 'void' \| 'array'` | 值的型別 |
| value | `number \| string \| boolean \| null \| RuntimeValue[]` | 實際的值 |

**驗證規則**:
- `int`: value 為整數（`Math.trunc`）
- `float` / `double`: value 為浮點數
- `char`: value 為單一字元字串
- `string`: value 為字串
- `bool`: value 為 boolean
- `void`: value 為 null
- `array`: value 為 RuntimeValue[]

### Scope（作用域）

變數名稱到 RuntimeValue 的對映，形成鏈式結構。

| 欄位 | 型別 | 說明 |
|------|------|------|
| variables | `Map<string, RuntimeValue>` | 本層的變數映射 |
| parent | `Scope \| null` | 父作用域（null 表示全域） |

**行為規則**:
- `get(name)`: 先查本層，找不到則向上查 parent
- `set(name, value)`: 先查本層和上層是否已存在，存在則更新該層；不存在則在本層新增
- `declare(name, value)`: 在本層新增（不查上層），重複宣告為錯誤

### FunctionDef（函式定義）

儲存已定義的函式，供呼叫時查找。

| 欄位 | 型別 | 說明 |
|------|------|------|
| name | `string` | 函式名稱 |
| params | `{type: string, name: string}[]` | 參數清單 |
| returnType | `string` | 回傳型別 |
| body | `SemanticNode[]` | 函式主體（SemanticNode 陣列） |

### ExecutionState（執行狀態）

直譯器的完整執行期狀態。

| 欄位 | 型別 | 說明 |
|------|------|------|
| status | `'idle' \| 'running' \| 'paused' \| 'completed' \| 'error'` | 執行狀態 |
| globalScope | `Scope` | 全域作用域 |
| callStack | `CallFrame[]` | 呼叫堆疊 |
| stepCount | `number` | 已執行步數 |
| maxSteps | `number` | 最大步數限制（預設 10,000） |
| functions | `Map<string, FunctionDef>` | 已定義的函式表 |
| arrays | `Map<string, RuntimeValue[]>` | 陣列儲存 |

### CallFrame（呼叫框架）

呼叫堆疊中的單一框架。

| 欄位 | 型別 | 說明 |
|------|------|------|
| functionName | `string` | 函式名稱 |
| scope | `Scope` | 此呼叫的區域作用域 |
| returnValue | `RuntimeValue \| null` | 回傳值（尚未回傳時為 null） |

### IOState（I/O 狀態）

虛擬 I/O 系統的狀態。

| 欄位 | 型別 | 說明 |
|------|------|------|
| stdout | `string[]` | 輸出緩衝區（每筆 print 輸出一個元素） |
| stdinQueue | `string[]` | 預填輸入佇列 |
| stdinIndex | `number` | 目前讀取位置 |
| waitingForInput | `boolean` | 是否正在等待使用者輸入 |
| inputVariable | `string \| null` | 等待輸入的目標變數名稱 |

## 狀態轉換

```
idle → running（使用者按「執行」或「逐步」）
running → paused（使用者按「暫停」或等待 input）
running → completed（程式正常結束）
running → error（執行期錯誤或步數超限）
paused → running（使用者按「繼續」或提供 input）
paused → idle（使用者按「停止」）
completed → idle（使用者按「執行」重新開始）
error → idle（使用者按「執行」重新開始）
```

## 關係圖

```
ExecutionState
├── globalScope: Scope ←→ parent chain
├── callStack: CallFrame[]
│   └── scope: Scope ←→ parent → globalScope
├── functions: Map<string, FunctionDef>
│   └── body: SemanticNode[]
└── IOState
    ├── stdout: string[]
    └── stdinQueue: string[]
```
