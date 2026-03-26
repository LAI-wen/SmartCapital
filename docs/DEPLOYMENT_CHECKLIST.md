# 🚀 部署檢查清單

## 當前狀態

**最後提交：** Fix ES module imports - add .js extension to all imports
**提交 Hash：** 5af52b3

## ✅ 已完成

### 後端修改
- ✅ 創建 `/server/src/services/authService.ts`
- ✅ 創建 `/server/src/middleware/authMiddleware.ts`
- ✅ 創建 `/server/src/controllers/authController.ts`
- ✅ 修改 `/server/src/index.ts` - 添加認證路由和中間件
- ✅ 修改 `/server/src/controllers/apiController.ts` - 修復 exchangeRateService 導入
- ✅ 所有 ES module 導入都加上 `.js` 擴展名
- ✅ 安裝 `jsonwebtoken` 和 `@types/jsonwebtoken`
- ✅ Git 提交並推送

### 前端修改
- ✅ 創建 `/services/auth.service.ts`
- ✅ 修改 `/services/core/http.ts` - 自動附加 Authorization Header
- ✅ 修改 `/contexts/LiffContext.tsx` - 整合 JWT 登入 + 降級方案
- ✅ 修改 `/services/index.ts` - 導出認證服務
- ✅ Git 提交並推送（前次提交）

## 🔄 Render 部署狀態

### 後端（SmartCapital Server）

**部署 URL:** https://smartcapital.onrender.com

**檢查步驟：**

1. **等待 Render 自動部署**
   - 推送後 Render 會自動觸發部署
   - 預計需要 3-5 分鐘

2. **檢查部署日誌**
   - 前往 https://dashboard.render.com
   - 選擇你的 Web Service
   - 查看 "Logs" 標籤
   - 確認沒有錯誤

3. **驗證部署成功**
   ```bash
   # 檢查健康端點
   curl https://smartcapital.onrender.com/health

   # 應該返回:
   {
     "status": "ok",
     "timestamp": "...",
     "service": "SmartCapital LINE Bot"
   }
   ```

4. **測試認證端點是否存在**
   ```bash
   # 測試訪客登入端點
   curl -X POST https://smartcapital.onrender.com/api/auth/guest-login \
     -H "Content-Type: application/json" \
     -d '{
       "mockUserId": "U1234567890abcdef1234567890abcdef",
       "displayName": "Test User"
     }'

   # 應該返回包含 accessToken 和 refreshToken 的 JSON
   ```

### 前端（Vercel/Netlify）

**部署 URL:** 你的前端 URL

**檢查步驟：**

1. **確認前端已重新部署**
   - 前端應該在之前已經部署了最新代碼

2. **清除瀏覽器快取**
   ```javascript
   // 在瀏覽器 Console 執行
   localStorage.clear();
   sessionStorage.clear();
   ```

3. **重新載入頁面並登入**

## 🧪 測試步驟

### 步驟 1：清除快取
```javascript
// 在瀏覽器 Console 執行
localStorage.clear();
```

### 步驟 2：重新載入頁面

### 步驟 3：觀察 Console 日誌

**期望看到（無 LIFF ID 的情況）：**
```
🔧 No LIFF_ID found, running in guest mode
🆕 生成新的訪客 ID: U...
✅ 訪客登入成功，JWT Token 已獲取
```

**期望看到（有 LIFF 但無 ID Token）：**
```
🔍 LIFF 登入資訊: {
  userId: 'Ucb528757211bf9eef17f7f0a391dd56e',
  displayName: 'Your Name',
  hasIdToken: false
}
⚠️ 無法取得 LINE ID Token，使用降級方案（訪客模式）
💡 請檢查 LIFF App 設定中的 Scopes 是否包含 "openid"
✅ 降級登入成功（訪客模式），JWT Token 已獲取
```

**期望看到（完整 LINE ID Token）：**
```
🔍 LIFF 登入資訊: {
  userId: 'Ucb528757211bf9eef17f7f0a391dd56e',
  displayName: 'Your Name',
  hasIdToken: true
}
✅ LINE 登入成功，JWT Token 已獲取
```

### 步驟 4：檢查 JWT Token

```javascript
// 在瀏覽器 Console 執行
console.log('Access Token:', localStorage.getItem('smartcapital_access_token'));
console.log('Refresh Token:', localStorage.getItem('smartcapital_refresh_token'));
console.log('Expiry:', new Date(parseInt(localStorage.getItem('smartcapital_token_expiry'))));
```

**期望結果：**
- Access Token 和 Refresh Token 都有值
- Expiry 時間是未來的日期

### 步驟 5：測試 API 請求

打開 Network 標籤，執行任何操作（如查看記帳），檢查：

**期望結果：**
- ✅ 所有 API 請求返回 **200** (不是 401)
- ✅ Request Headers 中有 `Authorization: Bearer ...`
- ✅ 能正常看到資料

## ❌ 如果仍然失敗

### 問題 1：後端部署失敗

**檢查：**
```bash
# 查看 Render 部署日誌
# 應該看到：
==> Build successful 🎉
==> Deploying...
==> Running 'npm start'
╔═══════════════════════════════════════════╗
║   SmartCapital LINE Bot Server Started   ║
╚═══════════════════════════════════════════╝
```

**如果看到錯誤：**
- 檢查是否有模組找不到的錯誤
- 確認所有導入都有 `.js` 擴展名
- 檢查 `package.json` 中的依賴是否完整

### 問題 2：認證端點不存在（404）

**可能原因：**
- Render 沒有拉取最新代碼
- 需要手動觸發重新部署

**解決方法：**
1. 前往 Render Dashboard
2. 選擇你的 Service
3. 點擊 "Manual Deploy" → "Deploy latest commit"

### 問題 3：仍然返回 401

**可能原因：**
- JWT Token 沒有生成
- Token 沒有附加到請求

**調試步驟：**

1. **檢查 Token 是否存在**
   ```javascript
   console.log(localStorage.getItem('smartcapital_access_token'));
   ```

2. **手動測試登入**
   ```javascript
   // 在 Console 執行
   fetch('https://smartcapital.onrender.com/api/auth/guest-login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       mockUserId: 'U1234567890abcdef1234567890abcdef',
       displayName: 'Test'
     })
   })
   .then(r => r.json())
   .then(d => console.log(d));
   ```

3. **檢查 Authorization Header**
   - 打開 Network 標籤
   - 選擇任何一個 API 請求
   - 查看 Request Headers
   - 確認有 `Authorization: Bearer ...`

### 問題 4：LINE ID Token 仍然是 null

**這不是錯誤！** 降級方案會處理這個情況。

**如果想要完整的 LINE 驗證：**
1. 參考 `/LINE_ID_TOKEN_FIX.md`
2. 前往 LINE Developers Console
3. 在 LIFF App Scopes 中添加 `openid`

## 📝 環境變數檢查

### 後端 (Render)

確認以下環境變數已設定：

```env
# 資料庫
DATABASE_URL=postgresql://...

# LINE Bot
LINE_CHANNEL_SECRET=your-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-access-token

# JWT（新增）
JWT_SECRET=your-super-secret-key-change-in-production  # ⚠️ 重要！

# LINE Channel ID（用於 ID Token 驗證，新增）
LINE_CHANNEL_ID=your-line-channel-id  # 可選，如果沒有會使用降級方案
```

### 前端

確認以下環境變數已設定：

```env
# API URL
VITE_API_URL=https://smartcapital.onrender.com

# LIFF ID（可選）
VITE_LIFF_ID=your-liff-id  # 沒有的話會使用訪客模式
```

## 🎯 成功指標

### 前端 Console

```
✅ 訪客登入成功，JWT Token 已獲取
或
✅ 降級登入成功（訪客模式），JWT Token 已獲取
或
✅ LINE 登入成功，JWT Token 已獲取
```

### Network 標籤

```
✅ GET /api/transactions/... → 200 OK
✅ GET /api/accounts/... → 200 OK
✅ GET /api/assets/... → 200 OK
✅ Request Headers 包含: Authorization: Bearer eyJ...
```

### 功能測試

```
✅ 能查看記帳記錄
✅ 能新增記帳
✅ 能刪除記帳
✅ 能批次刪除
✅ 能管理帳戶
✅ 能查看資產
```

## 📞 需要幫助？

如果部署後仍有問題，提供以下資訊：

1. **Render 部署日誌**（最後 50 行）
2. **瀏覽器 Console 日誌**（完整輸出）
3. **Network 標籤截圖**（顯示 401 錯誤的請求）
4. **localStorage 內容**
   ```javascript
   console.log({
     accessToken: localStorage.getItem('smartcapital_access_token'),
     refreshToken: localStorage.getItem('smartcapital_refresh_token'),
     expiry: localStorage.getItem('smartcapital_token_expiry'),
     userId: localStorage.getItem('lineUserId')
   });
   ```

---

**部署完成後，你的系統將擁有完整的 JWT 認證保護！** 🚀
