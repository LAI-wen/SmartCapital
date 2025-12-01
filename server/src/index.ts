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
import * as authController from './controllers/authController.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import { startScheduler } from './services/schedulerService.js';

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
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 🔐 認證端點（無需 Token）
app.post('/api/auth/line-login', authController.lineLogin);
app.post('/api/auth/guest-login', authController.guestLogin);
app.post('/api/auth/refresh', authController.refreshToken);
app.get('/api/auth/verify', authController.verifyTokenEndpoint);
app.post('/api/auth/logout', authController.logout);

// 🔒 受保護的 API 端點（需要 JWT Token）

// 用戶資料 API
app.get('/api/user/:lineUserId', authenticateToken, apiController.getUser);
app.get('/api/portfolio/:lineUserId', authenticateToken, apiController.getPortfolio);
app.get('/api/settings/:lineUserId', authenticateToken, apiController.getSettings);

// 資產管理 API
app.get('/api/assets/:lineUserId', authenticateToken, apiController.getAssets);
app.post('/api/assets/:lineUserId/upsert', authenticateToken, apiController.upsertAssetAPI);
app.post('/api/assets/:lineUserId/reduce', authenticateToken, apiController.reduceAssetAPI);
app.post('/api/assets/:lineUserId/import', authenticateToken, apiController.importAssetAPI);

// 交易記錄 API
app.get('/api/transactions/:lineUserId', authenticateToken, apiController.getTransactions);
app.post('/api/transactions/:lineUserId', authenticateToken, apiController.createTransaction);
app.delete('/api/transactions/:transactionId', authenticateToken, apiController.deleteTransaction);
app.post('/api/transactions/batch-delete', authenticateToken, apiController.batchDeleteTransactions);

// 通知 API
app.get('/api/notifications/:lineUserId', authenticateToken, apiController.getNotifications);
app.post('/api/notifications/:notificationId/read', authenticateToken, apiController.markNotificationAsRead);
app.post('/api/notifications/:lineUserId/read-all', authenticateToken, apiController.markAllNotificationsAsRead);

// 帳戶管理 API
app.get('/api/accounts/:lineUserId', authenticateToken, apiController.getAccounts);
app.post('/api/accounts/:lineUserId', authenticateToken, apiController.createNewAccount);
app.patch('/api/accounts/:accountId', authenticateToken, apiController.updateAccountInfo);
app.post('/api/accounts/:accountId/balance', authenticateToken, apiController.updateBalance);
app.delete('/api/accounts/:accountId', authenticateToken, apiController.removeAccount);

// 轉帳 API
app.post('/api/transfers/:lineUserId', authenticateToken, apiController.createNewTransfer);
app.get('/api/transfers/:lineUserId', authenticateToken, apiController.getTransfers);

// 價格警示 API
app.get('/api/price-alerts/:lineUserId', authenticateToken, apiController.getPriceAlerts);
app.post('/api/price-alerts/:lineUserId', authenticateToken, apiController.createPriceAlertAPI);
app.post('/api/price-alerts/:lineUserId/create-defaults', authenticateToken, apiController.createDefaultAlertsAPI);
app.patch('/api/price-alerts/:alertId', authenticateToken, apiController.updatePriceAlertAPI);
app.delete('/api/price-alerts/:alertId', authenticateToken, apiController.deletePriceAlertAPI);

// 📖 公開 API 端點（無需認證）

// 股票搜尋
app.get('/api/stocks/search', apiController.searchStocksAPI);

// 匯率查詢
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

  // 啟動排程服務
  try {
    startScheduler(client); // 傳遞 LINE Client
    console.log('⏰ 排程服務已啟動');
  } catch (error) {
    console.error('❌ 排程服務啟動失敗:', error);
  }
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
