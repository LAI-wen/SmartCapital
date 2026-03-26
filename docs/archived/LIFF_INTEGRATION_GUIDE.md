# LINE LIFF 整合完整指南

這份文件說明如何將 SmartCapital 與 LINE Login (LIFF) 整合，實現無縫登入體驗。

## 🎯 目標

1. ✅ 用戶在 LINE Bot 點擊連結自動登入網站
2. ✅ 自動取得 LINE User ID，顯示個人資料
3. ✅ 前端顯示即時的投資與記帳資料
4. ✅ 無需額外的帳號密碼系統

---

## 📱 方案選擇

### 方案 A: LIFF (LINE Front-end Framework) - 推薦 ⭐
- **優點**: 原生 LINE 整合，無縫登入，最佳用戶體驗
- **缺點**: 需要申請 LIFF Channel
- **適合**: 正式上線使用

### 方案 B: 簡易 URL 參數傳遞 - 快速測試
- **優點**: 無需額外設定，立即可用
- **缺點**: 安全性較低，僅適合測試
- **適合**: 開發測試階段

---

## 🚀 快速實作（方案 B - 測試用）

### 1. 在 LINE Bot 加入「查看網站」指令

更新 `webhookController.ts`，加入網站連結功能：

```typescript
// 在 parseMessage 中加入
case 'WEBSITE':
  await this.handleWebsiteLink(lineUserId);
  break;
```

加入處理函數：

```typescript
private async handleWebsiteLink(lineUserId: string): Promise<void> {
  const webUrl = `https://your-domain.com/#/?userId=${lineUserId}`;
  // 開發環境可以用 ngrok URL

  await this.client.pushMessage(lineUserId, {
    type: 'text',
    text: `🌐 查看你的投資組合\n\n點擊下方連結：\n${webUrl}`
  });
}
```

### 2. 前端讀取 URL 參數

修改 `App.tsx`：

```typescript
import { useEffect, useState } from 'react';

function App() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // 從 URL 讀取 userId
    const params = new URLSearchParams(window.location.search);
    const userIdFromUrl = params.get('userId');

    if (userIdFromUrl) {
      setUserId(userIdFromUrl);
      localStorage.setItem('lineUserId', userIdFromUrl);
    } else {
      // 從 localStorage 讀取
      const savedUserId = localStorage.getItem('lineUserId');
      setUserId(savedUserId);
    }
  }, []);

  // 使用 userId 載入資料
  return <AppContent userId={userId} />;
}
```

---

## 🎖️ 正式方案（方案 A - LIFF）

### 步驟 1: 建立 LIFF App

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Channel
3. 進入 "LIFF" 分頁
4. 點擊 "Add" 建立新的 LIFF App

**設定：**
- **LIFF app name**: SmartCapital Web
- **Size**: Full (全螢幕)
- **Endpoint URL**: `https://your-domain.com`（或 ngrok URL）
- **Scopes**:
  - ✅ `profile` (取得用戶資料)
  - ✅ `openid` (OpenID Connect)

5. 複製 **LIFF ID** (類似 `1234567890-abcdefgh`)

### 步驟 2: 安裝 LIFF SDK

```bash
npm install @line/liff
```

### 步驟 3: 建立 LIFF 初始化組件

建立 `src/hooks/useLiff.ts`:

```typescript
import { useEffect, useState } from 'react';
import liff from '@line/liff';

const LIFF_ID = 'YOUR_LIFF_ID'; // 從 LINE Developers Console 取得

export function useLiff() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initLiff();
  }, []);

  const initLiff = async () => {
    try {
      await liff.init({ liffId: LIFF_ID });

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        setUserId(profile.userId);
        setDisplayName(profile.displayName);
        setIsLoggedIn(true);
      } else {
        // 未登入，導向登入頁
        liff.login();
      }
    } catch (error) {
      console.error('LIFF initialization failed', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (liff.isLoggedIn()) {
      liff.logout();
      setIsLoggedIn(false);
      setUserId(null);
      setDisplayName(null);
    }
  };

  return { isLoggedIn, userId, displayName, loading, logout };
}
```

### 步驟 4: 在 App.tsx 使用 LIFF

```typescript
import { useLiff } from './hooks/useLiff';

function App() {
  const { isLoggedIn, userId, displayName, loading, logout } = useLiff();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isLoggedIn) {
    return <div>Redirecting to LINE Login...</div>;
  }

  return (
    <div>
      <p>Hello, {displayName}!</p>
      <p>User ID: {userId}</p>
      <button onClick={logout}>Logout</button>
      {/* 使用 userId 載入個人資料 */}
      <Portfolio userId={userId} />
    </div>
  );
}
```

### 步驟 5: 在 LINE Bot 發送 LIFF 連結

更新 `webhookController.ts`:

```typescript
private async handleWebsiteLink(lineUserId: string): Promise<void> {
  const liffUrl = 'https://liff.line.me/YOUR_LIFF_ID';

  await this.client.pushMessage(lineUserId, {
    type: 'template',
    altText: '查看你的投資組合',
    template: {
      type: 'buttons',
      thumbnailImageUrl: 'https://your-domain.com/logo.png',
      title: '📊 SmartCapital',
      text: '點擊下方按鈕查看完整資料',
      actions: [
        {
          type: 'uri',
          label: '查看投資組合',
          uri: liffUrl
        }
      ]
    }
  });
}
```

---

## 🔄 整合即時資料到前端組件

### 修改 Portfolio 組件使用 API

建立 `src/components/PortfolioWithAPI.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { getAssets } from '../services/api';
import Portfolio from './Portfolio';

interface Props {
  userId: string;
  isPrivacyMode: boolean;
}

export default function PortfolioWithAPI({ userId, isPrivacyMode }: Props) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssets();
  }, [userId]);

  const loadAssets = async () => {
    setLoading(true);
    const data = await getAssets(userId);
    setAssets(data);
    setLoading(false);
  };

  if (loading) {
    return <div>載入中...</div>;
  }

  return <Portfolio assets={assets} isPrivacyMode={isPrivacyMode} />;
}
```

---

## 🎨 完整流程

```
用戶在 LINE Bot 輸入「網站」
    ↓
Bot 發送 LIFF 連結
    ↓
用戶點擊連結
    ↓
LIFF 自動取得 LINE Profile
    ↓
前端取得 userId 和 displayName
    ↓
呼叫 API 載入個人資料
    ↓
顯示投資組合與交易記錄
```

---

## 📝 完整的訊息處理更新

在 `messageParser.ts` 加入：

```typescript
export type MessageIntent =
  | ... // 現有的類型
  | { type: 'WEBSITE' };

// 在 parseMessage 中加入
if (/(網站|查看|website|web)/i.test(trimmed)) {
  return { type: 'WEBSITE' };
}
```

---

## 🚨 注意事項

### 開發環境
1. LIFF Endpoint URL 必須是 HTTPS（可用 ngrok）
2. 測試時可以在 LINE App 中開啟，不能用瀏覽器直接開

### 生產環境
1. 部署前端到支援 HTTPS 的平台（Vercel/Netlify）
2. 更新 LIFF Endpoint URL 為正式網域
3. 確保後端 API 也部署並設定 CORS

---

## 🎁 完成後的功能

✅ 用戶在 LINE 輸入「網站」→ 自動登入查看資料
✅ 無需帳號密碼
✅ 自動同步 LINE Bot 資料
✅ 支援隱私模式
✅ 即時股價更新

需要我協助你實作哪個方案？
- A. 快速測試方案（URL 參數）
- B. 完整 LIFF 方案
