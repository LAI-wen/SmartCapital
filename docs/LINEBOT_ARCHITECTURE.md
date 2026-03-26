# LINE Bot 後端架構設計

## 技術堆疊

### 後端
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **LINE SDK**: @line/bot-sdk
- **Database**: SQLite (開發) / PostgreSQL (生產)
- **ORM**: Prisma

### 外部 API
- **股價數據**: Yahoo Finance API (免費)
- **備用方案**: Finnhub API

## 系統架構

```
User (LINE App)
    ↓
LINE Platform (Webhook)
    ↓
Express Server
    ↓
├── Message Parser (訊息解析)
│   ├── 生活記帳模式 (+/-數字)
│   └── 投資助理模式 (股票代號)
│
├── Services
│   ├── Stock Service (股價查詢)
│   ├── Strategy Service (凱利/馬丁格爾計算)
│   ├── Transaction Service (記帳邏輯)
│   └── Flex Message Builder (LINE 卡片生成)
│
└── Database (Prisma ORM)
    ├── Users (LINE 用戶資料)
    ├── Transactions (交易記錄)
    ├── Assets (資產持倉)
    └── UserSettings (策略參數設定)
```

## 資料庫 Schema

### Users (用戶表)
```
- id (PK)
- lineUserId (UNIQUE)
- displayName
- bankroll (本金)
- createdAt
- updatedAt
```

### Transactions (交易記錄)
```
- id (PK)
- userId (FK → Users)
- date
- type (income/expense)
- amount
- category (飲食/交通/居住/投資...)
- note
- createdAt
```

### Assets (資產持倉)
```
- id (PK)
- userId (FK → Users)
- symbol (TSLA, BTC...)
- type (Stock/Crypto/ETF)
- quantity
- avgPrice
- createdAt
- updatedAt
```

### UserSettings (策略參數)
```
- id (PK)
- userId (FK → Users, UNIQUE)
- kellyWinProbability (勝率 %)
- kellyOdds (賠率)
- martingaleMultiplier (倍數, 預設 2)
- createdAt
- updatedAt
```

## 核心流程

### 1. 生活記帳模式
```
用戶輸入: "-120"
    ↓
Parser 判斷: 數字開頭 → 記帳模式
    ↓
回傳 Quick Reply: [飲食][交通][居住][娛樂]
    ↓
用戶選擇類別: "飲食"
    ↓
儲存至 Transactions 表
    ↓
回傳確認訊息: "✅ 已記錄 -120 元 (飲食)"
```

### 2. 投資助理模式
```
用戶輸入: "TSLA"
    ↓
Parser 判斷: 字母代號 → 股票模式
    ↓
調用 Stock Service → Yahoo Finance API
    ↓
調用 Strategy Service:
  - 讀取用戶本金 & 策略參數
  - 計算凱利建議倉位
  - 計算馬丁格爾救援點
    ↓
Flex Message Builder 生成行情卡片
    ↓
回傳卡片 + [買入][賣出] 按鈕
```

### 3. 買入/賣出操作
```
用戶點擊 "買入 TSLA"
    ↓
回傳 "請輸入股數 (例: 10)"
    ↓
用戶輸入: "10"
    ↓
計算總成本 = 現價 × 股數
    ↓
儲存至 Assets 表 (更新 avgPrice)
    ↓
回傳確認: "✅ 已買入 10 股 TSLA @ $240.50"
```

## API Endpoints (內部設計)

### Webhook
```
POST /webhook
- 接收 LINE Platform 事件
- 驗證簽名
- 路由至對應 Handler
```

### 輔助 API (供前端或測試使用)
```
GET /api/user/:lineUserId
- 取得用戶資料

GET /api/assets/:lineUserId
- 取得資產持倉

POST /api/settings/:lineUserId
- 更新策略參數

GET /api/stock/:symbol
- 查詢股價 (測試用)
```

## 環境變數 (.env)

```
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_access_token
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=development
```

## 部署建議

### 開發環境
- 使用 ngrok 暴露本地 webhook
- SQLite 資料庫

### 生產環境
- 部署至 Render / Railway / Vercel
- PostgreSQL 資料庫
- HTTPS 必須啟用 (LINE 要求)

## 安全考量

1. **Webhook 驗證**: 使用 LINE SDK 驗證請求簽名
2. **環境變數管理**: 使用 .env 並加入 .gitignore
3. **Rate Limiting**: 防止 API 濫用
4. **輸入驗證**: 所有用戶輸入需驗證 (防 SQL Injection)

## 擴展功能 (Phase 2)

- 推播通知 (價格預警)
- 定期報告 (週報/月報)
- 群組聊天支援
- 語音輸入記帳
- 圖表生成 (資產走勢圖)
