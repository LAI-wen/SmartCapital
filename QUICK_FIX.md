# 🔧 快速修復指南

## 當前狀態

✅ **後端已部署成功** - 認證端點正常工作
❌ **前端還沒有重新部署** - 還在使用舊代碼
⚠️ **LIFF 初始化錯誤** - invalid authorization code

## 🚀 立即修復步驟

### 步驟 1：清除 URL 中的舊 authorization code

**問題：** LIFF 錯誤 "invalid authorization code" 是因為 URL 中有舊的登入參數

**解決方法：**

1. **直接訪問乾淨的 URL**
   ```
   # 不要用這個（帶參數的）：
   https://your-app.com/?code=xxxxx&state=xxxxx

   # 使用這個（乾淨的）：
   https://your-app.com/
   ```

2. **或者清除 URL 參數並重新載入**
   ```javascript
   // 在瀏覽器 Console 執行
   window.history.replaceState({}, document.title, window.location.pathname);
   window.location.reload();
   ```

### 步驟 2：重新部署前端

**前端代碼已經準備好了，只需要觸發重新部署：**

#### 如果使用 Vercel：
```bash
# 方法 1：推送一個小改動觸發部署
cd /Users/wen/Documents/dev/smartcapital
git add DEPLOYMENT_CHECKLIST.md QUICK_FIX.md
git commit -m "Add deployment guides"
git push

# 方法 2：在 Vercel Dashboard 手動部署
# 前往 https://vercel.com/dashboard
# 選擇你的專案
# 點擊 "Deployments"
# 點擊最新的 commit 旁邊的 "..." → "Redeploy"
```

#### 如果使用 Netlify：
```bash
# 方法 1：推送觸發部署
cd /Users/wen/Documents/dev/smartcapital
git add DEPLOYMENT_CHECKLIST.md QUICK_FIX.md
git commit -m "Add deployment guides"
git push

# 方法 2：在 Netlify Dashboard 手動部署
# 前往 https://app.netlify.com
# 選擇你的 site
# 點擊 "Deploys"
# 點擊 "Trigger deploy" → "Deploy site"
```

#### 如果使用其他平台：
推送代碼到 Git，平台會自動部署：
```bash
cd /Users/wen/Documents/dev/smartcapital
git add DEPLOYMENT_CHECKLIST.md QUICK_FIX.md
git commit -m "Add deployment guides"
git push
```

### 步驟 3：等待前端部署完成（1-3 分鐘）

### 步驟 4：測試完整流程

1. **清除所有快取**
   ```javascript
   // 在瀏覽器 Console 執行
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **訪問乾淨的 URL**
   ```
   https://your-app.com/
   ```
   （不要帶任何 ?code=xxx 參數）

3. **觀察 Console 日誌**

**期望看到（訪客模式）：**
```
🔧 No LIFF_ID found, running in guest mode
🆕 生成新的訪客 ID: Ue85c55e5c93269128859b56bbe1f914e
✅ 訪客登入成功，JWT Token 已獲取
```

**期望看到（LIFF 降級模式）：**
```
🔍 LIFF 登入資訊: {
  userId: 'Ucb528757211bf9eef17f7f0a391dd56e',
  displayName: 'Your Name',
  hasIdToken: false
}
⚠️ 無法取得 LINE ID Token，使用降級方案（訪客模式）
✅ 降級登入成功（訪客模式），JWT Token 已獲取
```

4. **檢查 Token**
   ```javascript
   // 在 Console 執行
   console.log('Token:', localStorage.getItem('smartcapital_access_token'));
   ```

5. **測試 API**
   - 所有 API 請求應該返回 **200**（不是 401）
   - Network 標籤中應該看到 `Authorization: Bearer ...`

## 🎯 為什麼會出現 "invalid authorization code" 錯誤？

### 原因

LIFF 登入流程：
```
1. 用戶點擊 LIFF App 連結
2. LINE 跳轉回你的 App，URL 帶著 ?code=xxx&state=xxx
3. LIFF SDK 使用這個 code 換取 access token
4. code 只能使用一次
5. 如果重新載入頁面，code 還在 URL 中但已經無效
6. LIFF 嘗試再次使用 → 錯誤：invalid authorization code
```

### 解決方案

**方法 1：自動清除 URL 參數（推薦）**

在 `LiffContext.tsx` 的 LIFF 初始化成功後添加：

```typescript
await liff.init({ liffId });
setIsLiffReady(true);

// ✅ 清除 URL 中的 code 參數
if (window.location.search.includes('code=')) {
  window.history.replaceState({}, document.title, window.location.pathname);
}

if (!liff.isLoggedIn()) {
  liff.login();
  return;
}
```

**方法 2：手動清除 URL**

在瀏覽器 Console 執行：
```javascript
window.history.replaceState({}, document.title, window.location.pathname);
window.location.reload();
```

**方法 3：直接訪問乾淨的 URL**

不要從 LINE 對話中打開連結（會帶 code），而是：
1. 複製你的 App URL
2. 在瀏覽器新分頁中貼上
3. 手動刪除 URL 中的 `?code=xxx&state=xxx`
4. 按 Enter

## 📝 完整檢查清單

### 前端部署檢查

- [ ] 確認前端平台（Vercel/Netlify/其他）
- [ ] 觸發重新部署
- [ ] 等待部署完成（1-3 分鐘）
- [ ] 確認部署成功（查看部署日誌）

### 測試檢查

- [ ] 清除 localStorage
- [ ] 訪問乾淨的 URL（無參數）
- [ ] 檢查 Console 日誌
- [ ] 確認有 JWT Token
- [ ] 測試 API 請求（應該返回 200）

### 功能檢查

- [ ] 能查看記帳記錄
- [ ] 能新增記帳
- [ ] 能刪除記帳
- [ ] 能批次刪除
- [ ] 能管理帳戶

## 🆘 如果還是失敗

### 檢查項目

1. **前端是否已重新部署？**
   - 查看部署平台的 Dashboard
   - 確認最新的 commit 已部署

2. **是否清除了 localStorage？**
   ```javascript
   localStorage.clear();
   ```

3. **URL 是否乾淨？**
   - 不應該有 `?code=xxx` 參數

4. **JWT Token 是否存在？**
   ```javascript
   console.log(localStorage.getItem('smartcapital_access_token'));
   ```

5. **後端是否正常？**
   ```bash
   curl https://smartcapital.onrender.com/health
   ```

### 提供診斷資訊

如果還是失敗，請提供：

1. **前端部署平台**：Vercel / Netlify / 其他？
2. **前端 URL**：你的應用網址
3. **Console 日誌**：完整的瀏覽器 Console 輸出
4. **Network 標籤**：401 錯誤的請求截圖
5. **localStorage 內容**：
   ```javascript
   console.log({
     token: localStorage.getItem('smartcapital_access_token'),
     userId: localStorage.getItem('lineUserId'),
     displayName: localStorage.getItem('displayName')
   });
   ```

## 💡 暫時測試方案（不依賴前端部署）

如果想立即測試後端是否正常工作：

```javascript
// 在瀏覽器 Console 執行

// 1. 清除舊資料
localStorage.clear();

// 2. 生成一個 Mock User ID
const mockId = 'U' + Array.from({length: 32}, () =>
  Math.floor(Math.random() * 16).toString(16)
).join('');

// 3. 手動呼叫登入 API
fetch('https://smartcapital.onrender.com/api/auth/guest-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mockUserId: mockId,
    displayName: '測試用戶'
  })
})
.then(r => r.json())
.then(data => {
  console.log('登入成功:', data);
  // 4. 儲存 Token
  localStorage.setItem('smartcapital_access_token', data.data.accessToken);
  localStorage.setItem('smartcapital_refresh_token', data.data.refreshToken);
  localStorage.setItem('smartcapital_token_expiry', Date.now() + data.data.expiresIn * 1000);
  localStorage.setItem('lineUserId', data.data.user.lineUserId);
  localStorage.setItem('displayName', data.data.user.displayName);

  console.log('✅ Token 已儲存，重新載入頁面...');
  setTimeout(() => location.reload(), 1000);
});
```

執行這段代碼後，頁面會自動重新載入，然後所有 API 請求都應該能正常工作（返回 200 而不是 401）。

---

**最快的解決方法：**
1. 推送代碼觸發前端部署
2. 等待 1-3 分鐘
3. 清除 localStorage
4. 訪問乾淨的 URL
5. 成功！✅
