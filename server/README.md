# SmartCapital Server

SmartCapital 的 Node.js 後端，提供 REST API、LINE Webhook、排程推播與股價警示服務。

## 技術架構

```
Node.js 22 + TypeScript
├── Express.js
├── @line/bot-sdk (LINE Messaging API)
├── Prisma ORM + PostgreSQL
├── JWT 驗證 (jsonwebtoken)
├── Gemini API (對話解析)
└── 股價來源：TWSE / Finnhub / CoinGecko
```

## 環境變數

建立 `server/.env`：

```env
PORT=3000
JWT_SECRET=your_jwt_secret           # 必填，缺少會拒絕啟動
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LIFF_ID=your_liff_id
FRONTEND_URL=http://localhost:3001
CORS_ALLOWED_ORIGINS=http://localhost:3001
DATABASE_URL=your_postgres_pooler_url
DIRECT_URL=your_postgres_direct_url
GEMINI_API_KEY=your_gemini_api_key
```

## 快速開始

```bash
cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## 常用指令

```bash
npm run build         # TypeScript 編譯
npm run start         # 啟動正式服務
npm run dev           # 開發模式（ts-node-dev）
npm run test:run      # Vitest（72 tests）
npm run prisma:studio # 視覺化資料庫管理
```

## 專案結構

```
server/src/
├── controllers/
│   ├── apiController.ts      # REST API（user/assets/transactions/accounts/budgets/alerts）
│   ├── authController.ts     # JWT 登入、訪客登入、Token 刷新
│   └── webhookController.ts  # LINE Webhook 主控制器
├── services/
│   ├── authService.ts        # JWT 生成與驗證
│   ├── stockService.ts       # 股價查詢（TWSE/Finnhub/CoinGecko）
│   ├── alertService.ts       # 價格警示邏輯
│   ├── summaryService.ts     # 每日摘要推播
│   ├── schedulerService.ts   # node-cron 排程
│   ├── exchangeRateService.ts
│   ├── databaseService.ts    # Prisma client
│   └── parserService.ts      # Gemini 對話解析
├── middleware/
│   └── authMiddleware.ts     # JWT + ownership 驗證
└── utils/
    ├── messageParser.ts      # 規則式訊息解析
    └── flexMessages.ts       # LINE Flex Message 模板
prisma/
├── schema.prisma
└── seed.ts
```

## 部署

後端部署於 **Render**（Web Service）。

- Build Command: `cd server && npm install && npx prisma generate && npm run build`
- Start Command: `cd server && npm start`
- Auto-Deploy: 啟用，在 GitHub Actions CI 通過後自動部署

## 資料模型

`User` · `Account` · `Transaction` · `Asset` · `Budget` · `PriceAlert` · `Notification`

詳見 `prisma/schema.prisma`。
