# i18n 標籤修復報告（C++）— 2026-03-15

## 總覽

- 語言：C++
- 模式：i18n-fix
- 修復前 P1 違規數：~65 個標籤
- 修復後 P1 違規數：0 個標籤
- zh-TW 修改數：60 個 MSG0 標籤
- en 修改數：69 個 MSG0 標籤
- 總計修復：129 個標籤

## 修復規則

| 規則 | 說明 |
|------|------|
| 中文描述式 | 包含動詞，不含括號或原始函式名（如 `排序 %1` 而非 `sort( %1 )`） |
| 英文動詞短語 | 以大寫字母開頭的動詞短語（如 `Sort %1` 而非 `sort( %1 )`） |
| 函式名不當標籤 | message0 翻譯不等於函式呼叫語法 |
| tooltip 補充說明 | tooltip 與 message0 不同，提供額外資訊 |
| 同類風格一致 | 同 category 內所有標籤使用相同句式模式 |

## 修改分類

### 容器操作（vector, stack, queue, map, set）

| Key | 修復前（zh-TW） | 修復後（zh-TW） |
|-----|-----------------|-----------------|
| CPP_VECTOR_POP_BACK_MSG0 | `%1 .pop_back()` | `移除 %1 末端元素` |
| CPP_VECTOR_CLEAR_MSG0 | `%1 .clear()` | `清空 %1` |
| CPP_VECTOR_EMPTY_MSG0 | `%1 .empty()` | `%1 是否為空` |
| CPP_VECTOR_BACK_MSG0 | `%1 .back()` | `%1 的末端元素` |
| CPP_STACK_PUSH_MSG0 | `%1 .push( %2 )` | `將 %2 推入堆疊 %1` |
| CPP_STACK_POP_MSG0 | `%1 .pop()` | `彈出 %1 頂端元素` |
| CPP_STACK_TOP_MSG0 | `%1 .top()` | `%1 的頂端元素` |
| CPP_STACK_EMPTY_MSG0 | `%1 .empty()` | `%1 是否為空` |
| CPP_QUEUE_PUSH_MSG0 | `%1 .push( %2 )` | `將 %2 加入佇列 %1` |
| CPP_QUEUE_POP_MSG0 | `%1 .pop()` | `移除 %1 前端元素` |
| CPP_QUEUE_FRONT_MSG0 | `%1 .front()` | `%1 的前端元素` |
| CPP_QUEUE_EMPTY_MSG0 | `%1 .empty()` | `%1 是否為空` |
| CPP_MAP_ACCESS_MSG0 | `%1 [ %2 ]` | `%1 中鍵 %2 的值` |
| CPP_MAP_ERASE_MSG0 | `%1 .erase( %2 )` | `從 %1 移除鍵 %2` |
| CPP_MAP_COUNT_MSG0 | `%1 .count( %2 )` | `%1 中是否有鍵 %2` |
| CPP_MAP_EMPTY_MSG0 | `%1 .empty()` | `%1 是否為空` |
| CPP_SET_INSERT_MSG0 | `%1 .insert( %2 )` | `將 %2 加入集合 %1` |
| CPP_SET_ERASE_MSG0 | `%1 .erase( %2 )` | `從 %1 移除 %2` |
| CPP_SET_COUNT_MSG0 | `%1 .count( %2 )` | `%1 中是否有 %2` |
| CPP_SET_EMPTY_MSG0 | `%1 .empty()` | `%1 是否為空` |

### 字串操作

| Key | 修復前（zh-TW） | 修復後（zh-TW） |
|-----|-----------------|-----------------|
| CPP_STRING_SUBSTR_MSG0 | `%1 .substr( %2 , %3 )` | `%1 的子字串（位置 %2 長度 %3）` |
| CPP_STRING_FIND_MSG0 | `%1 .find( %2 )` | `在 %1 中尋找 %2` |
| CPP_STRING_APPEND_MSG0 | `%1 .append( %2 )` | `在 %1 後追加 %2` |
| CPP_STRING_C_STR_MSG0 | `%1 .c_str()` | `%1 的 C 字串` |
| CPP_STRING_EMPTY_MSG0 | `%1 .empty()` | `%1 是否為空` |
| CPP_STRING_ERASE_MSG0 | `%1 .erase( %2 , %3 )` | `從 %1 刪除（位置 %2 長度 %3）` |
| CPP_STRING_INSERT_MSG0 | `%1 .insert( %2 , %3 )` | `在 %1 位置 %2 插入 %3` |
| CPP_STRING_REPLACE_MSG0 | `%1 .replace( %2 , %3 , %4 )` | `替換 %1（位置 %2 長度 %3）為 %4` |
| CPP_STRING_PUSH_BACK_MSG0 | `%1 .push_back( %2 )` | `在 %1 末端加入字元 %2` |
| CPP_STRING_CLEAR_MSG0 | `%1 .clear()` | `清空 %1` |

### 型別轉換

| Key | 修復前（zh-TW） | 修復後（zh-TW） |
|-----|-----------------|-----------------|
| CPP_TO_STRING_MSG0 | `to_string( %1 )` | `將 %1 轉為文字` |
| CPP_STOI_MSG0 | `stoi( %1 )` | `將 %1 轉為整數` |
| CPP_STOD_MSG0 | `stod( %1 )` | `將 %1 轉為小數` |

### cstdlib / cctype / algorithm / numeric / utility

| Key | 修復前（zh-TW） | 修復後（zh-TW） |
|-----|-----------------|-----------------|
| CPP_RAND_MSG0 | `rand()` | `產生隨機數` |
| CPP_SRAND_MSG0 | `srand( %1 )` | `設定亂數種子 %1` |
| CPP_ABS_MSG0 | `abs( %1 )` | `取絕對值 %1` |
| CPP_EXIT_MSG0 | `exit( %1 )` | `結束程式（代碼 %1）` |
| CPP_SWAP_MSG0 | `swap( %1 , %2 )` | `交換 %1 與 %2` |
| CPP_MIN_MSG0 | `min( %1 , %2 )` | `%1 和 %2 的較小值` |
| CPP_MAX_MSG0 | `max( %1 , %2 )` | `%1 和 %2 的較大值` |
| CPP_MAKE_PAIR_MSG0 | `make_pair( %1 , %2 )` | `建立配對（%1, %2）` |
| CPP_IOTA_MSG0 | `iota（...）` | `遞增填充 %1（起始 %2, 間距 %3）` |
| CPP_PARTIAL_SUM_MSG0 | `partial_sum（...）` | `前綴和 %1 存入 %2（運算 %3）` |
| CPP_GCD_MSG0 | `__gcd（...）` | `%1 和 %2 的最大公因數` |
| CPP_LCM_MSG0 | `lcm（...）` | `%1 和 %2 的最小公倍數` |

### 泛用容器操作（container generics）

| Key | 修復前（zh-TW） | 修復後（zh-TW） |
|-----|-----------------|-----------------|
| CPP_CONTAINER_EMPTY_MSG0 | `%1 .empty()` | `%1 是否為空` |
| CPP_CONTAINER_PUSH_MSG0 | `%1 .push( %2 )` | `將 %2 推入 %1` |
| CPP_CONTAINER_POP_MSG0 | `%1 .pop()` | `彈出 %1 的元素` |
| CPP_CONTAINER_CLEAR_MSG0 | `%1 .clear()` | `清空 %1` |
| CPP_CONTAINER_PUSH_BACK_MSG0 | `%1 .push_back( %2 )` | `在 %1 末端加入 %2` |
| CPP_CONTAINER_ERASE_MSG0 | `%1 .erase( %2 )` | `從 %1 移除 %2` |
| CPP_CONTAINER_COUNT_MSG0 | `%1 .count( %2 )` | `%1 中 %2 的數量` |

## 驗證

- TypeScript：✅ 無錯誤
- npm test：✅ 2705 passed, 0 failed
- P1 殘留：0 個（`.method()` 語法標籤已全部消除）

## 風格一致性

修復後各 category 的風格模式：

| Category | 中文句式 | 英文句式 |
|----------|---------|---------|
| containers | `動詞 + 容器 + 元素` / `容器 + 是否為空` | `Verb + element + prep + container` / `Is container empty` |
| string methods | `動詞 + 字串 + 參數` | `Verb + param + prep + string` |
| type conversion | `將 X 轉為 Y` | `Convert X to Y` |
| math/algorithm | `動詞 + 參數` / `X 和 Y 的 結果` | `Verb + params` / `Result of X and Y` |
