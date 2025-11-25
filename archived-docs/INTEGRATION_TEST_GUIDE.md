# 🧪 SmartCapital 整合測試指南

## ✅ 已完成的整合

### 1. 前端 LIFF 登入整合
- ✅ `index.tsx` 包裹 `<LiffProvider>`
- ✅ `App.tsx` 使用 `useLiff()` 取得登入狀態
- ✅ `services/api.ts` 自動讀取 `localStorage.lineUserId`
- ✅ 顯示載入畫面（LIFF 初始化中）
- ✅ 顯示錯誤畫面（初始化失敗）

### 2. LINE Bot 新增指令
- ✅ **帳戶管理**：`帳戶列表`、`建立帳戶`
- ✅ **資產查詢**：`總資產`、`我的投資組合`
- ✅ **幫助指令**：`說明`、`help`
- ✅ 所有指令都已加入 `messageParser.ts`
- ✅ Help 卡片已更新，包含新指令

---

## 🚀 測試步驟

### 測試 1：後端 API 測試

#### 1.1 啟動後端
```bash
cd /Users/wen/Documents/smartcapital/server
PORT=3002 node dist/index.js
```

#### 1.2 測試健康檢查
```bash
curl http://localhost:3002/health
# 預期回應：{"status":"ok","timestamp":"2025-11-24T..."}
```

#### 1.3 測試帳戶 API
```bash
# 取得帳戶列表
curl http://localhost:3002/api/accounts/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6

# 建立新帳戶
curl -X POST http://localhost:3002/api/accounts/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "name":"台新銀行",
    "type":"BANK",
    "currency":"TWD",
    "balance":100000,
    "isDefault":true
  }'
```

---

### 測試 2：前端登入流程

#### 2.1 啟動前端
```bash
cd /Users/wen/Documents/smartcapital
npm run dev
```

#### 2.2 開發模式測試（本地）
開啟瀏覽器：
```
http://localhost:5173/#/?userId=Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6
```

**檢查點：**
1. ✅ 畫面應該顯示「正在初始化...」（短暫）
2. ✅ 然後顯示主頁面
3. ✅ 打開 DevTools Console，應該看到：
   ```
   ✅ 已載入帳戶: X 個帳戶
   👤 當前用戶 ID: Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6
   ```
4. ✅ 打開 DevTools → Application → Local Storage，應該有：
   ```
   lineUserId: "Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6"
   ```

#### 2.3 生產模式測試（LIFF）
```bash
# 1. 設定 LIFF ID
echo 'VITE_LIFF_ID=你的LIFF_ID' > .env

# 2. 重新啟動前端
npm run dev

# 3. 在 LINE 中開啟 LIFF URL
https://liff.line.me/你的LIFF_ID
```

**檢查點：**
1. ✅ 如果未登入 → 自動跳轉 LINE 登入
2. ✅ 登入後 → 顯示主頁面
3. ✅ LocalStorage 應該有真實的 `lineUserId`

---

### 測試 3：LINE Bot 指令測試

#### 3.1 帳戶管理指令

在 LINE 聊天室輸入：

**指令 1：帳戶列表**
```
帳戶列表
```
**預期回應：**
```
💰 您的帳戶列表

💵 台新銀行 ⭐
   NT$ 100,000

🏦 國泰複委託 (複委託)
   $ 10,000

📊 總資產
💰 台幣：NT$ 100,000
💵 美金：$ 10,000
```

**指令 2：建立帳戶**
```
建立帳戶
```
**預期回應：**
- Flex Message 卡片
- 按鈕：「🌐 開啟設定頁面」
- 點擊後跳轉到網頁版設定頁

---

#### 3.2 資產查詢指令

**指令 3：總資產**
```
總資產
```
**預期回應：**
```
📊 總資產概覽

💰 台幣資產
   現金：NT$ 100,000
   股票：NT$ 50,000
   小計：NT$ 150,000

💵 美金資產
   現金：$ 10,000
   股票：$ 5,000
   小計：$ 15,000

🌐 查看詳細分析 → https://liff.line.me/xxxxx
```

**指令 4：我的投資組合**
```
持倉
```
**預期回應：**
- Portfolio Summary Flex Message
- 顯示所有持股
- 總資產、損益

---

#### 3.3 買股流程測試（含帳戶選擇）

**指令 5：查詢股價**
```
2330
```
**預期回應：**
- Stock Quote Card (Flex Message)
- 顯示台積電股價
- 按鈕：「💰 買入」「💸 賣出」

**指令 6：點擊「買入」按鈕**
**預期回應：**
```
💰 選擇扣款帳戶

請選擇要使用的帳戶來購買 2330.TW：
```
- Quick Reply 按鈕顯示所有可用帳戶
- 只顯示台幣帳戶（因為是台股）

**指令 7：選擇帳戶**
（點擊 Quick Reply 按鈕）

**預期回應：**
```
請輸入買入數量（股）：
```

**指令 8：輸入數量**
```
10
```
**預期回應：**
- Transaction Success Card
- 顯示交易詳情
- 帳戶餘額扣款成功

---

#### 3.4 幫助指令測試

**指令 9：說明**
```
說明
```
**預期回應：**
- Flex Message Carousel（4 張卡片）
- 卡片 1：生活記帳
- 卡片 2：投資助理
- 卡片 3：策略實驗室
- 卡片 4：快捷指令（**包含新增的帳戶管理和資產查詢指令**）

---

### 測試 4：完整 E2E 流程

#### 情境 1：新用戶首次使用
1. 開啟 LIFF URL
2. LINE 登入
3. 建立第一個帳戶（台新銀行 NT$100,000）
4. 輸入「2330」查股價
5. 點擊「買入」
6. 選擇「台新銀行」帳戶
7. 輸入數量「10」
8. 確認交易成功
9. 輸入「總資產」查看資產

#### 情境 2：複委託購買美股
1. 輸入「建立帳戶」
2. 建立「國泰複委託」（TWD, isSub=true）
3. 輸入「AAPL」查股價
4. 點擊「買入」
5. 選擇「國泰複委託」
6. 系統自動計算匯率（TWD → USD）
7. 確認交易成功

---

## 🐛 常見問題排查

### 問題 1：前端顯示「正在初始化...」一直不消失
**原因：** LIFF ID 未設定或無效

**解決方案：**
```bash
# 檢查 .env 檔案
cat .env
# 應該有：VITE_LIFF_ID=xxxxx

# 如果沒有 LIFF ID，使用開發模式
http://localhost:5173/#/?userId=Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6
```

---

### 問題 2：API 回應 404
**原因：** 後端未啟動或 port 不對

**解決方案：**
```bash
# 檢查後端是否運行
lsof -i :3002

# 重新啟動後端
cd /Users/wen/Documents/smartcapital/server
PORT=3002 node dist/index.js
```

---

### 問題 3：LINE Bot 無反應
**原因：** Webhook URL 未設定或 ngrok 未啟動

**解決方案：**
```bash
# 1. 啟動 ngrok
cd /Users/wen/Documents/smartcapital/server
ngrok http 3002

# 2. 複製 ngrok URL（例如：https://xxxx.ngrok.io）

# 3. 前往 LINE Developers Console
# 4. 設定 Webhook URL：https://xxxx.ngrok.io/webhook
# 5. 開啟「Use webhook」

# 6. 測試 webhook
curl -X POST https://xxxx.ngrok.io/webhook
```

---

### 問題 4：帳戶列表顯示「沒有任何帳戶」
**原因：** 資料庫中該用戶沒有帳戶

**解決方案：**
```bash
# 使用 API 建立帳戶
curl -X POST http://localhost:3002/api/accounts/Ue9339b8a1d6ad32bd10fe0a5e1d8f8b6 \
  -H "Content-Type: application/json" \
  -d '{
    "name":"測試錢包",
    "type":"CASH",
    "currency":"TWD",
    "balance":50000,
    "isDefault":true
  }'

# 或者在 LINE 輸入「建立帳戶」，跳轉到網頁版建立
```

---

## ✅ 檢查清單

### 前端整合
- [ ] `index.tsx` 有 `<LiffProvider>`
- [ ] `App.tsx` 有 `useLiff()` hook
- [ ] `App.tsx` 顯示載入畫面（LIFF 初始化中）
- [ ] `services/api.ts` 的 `getUserId()` 讀取 localStorage
- [ ] LocalStorage 有 `lineUserId`
- [ ] Console 顯示「✅ 已載入帳戶」

### 後端 API
- [ ] Health check API 正常（`/health`）
- [ ] 帳戶 API 正常（`/api/accounts/:userId`）
- [ ] 交易 API 正常（`/api/transactions/:userId`）
- [ ] Express JSON middleware 已加入

### LINE Bot 指令
- [ ] `說明` 指令顯示完整 help 卡片
- [ ] `帳戶列表` 指令顯示所有帳戶
- [ ] `建立帳戶` 指令顯示網頁連結
- [ ] `總資產` 指令顯示資產總覽
- [ ] `持倉` 指令顯示投資組合
- [ ] `2330` 查詢台股正常
- [ ] 買入流程顯示帳戶選擇
- [ ] 選擇帳戶後扣款成功

### 資料庫
- [ ] PostgreSQL 連線正常
- [ ] Prisma generate 成功
- [ ] User 資料存在
- [ ] Account 資料存在
- [ ] Transaction 可以建立

---

## 🎉 測試完成標準

當以下所有項目都通過時，整合即為成功：

1. ✅ 前端可以透過 LIFF 登入並取得真實 lineUserId
2. ✅ 前端 API 呼叫成功載入帳戶資料
3. ✅ LINE Bot 所有指令（記帳、查股、帳戶管理）都正常回應
4. ✅ 買股流程完整（查詢 → 選帳戶 → 輸入數量 → 交易成功）
5. ✅ 資料庫正確儲存所有交易記錄
6. ✅ 前端和 LINE Bot 資料一致

---

## 📝 下一步

測試完成後，可以進行：
1. 部署後端到 Render
2. 部署前端到 Vercel
3. 設定正式 Webhook URL
4. 邀請測試用戶試用
5. 收集回饋並優化

---

**祝測試順利！🚀**
