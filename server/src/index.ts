/**
 * SmartCapital LINE Bot Server
 * Express + LINE Bot SDK + Prisma
 */

import express, { Request, Response, NextFunction } from 'express';
import { middleware, MiddlewareConfig, WebhookEvent, Client, ClientConfig } from '@line/bot-sdk';
import dotenv from 'dotenv';
import { WebhookController } from './controllers/webhookController.js';
import { disconnectDatabase } from './services/databaseService.js';
import * as apiController from './controllers/apiController.js';

// 載入環境變數
dotenv.config();

// LINE Bot 設定
const lineConfig: ClientConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
};

const middlewareConfig: MiddlewareConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

// 驗證必要的環境變數
if (!lineConfig.channelSecret || !lineConfig.channelAccessToken) {
  console.error('❌ Error: LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN must be set in .env file');
  process.exit(1);
}

// 建立 LINE Client
const client = new Client(lineConfig);

// 建立 Webhook Controller
const webhookController = new WebhookController(client);

// 建立 Express App
const app = express();
const PORT = process.env.PORT || 3000;

// JSON Body Parser（必須在 LINE middleware 之前）
app.use('/api', express.json());

// 健康檢查端點
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SmartCapital LINE Bot'
  });
});

// CORS 設定（允許前端存取）
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// REST API 端點（供前端使用）
app.get('/api/user/:lineUserId', apiController.getUser);
app.get('/api/assets/:lineUserId', apiController.getAssets);
app.post('/api/assets/:lineUserId/upsert', apiController.upsertAssetAPI);
app.post('/api/assets/:lineUserId/reduce', apiController.reduceAssetAPI);
app.post('/api/assets/:lineUserId/import', apiController.importAssetAPI); // 新增：導入既有持股
app.get('/api/transactions/:lineUserId', apiController.getTransactions);
app.post('/api/transactions/:lineUserId', apiController.createTransaction);
app.delete('/api/transactions/:transactionId', apiController.deleteTransaction);
app.get('/api/portfolio/:lineUserId', apiController.getPortfolio);
app.get('/api/settings/:lineUserId', apiController.getSettings);

// 通知 API 端點
app.get('/api/notifications/:lineUserId', apiController.getNotifications);
app.post('/api/notifications/:notificationId/read', apiController.markNotificationAsRead);
app.post('/api/notifications/:lineUserId/read-all', apiController.markAllNotificationsAsRead);

// 帳戶管理 API 端點
app.get('/api/accounts/:lineUserId', apiController.getAccounts);
app.post('/api/accounts/:lineUserId', apiController.createNewAccount);
app.patch('/api/accounts/:accountId', apiController.updateAccountInfo);
app.post('/api/accounts/:accountId/balance', apiController.updateBalance);
app.delete('/api/accounts/:accountId', apiController.removeAccount);

// 轉帳 API 端點
app.post('/api/transfers/:lineUserId', apiController.createNewTransfer);
app.get('/api/transfers/:lineUserId', apiController.getTransfers);

// 股票搜尋 API 端點
app.get('/api/stocks/search', apiController.searchStocksAPI);

// 匯率 API 端點
app.get('/api/exchange-rates', apiController.getExchangeRatesAPI);
app.get('/api/exchange-rates/convert', apiController.convertCurrencyAPI);

// LINE Webhook 端點
app.post('/webhook', middleware(middlewareConfig), async (req: Request, res: Response) => {
  const events: WebhookEvent[] = req.body.events;

  console.log(`📨 Received ${events.length} event(s)`);

  // 處理每個事件
  const results = await Promise.all(
    events.map(async (event) => {
      try {
        await webhookController.handleEvent(event);
        return { success: true };
      } catch (error) {
        console.error('Error processing event:', error);
        return { success: false, error };
      }
    })
  );

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Processed ${successCount}/${events.length} event(s) successfully`);

  res.json({ status: 'ok' });
});

// 根路徑
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <title>SmartCapital LINE Bot</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #F9F8F4;
            color: #44403C;
          }
          h1 { color: #769F86; }
          .status {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          code {
            background: #E5E5E5;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
          }
        </style>
      </head>
      <body>
        <h1>📊 SmartCapital LINE Bot</h1>
        <div class="status">
          <p><strong>Status:</strong> Running ✅</p>
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Webhook URL:</strong> <code>${req.protocol}://${req.get('host')}/webhook</code></p>
        </div>
        <h2>功能特色</h2>
        <ul>
          <li>💰 生活記帳 - 快速記錄收支</li>
          <li>📈 投資助理 - 即時股價查詢</li>
          <li>🧮 凱利公式 - 智慧倉位建議</li>
          <li>🛡️ 馬丁格爾 - 救援點位計算</li>
        </ul>
        <h2>使用方式</h2>
        <ol>
          <li>將 Webhook URL 設定到 LINE Developers Console</li>
          <li>加入您的 LINE Bot 為好友</li>
          <li>開始對話即可使用！</li>
        </ol>
      </body>
    </html>
  `);
});

// 錯誤處理
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 啟動伺服器
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   SmartCapital LINE Bot Server Started   ║
╚═══════════════════════════════════════════╝

🚀 Server running on port ${PORT}
📡 Webhook: http://localhost:${PORT}/webhook
💚 Health Check: http://localhost:${PORT}/health

✨ Ready to receive LINE messages!
  `);
});

// 優雅關閉
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');

  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  await disconnectDatabase();
  console.log('✅ Database disconnected');

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');

  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  await disconnectDatabase();
  console.log('✅ Database disconnected');

  process.exit(0);
});
