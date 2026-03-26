# 前端與 LINE Bot 整合指南

## 🎯 整合架構

```
用戶透過 LINE Bot 操作
         ↓
    LINE Bot 後端
    (收集資料存入資料庫)
         ↓
    REST API 端點
         ↓
    React 前端顯示
```

## 📡 後端 API 端點

後端已提供以下 REST API 端點：

### 基礎 URL
- 開發環境: `http://localhost:3000`
- 生產環境: 你的部署 URL

### API 端點列表

| 端點 | 方法 | 說明 | 回應範例 |
|------|------|------|----------|
| `/api/user/:lineUserId` | GET | 取得用戶資料 | `{ success: true, data: { id, displayName, bankroll } }` |
| `/api/assets/:lineUserId` | GET | 取得資產列表（含即時價格） | `{ success: true, data: [{symbol, name, currentPrice, ...}] }` |
| `/api/transactions/:lineUserId` | GET | 取得交易記錄 | `{ success: true, data: [{date, type, amount, category}] }` |
| `/api/portfolio/:lineUserId` | GET | 取得投資組合摘要 | `{ success: true, data: {totalValue, totalProfit, assets} }` |
| `/api/settings/:lineUserId` | GET | 取得策略參數 | `{ success: true, data: {kellyWinProbability, kellyOdds} }` |

## 🔧 前端設定

### 1. 建立環境變數檔案

在專案根目錄建立 `.env.local`:

```env
VITE_API_URL=http://localhost:3000
```

生產環境改為你的後端 URL：
```env
VITE_API_URL=https://your-backend.onrender.com
```

### 2. 使用 API 服務

前端已提供 `services/api.ts` 檔案，直接引入即可：

```typescript
import { getPortfolio, getAssets, getTransactions } from '../services/api';

// 在組件中使用
const portfolio = await getPortfolio();
const assets = await getAssets();
const transactions = await getTransactions(50);
```

### 3. 範例組件

已建立 `components/LivePortfolio.tsx` 作為範例：

```typescript
import LivePortfolio from './components/LivePortfolio';

function App() {
  return (
    <div>
      <LivePortfolio />
    </div>
  );
}
```

## 🚀 完整使用流程

### 開發環境

#### 1. 啟動後端（在 server/ 目錄）
```bash
cd server
npm run dev
```
後端會運行在 `http://localhost:3000`

#### 2. 啟動前端（在專案根目錄）
```bash
npm run dev
```
前端會運行在 `http://localhost:5173`

#### 3. 透過 LINE Bot 新增資料
1. 在 LINE 中輸入 `TSLA` 查詢股價
2. 點擊 "買入" 按鈕
3. 輸入股數（例如 `10`）
4. Bot 會儲存到資料庫

#### 4. 在前端查看資料
1. 開啟前端網頁
2. 資料會自動從後端 API 載入
3. 點擊 "重新整理" 即時更新

## 📊 資料流向範例

### 買入股票流程

```
LINE 用戶輸入: "買入 TSLA"
    ↓
LINE Bot 回應: "請輸入股數"
    ↓
用戶輸入: "10"
    ↓
後端儲存至 Assets 表:
{
  userId: "demo_user_001",
  symbol: "TSLA",
  quantity: 10,
  avgPrice: 240.50
}
    ↓
前端呼叫: GET /api/assets/demo_user_001
    ↓
前端顯示: TSLA 持倉資訊
```

### 記帳流程

```
LINE 用戶輸入: "-120"
    ↓
LINE Bot 回應: [飲食][交通][居住] 選單
    ↓
用戶選擇: "飲食"
    ↓
後端儲存至 Transactions 表:
{
  userId: "demo_user_001",
  type: "expense",
  amount: 120,
  category: "飲食"
}
    ↓
前端呼叫: GET /api/transactions/demo_user_001
    ↓
前端顯示: 交易記錄列表
```

## 🔐 生產環境：LINE Login 整合

目前使用 Mock User ID (`demo_user_001`)，生產環境建議整合 LINE Login：

### 1. 安裝 LINE LIFF SDK

```bash
npm install @line/liff
```

### 2. 初始化 LIFF

```typescript
import liff from '@line/liff';

// 在 App.tsx 中初始化
useEffect(() => {
  liff.init({ liffId: 'YOUR_LIFF_ID' })
    .then(() => {
      if (liff.isLoggedIn()) {
        const profile = liff.getProfile();
        // 使用真實的 LINE User ID
        setUserId(profile.userId);
      } else {
        liff.login();
      }
    });
}, []);
```

### 3. 更新 API 呼叫

```typescript
import { setUserId } from '../services/api';

// 登入後設定真實 User ID
const profile = await liff.getProfile();
setUserId(profile.userId);

// 之後的 API 呼叫會使用真實 ID
const portfolio = await getPortfolio();
```

## 🎨 整合到現有組件

### 更新 Portfolio.tsx

```typescript
import { useEffect, useState } from 'react';
import { getAssets } from '../services/api';
import type { Asset } from '../types';

export default function Portfolio() {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    const data = await getAssets();
    // 將 API 資料轉換為前端格式
    setAssets(data.map(asset => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type as 'Stock' | 'Crypto' | 'ETF',
      quantity: asset.quantity,
      avgPrice: asset.avgPrice,
      currentPrice: asset.currentPrice,
      change24h: asset.profitPercent,
      history: [] // 暫時沒有歷史數據
    })));
  };

  // ... 原有的渲染邏輯
}
```

### 更新 Ledger.tsx

```typescript
import { useEffect, useState } from 'react';
import { getTransactions } from '../services/api';
import type { Transaction } from '../types';

export default function Ledger() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const data = await getTransactions(50);
    setTransactions(data.map(t => ({
      id: t.id,
      date: t.date,
      type: t.type,
      amount: t.amount,
      category: t.category,
      note: t.note
    })));
  };

  // ... 原有的渲染邏輯
}
```

## 🧪 測試整合

### 1. 測試後端 API（使用瀏覽器或 Postman）

```
GET http://localhost:3000/api/user/demo_user_001
GET http://localhost:3000/api/portfolio/demo_user_001
GET http://localhost:3000/api/transactions/demo_user_001
```

### 2. 在 LINE Bot 中新增測試資料

```
輸入: TSLA
點擊: 買入
輸入: 10

輸入: -120
選擇: 飲食
```

### 3. 確認前端顯示

重新整理前端頁面，應該會看到剛才在 LINE Bot 中輸入的資料。

## 📦 部署注意事項

### 後端部署（Render / Railway）

1. 設定環境變數:
   - `LINE_CHANNEL_SECRET`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `DATABASE_URL` (PostgreSQL)

2. 更新 Webhook URL 為生產環境 URL

### 前端部署（Vercel / Netlify）

1. 設定環境變數:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```

2. 確認 CORS 已在後端啟用（已設定）

## 🎉 完成！

現在你有一個完整的系統：

- ✅ 用戶透過 LINE Bot 記帳和買賣股票
- ✅ 資料儲存在後端資料庫
- ✅ 前端透過 API 即時顯示資料
- ✅ 支援即時股價查詢
- ✅ 整合凱利公式和馬丁格爾策略

需要進一步協助，隨時告訴我！
