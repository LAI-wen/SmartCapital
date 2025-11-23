# SmartCapital LINE Bot Server

一個整合記帳與投資分析的 LINE Bot 後端系統，支援「對話即記帳」與「智慧投資助理」功能。

## 功能特色

### 📊 生活記帳模式
- 輸入 `-120` 或 `+5000` 快速記錄收支
- 自動彈出分類選單（飲食、交通、居住等）
- 完整的交易歷史記錄

### 💹 投資助理模式
- 輸入股票代號（如 `TSLA`、`2330`）查詢即時行情
- 顯示精美的 Flex Message 行情卡片
- 整合凱利公式建議倉位
- 馬丁格爾救援點位計算
- 一鍵買入/賣出記錄

### 🧮 策略計算
- **凱利公式**: 根據勝率與賠率計算最佳投資比例
- **馬丁格爾**: 虧損時自動計算救援點位
- **持倉管理**: 自動追蹤平均成本與報酬率

## 技術架構

```
Node.js 18+ + TypeScript
├── Express.js (Web Framework)
├── @line/bot-sdk (LINE Messaging API)
├── Prisma ORM (Database)
├── SQLite (Development) / PostgreSQL (Production)
└── Yahoo Finance API (股價數據)
```

## 快速開始

### 1. 安裝相依套件

```bash
cd server
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env` 並填入您的 LINE Bot 憑證：

```bash
cp .env.example .env
```

編輯 `.env`：

```env
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
DATABASE_URL="file:./dev.db"
PORT=3000
```

> 如何取得 LINE Bot 憑證？請參考下方的「LINE Bot 設定」章節。

### 3. 初始化資料庫

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

伺服器將啟動在 `http://localhost:3000`

### 5. 暴露本地伺服器 (開發環境)

使用 ngrok 將本地伺服器暴露到公網：

```bash
ngrok http 3000
```

複製 ngrok 提供的 HTTPS URL (例如: `https://abc123.ngrok.io`)

### 6. 設定 LINE Webhook URL

前往 [LINE Developers Console](https://developers.line.biz/console/)：

1. 選擇您的 Messaging API Channel
2. 在 "Messaging API" 分頁中找到 "Webhook settings"
3. 設定 Webhook URL: `https://abc123.ngrok.io/webhook`
4. 啟用 "Use webhook"
5. 點擊 "Verify" 驗證連線

## LINE Bot 設定教學

### 建立 LINE Bot

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 建立新的 Provider (如果還沒有)
3. 建立新的 Channel → 選擇 "Messaging API"
4. 填寫 Channel 資訊：
   - Channel name: SmartCapital Bot
   - Channel description: 記帳與投資助理
   - Category: Finance

### 取得憑證

1. **Channel Secret**:
   - 在 Channel 的 "Basic settings" 分頁中
   - 複製 "Channel secret"

2. **Channel Access Token**:
   - 在 "Messaging API" 分頁中
   - 點擊 "Issue" 按鈕生成 Token
   - 複製 "Channel access token (long-lived)"

### 設定 Webhook

1. 在 "Messaging API" 分頁中
2. 找到 "Webhook settings"
3. 設定 Webhook URL
4. 啟用 "Use webhook"
5. 停用 "Auto-reply messages" (避免與 Bot 衝突)
6. 停用 "Greeting messages" (可選)

## 專案結構

```
server/
├── src/
│   ├── controllers/
│   │   └── webhookController.ts    # LINE Webhook 主控制器
│   ├── services/
│   │   ├── stockService.ts         # 股價查詢服務
│   │   ├── strategyService.ts      # 策略計算服務
│   │   └── databaseService.ts      # 資料庫操作服務
│   ├── utils/
│   │   ├── flexMessages.ts         # LINE Flex Message 模板
│   │   └── messageParser.ts        # 訊息解析器
│   └── index.ts                    # Express 伺服器主程式
├── prisma/
│   └── schema.prisma               # 資料庫 Schema
├── package.json
├── tsconfig.json
└── .env.example
```

## API 端點

### `GET /`
主頁，顯示伺服器狀態與資訊

### `GET /health`
健康檢查端點
```json
{
  "status": "ok",
  "timestamp": "2023-10-25T10:30:00.000Z",
  "service": "SmartCapital LINE Bot"
}
```

### `POST /webhook`
LINE Webhook 端點（由 LINE Platform 調用）

## 使用範例

### 記帳功能

```
User: -120
Bot: [顯示分類選單]
User: [選擇 "飲食"]
Bot: ✅ 已記錄支出
     類別: 飲食
     金額: -$120
```

### 投資查詢

```
User: TSLA
Bot: [顯示 TSLA 行情卡片]
     - 現價、漲跌幅
     - 💡 凱利建議: 可買入 $5,000
     - 🛡️ 救援點位: $215.00
     - [買入] [賣出] 按鈕
```

### 買入操作

```
User: [點擊 "買入 TSLA"]
Bot: 請輸入要買入的股數
     (TSLA @ $240.50)
User: 10
Bot: ✅ 買入成功！
     TSLA x 10 股
     單價: $240.50
     總計: $2,405.00
```

## 資料庫管理

### 查看資料庫內容

```bash
npm run prisma:studio
```

會啟動 Prisma Studio 在 `http://localhost:5555`，可視覺化管理資料庫。

### 建立新的 Migration

```bash
npx prisma migrate dev --name your_migration_name
```

### 重置資料庫

```bash
npx prisma migrate reset
```

## 部署到生產環境

### 推薦平台

1. **Render** (推薦)
2. **Railway**
3. **Heroku**
4. **Vercel** (需使用 Serverless Functions)

### Render 部署步驟

1. 建立 GitHub Repository 並推送程式碼
2. 前往 [Render Dashboard](https://dashboard.render.com/)
3. New → Web Service
4. 連接 GitHub Repository
5. 設定：
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm start`
   - Environment Variables: 新增 `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `DATABASE_URL`
6. 部署完成後，複製 URL 並設定到 LINE Webhook

### 環境變數 (生產環境)

```env
LINE_CHANNEL_SECRET=your_secret
LINE_CHANNEL_ACCESS_TOKEN=your_token
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=3000
NODE_ENV=production
```

## 故障排除

### Webhook 驗證失敗
- 確認 ngrok 正在運行
- 確認 Webhook URL 正確 (https://.../webhook)
- 確認 `.env` 中的 `LINE_CHANNEL_SECRET` 正確

### 股價查詢失敗
- Yahoo Finance API 有時會有延遲，請稍後重試
- 確認股票代碼正確 (美股用 AAPL, 台股用 2330.TW)

### Prisma 錯誤
- 確認已執行 `npm run prisma:generate`
- 確認資料庫檔案權限正確

## 授權

MIT License

## 開發者

SmartCapital Team

## 相關文件

- [LINE Messaging API 文件](https://developers.line.biz/en/docs/messaging-api/)
- [Prisma 文件](https://www.prisma.io/docs)
- [架構設計文件](../LINEBOT_ARCHITECTURE.md)
