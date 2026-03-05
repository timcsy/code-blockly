# 研究紀錄：Semantic Model Interpreter

## 決策 1：直譯器架構模式

**決策**: 採用樹走訪直譯器（Tree-Walking Interpreter），直接遞迴走訪 SemanticNode 樹

**理由**:
- SemanticNode 已是乾淨的 AST，不需先編譯為位元組碼
- 初學者程式規模小（< 100 語句），效能不是瓶頸
- 實作最簡單，符合簡約優先原則
- 天然支援逐步執行（每個節點即為一步）

**排除的替代方案**:
- 位元組碼編譯器 + VM：過度工程化，初學者程式不需要此效能等級
- 編譯為 JavaScript 後 eval()：安全風險高，且無法支援逐步執行和變數監看

## 決策 2：非同步執行模型

**決策**: 直譯器以同步方式逐步執行，由 StepController 透過 `requestAnimationFrame` 或 `setTimeout` 排程每一步

**理由**:
- 同步逐步避免 Promise 鏈的複雜度
- 每步之間交還控制權給瀏覽器，確保 UI 不凍結
- input 等待時暫停執行迴圈，等使用者輸入後恢復

**排除的替代方案**:
- Web Worker：增加複雜度，且無法直接操作 DOM 高亮
- async/await 全鏈路：使每個節點執行都成為 Promise，效能和除錯都更差

## 決策 3：func_def params 格式

**決策**: 直譯器解析 `func_def` 的 `params` 屬性為 JSON 字串化的 `[{type: string, name: string}]` 陣列

**理由**:
- 現有 CppLanguageAdapter.blockToSemantic() 已將參數存為 `JSON.stringify(params)`
- 格式為 `[{"type":"int","name":"a"},{"type":"int","name":"b"}]`
- 直譯器直接 `JSON.parse()` 即可取得結構化參數資訊

## 決策 4：SemanticModel 取得方式

**決策**: 從 SyncController.getCurrentModel() 取得快取的 SemanticModel

**理由**:
- SyncController 已維護 `currentModel: SemanticModel | null` 快取
- 每次同步（積木→程式碼或程式碼→積木）都會更新此快取
- 避免重複解析或轉換，直接使用最新的語義模型

## 決策 5：console 面板行內輸入實作

**決策**: console 面板使用一個可編輯的 `<input>` 元素在底部，執行到 `input` 時顯示並聚焦

**理由**:
- 符合 clarify 階段的決策：console 內行內輸入
- 類似終端機體驗，使用者在同一區域看輸出和打輸入
- 輸入完成後（Enter），將值推入執行環境並繼續執行

## 決策 6：錯誤訊息 i18n 整合

**決策**: 執行期錯誤使用 i18n key（如 `RUNTIME_ERR_UNDECLARED_VAR`），透過現有 LocaleLoader 機制

**理由**:
- 專案已有完整的 i18n 系統（LocaleLoader + Blockly.Msg）
- 只需在 `zh-TW/blocks.json` 和 `en/blocks.json` 新增 key
- 錯誤訊息支援插值（如變數名），使用 `%1` 佔位符格式

## 決策 7：語言特有概念的處理

**決策**: 直譯器遇到非 universal 概念（如 `cpp:include`、`cpp:using_namespace`）時靜默跳過

**理由**:
- 這些概念是編譯指令，在直譯執行時沒有語義效果
- program 節點的 body 陣列中可能包含這些節點，需逐一判斷
- 只解釋已知的 universal 概念，其餘 skip
