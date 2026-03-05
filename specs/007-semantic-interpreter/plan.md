# 實作計畫：Semantic Model Interpreter — 前端程式執行引擎

**分支**: `007-semantic-interpreter` | **日期**: 2026-03-05 | **規格**: [spec.md](./spec.md)
**輸入**: 功能規格 `/specs/007-semantic-interpreter/spec.md`

## 摘要

基於現有的 SemanticModel / SemanticNode 中間表示，建立純前端直譯器。直譯器直接走訪 SemanticNode 樹並執行語義，支援完整的 I/O、逐步執行、變數監看。UI 整合於程式碼面板下方新增的 console 面板，不改動現有左右雙欄結構。

## 技術脈絡

**語言/版本**: TypeScript 5.x
**主要依賴**: 現有的 Blockly 12.4.1、CodeMirror 6.x、web-tree-sitter 0.26.x（不新增外部依賴）
**儲存**: 無持久化需求（執行狀態為暫態）
**測試**: Vitest（與現有測試框架一致）
**目標平台**: 瀏覽器（純前端，零後端依賴）
**專案類型**: 現有 Web 應用的功能擴充
**效能目標**: 基本程式 < 1 秒完成、高亮更新 < 200ms、10,000 步上限 < 2 秒
**約束**: 不新增外部依賴、不改動現有左右雙欄佈局結構
**規模**: 新增約 5-8 個 TypeScript 檔案，修改 3-4 個現有檔案

## 憲法檢查

*閘門：Phase 0 研究前必須通過。Phase 1 設計後重新檢查。*

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. 簡約優先 | PASS | 不引入新依賴、不過度抽象。直譯器為單一 class，IOSystem 和 StepController 各為獨立模組 |
| II. 測試驅動開發 | PASS | 每個 SemanticNode 概念有對應測試，TDD 流程：寫測試 → 紅 → 實作 → 綠 → 重構 |
| III. Git 紀律 | PASS | 每個 task 完成後 commit |
| IV. 規格文件保護 | PASS | 不修改 specs/ 及 .specify/ 目錄下的既有文件 |
| V. 繁體中文優先 | PASS | 計畫文件以繁體中文撰寫，程式碼變數名維持英文 |

## 專案結構

### 文件（本功能）

```text
specs/007-semantic-interpreter/
├── spec.md              # 功能規格
├── plan.md              # 本檔案
├── research.md          # Phase 0 研究成果
├── data-model.md        # Phase 1 資料模型
├── quickstart.md        # Phase 1 快速啟動測試場景
└── checklists/
    └── requirements.md  # 規格品質檢查表
```

### 原始碼（倉庫根目錄）

```text
src/
├── interpreter/
│   ├── interpreter.ts       # SemanticInterpreter 核心直譯器
│   ├── scope.ts             # Scope 作用域管理
│   ├── types.ts             # RuntimeValue、ExecutionState 等型別定義
│   ├── io.ts                # IOSystem 虛擬 I/O
│   └── errors.ts            # RuntimeError 執行期錯誤（含 i18n key）
├── ui/
│   ├── console-panel.ts     # ConsolePanel 虛擬 console UI 元件
│   ├── variable-panel.ts    # VariablePanel 變數監看面板 UI 元件
│   ├── step-controller.ts   # StepController 逐步執行控制器
│   ├── App.ts               # （修改）整合直譯器 UI
│   └── ...                  # 現有檔案不變
├── i18n/
│   ├── zh-TW/
│   │   └── blocks.json      # （修改）新增 RUNTIME_ERR_* 和 EXEC_* i18n key
│   └── en/
│       └── blocks.json      # （修改）新增對應英文 key
├── style.css                # （修改）新增 console-panel、variable-panel 樣式
└── ...

tests/
├── unit/
│   ├── interpreter.test.ts           # 直譯器核心邏輯測試（22 個概念）
│   ├── scope.test.ts                 # 作用域測試
│   └── io.test.ts                    # I/O 系統測試
├── integration/
│   └── interpreter-integration.test.ts  # 端對端直譯器整合測試
└── ...
```

**結構決策**: 新增 `src/interpreter/` 目錄存放直譯器核心邏輯（與 UI 分離），UI 元件放在 `src/ui/` 下與現有結構一致。直譯器核心不依賴任何 UI 或 DOM API，方便獨立測試。

## 複雜度追蹤

無憲法違反，不需記錄。
