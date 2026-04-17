# SmartCapital 部署指南

完整的部署流程，將網站上線並整合 LINE Bot。

---

## 🎯 部署目標

1. ✅ 公開網站：任何人都能訪問
2. ✅ LINE Bot 整合：自動登入查看個人資料
3. ✅ 後端 API：處理資料與 LINE Webhook

---

## 📦 部署架構

```
前端 (Vercel)
├── https://smartcapital.vercel.app
└── 靜態網站 + React App

後端 (Render)
├── https://smartcapital-api.onrender.com
└── Express API + LINE Bot + PostgreSQL

LINE Platform
├── Messaging API (Bot)
└── LIFF (網站快速登入)
```

---

## 🔧 部署步驟

### 第一階段：部署後端 (Render)

#### 1. 建立 GitHub Repository

```bash
# 初始化 git（如果還沒有）
cd /path/to/smartcapital
git init
git add .
git commit -m "Initial commit: SmartCapital Bot + Web"

# 推送到 GitHub
# 先在 GitHub 建立新的 repository
# 然後：
git remote add origin https://github.com/你的帳號/smartcapital.git
git branch -M main
git push -u origin main
```

#### 2. 部署後端到 Render

1. 前往 https://render.com/ 並註冊/登入
2. 點擊 **"New +"** → **"Web Service"**
3. 連接 GitHub Repository
4. 設定：

**Name**: `smartcapital-api`

**Root Directory**: `server`

**Environment**: `Node`

**Build Command**:
```bash
npm install && npx prisma generate && npm run build
```

**Start Command**:
```bash
npm start
```

**環境變數**（點擊 "Advanced" → "Add Environment Variable"）：
```
LINE_CHANNEL_SECRET=你的_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=你的_access_token
DATABASE_URL=postgresql://...（Render 會自動提供）
PORT=3000
NODE_ENV=production
```

5. 點擊 **"Create Web Service"**

#### 3. 建立 PostgreSQL 資料庫

1. 在 Render Dashboard，點擊 **"New +"** → **"PostgreSQL"**
2. **Name**: `smartcapital-db`
3. 點擊 **"Create Database"**
4. 複製 **Internal Database URL**
5. 回到你的 Web Service，在環境變數中更新 `DATABASE_URL`

#### 4. 執行資料庫 Migration

在 Render Web Service 的 Shell 中執行：
```bash
npx prisma migrate deploy
```

---

### 第二階段：部署前端 (Vercel)

#### 1. 安裝 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登入 Vercel

```bash
vercel login
```

#### 3. 部署

```bash
cd /path/to/smartcapital
vercel
```

按照提示操作：
- **Set up and deploy?** → Yes
- **Which scope?** → 選擇你的帳號
- **Link to existing project?** → No
- **Project name?** → smartcapital
- **Directory?** → `./`（根目錄）
- **Override settings?** → Yes
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Install Command**: `npm install`

#### 4. 設定環境變數

```bash
vercel env add VITE_API_URL production
```
輸入：`https://smartcapital-api.onrender.com`

#### 5. 重新部署

```bash
vercel --prod
```

完成後你會得到網址：`https://smartcapital.vercel.app`

---

### 第三階段：設定 LINE LIFF

#### 1. 建立 LIFF App

1. 前往 https://developers.line.biz/console/
2. 選擇你的 Channel (2008554489)
3. 點擊 "LIFF" 分頁
4. 點擊 "Add"

**設定**：
- **LIFF app name**: SmartCapital Web
- **Size**: Full
- **Endpoint URL**: `https://smartcapital.vercel.app`
- **Scopes**: ✅ profile, ✅ openid
- **Bot link feature**: On (Normal)

5. 複製 **LIFF ID**

#### 2. 更新前端環境變數

```bash
vercel env add VITE_LIFF_ID production
```
輸入你的 LIFF ID

重新部署：
```bash
vercel --prod
```

---

### 第四階段：更新 LINE Bot Webhook

1. 前往 LINE Developers Console
2. 選擇你的 Channel
3. 進入 "Messaging API" 分頁
4. 更新 **Webhook URL**：
   ```
   https://smartcapital-api.onrender.com/webhook
   ```
5. 點擊 **"Verify"** 確認連線
6. 確認 **"Use webhook"** 為啟用狀態

---

## 🎨 功能分配

### 公開網站功能（不需登入）

✅ **Dashboard** - 展示整體功能
- Mock 資料展示
- 圖表視覺化
- 功能介紹

✅ **Portfolio** - 投資組合範例
- 使用 MOCK_ASSETS
- 展示資產配置

✅ **Strategy Lab** - 策略計算器
- 凱利公式計算
- 馬丁格爾計算
- 金字塔策略
- 任何人都能使用

✅ **Ledger** - 記帳範例
- Mock 交易記錄
- 分類統計

### LINE 用戶專屬功能（需登入）

🔐 **我的資料** - 個人投資組合
- 真實持倉資料
- 交易記錄
- 從 LINE Bot 同步

---

## 🔄 網站 + LINE Bot 整合流程

### 一般用戶流程
```
訪問網站 → 瀏覽公開內容 → 使用策略計算器
```

### LINE 用戶流程
```
LINE Bot 記帳/投資
    ↓
輸入「網站」
    ↓
點擊 LIFF 連結
    ↓
自動登入網站
    ↓
查看個人資料
```

---

## 📱 LINE Bot 更新

### 1. 更新「網站」指令

修改 `webhookController.ts` 中的 `handleWebsiteLink`：

```typescript
private async handleWebsiteLink(lineUserId: string): Promise<void> {
  // 使用 LIFF URL
  const liffUrl = 'https://liff.line.me/YOUR_LIFF_ID';

  await this.client.pushMessage(lineUserId, {
    type: 'template',
    altText: '查看你的 SmartCapital 投資組合',
    template: {
      type: 'buttons',
      text: '📊 SmartCapital Web\n\n在 LINE 內查看完整資料',
      actions: [
        {
          type: 'uri',
          label: '🌐 開啟我的投資組合',
          uri: liffUrl
        }
      ]
    }
  });
}
```

### 2. Rich Menu（選配）

可以建立常駐選單：
- 📝 記帳
- 📊 查詢
- 🌐 網站
- ℹ️ 說明

---

## 🎉 完成後的使用體驗

### 場景 1：一般用戶
1. Google 搜尋到網站
2. 瀏覽功能介紹
3. 使用策略計算器
4. 可選擇加入 LINE Bot

### 場景 2：LINE 用戶
1. 在 LINE 中記帳、買股票
2. 隨時輸入「網站」查看完整資料
3. 在 LINE 內瀏覽（LIFF）
4. 資料即時同步

### 場景 3：進階用戶
1. 同時使用 LINE Bot（快速記錄）
2. 同時使用網站（深入分析）
3. 資料完全同步

---

## 💰 成本估算

- **Vercel**: 免費（個人專案）
- **Render**: 免費層（Web Service + PostgreSQL）
- **LINE**: 免費（Messaging API）

總計：**$0/月** 🎉

---

## 🚨 注意事項

### Render 免費層限制
- 15 分鐘無活動會休眠
- 第一次訪問可能較慢（需喚醒）
- 每月 750 小時免費

### Vercel 免費層限制
- 每月 100GB 頻寬
- 無限網站數量
- 自動 HTTPS

### 解決方案
- 設定定時 Ping（保持後端活躍）
- 或升級到付費方案（$7/月 Render）

---

## 📝 下一步

1. [ ] 推送程式碼到 GitHub
2. [ ] 部署後端到 Render
3. [ ] 部署前端到 Vercel
4. [ ] 建立 LIFF App
5. [ ] 更新 LINE Webhook URL
6. [ ] 測試完整流程

需要協助的話隨時說！
