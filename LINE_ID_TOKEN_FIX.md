# 🔧 LINE ID Token 問題修復指南

## 問題描述

**現象：**
```
🔍 LIFF 登入資訊: {
  userId: 'Ucb528757211bf9eef17f7f0a391dd56e',
  displayName: 'Wen Lai',
  pictureUrl: '...',
  hasIdToken: false  // ❌ ID Token 為 null
}
❌ 無法取得 LINE ID Token
GET /api/transactions/... 401 (Unauthorized)
```

**根本原因：**
`liff.getIDToken()` 返回 `null`，這是因為 **LIFF App 的 Scopes 設定不正確**。

## ✅ 完整解決方案

### 方案 1：修復 LIFF Scope 設定（推薦）

#### 步驟 1：前往 LINE Developers Console

1. 登入 https://developers.line.biz/console/
2. 選擇你的 Provider
3. 選擇你的 LINE Login Channel（不是 Messaging API Channel）
4. 點擊 **LIFF** 標籤

#### 步驟 2：編輯 LIFF App

1. 找到你的 LIFF App（對應的 LIFF ID）
2. 點擊 **Edit** 按鈕

#### 步驟 3：檢查並修改 Scopes

**必須勾選以下 Scope：**
- ✅ **openid** - **這是關鍵！** 沒有這個就無法取得 ID Token
- ✅ **profile** - 取得用戶名稱和頭像

**可選 Scope：**
- ☑️ email - 如果需要用戶 email

**正確的設定應該是：**
```
Scopes:
☑ openid     ← 必須勾選
☑ profile    ← 必須勾選
☐ email      ← 可選
```

#### 步驟 4：儲存並重新測試

1. 點擊 **Update** 儲存設定
2. 清除瀏覽器 localStorage：
   ```javascript
   // 在瀏覽器 Console 執行
   localStorage.clear();
   ```
3. 重新載入頁面
4. 重新登入 LINE

#### 步驟 5：驗證修復

**成功的日誌應該是：**
```
🔍 LIFF 登入資訊: {
  userId: 'Ucb528757211bf9eef17f7f0a391dd56e',
  displayName: 'Wen Lai',
  pictureUrl: '...',
  hasIdToken: true  // ✅ ID Token 已取得
}
✅ LINE 登入成功，JWT Token 已獲取
```

### 方案 2：使用降級方案（暫時方案）

如果暫時無法修改 LIFF Scope 設定，系統會自動使用降級方案：

**降級邏輯：**
```typescript
if (idToken) {
  // 使用 LINE ID Token 進行完整驗證
  await lineLogin(idToken, userId, displayName);
} else {
  // 降級：使用 LINE User ID 進行訪客登入
  console.warn('⚠️ 無法取得 LINE ID Token，使用降級方案（訪客模式）');
  await guestLogin(userId, displayName);
}
```

**降級方案的日誌：**
```
⚠️ 無法取得 LINE ID Token，使用降級方案（訪客模式）
💡 請檢查 LIFF App 設定中的 Scopes 是否包含 "openid"
✅ 降級登入成功（訪客模式），JWT Token 已獲取
```

**降級方案的優缺點：**

✅ **優點：**
- 系統仍可正常運作
- 用戶可以繼續使用所有功能
- JWT Token 仍正常生成和驗證

⚠️ **缺點：**
- 沒有 LINE 官方的 ID Token 驗證
- 安全性略低於完整方案
- 無法防止有人直接調用 `/api/auth/guest-login` 冒充 LINE User ID

### 方案 3：完全禁用降級方案（最高安全）

如果你要求最高安全性，可以禁用降級方案：

**修改 `/contexts/LiffContext.tsx`：**
```typescript
if (idToken) {
  // 使用 LINE ID Token 進行完整驗證
  const authResult = await lineLogin(...);
} else {
  // 完全拒絕登入
  console.error('❌ 無法取得 LINE ID Token');
  setError('請確保 LIFF App Scopes 包含 "openid"');
  setIsLoggedIn(false);
  // 不執行降級登入
}
```

## 🔍 診斷工具

### 檢查當前 LIFF 狀態

在瀏覽器 Console 執行：

```javascript
// 檢查 LIFF 是否已初始化
console.log('LIFF ready:', liff.isReady());

// 檢查是否已登入
console.log('LIFF logged in:', liff.isLoggedIn());

// 嘗試取得 ID Token
console.log('ID Token:', liff.getIDToken());

// 檢查 Access Token
console.log('Access Token:', liff.getAccessToken());

// 檢查用戶資料
liff.getProfile().then(profile => {
  console.log('Profile:', profile);
});
```

### 檢查 JWT Token

在瀏覽器 Console 執行：

```javascript
// 檢查是否有 JWT Token
console.log('JWT Access Token:', localStorage.getItem('smartcapital_access_token'));
console.log('JWT Refresh Token:', localStorage.getItem('smartcapital_refresh_token'));
console.log('Token Expiry:', new Date(parseInt(localStorage.getItem('smartcapital_token_expiry'))));

// 檢查是否過期
const expiry = parseInt(localStorage.getItem('smartcapital_token_expiry'));
console.log('Token expired:', Date.now() > expiry);
```

### 手動測試 API

在瀏覽器 Console 執行：

```javascript
// 取得 Token
const token = localStorage.getItem('smartcapital_access_token');

// 測試 API 請求
fetch('https://smartcapital.onrender.com/api/user/YOUR_USER_ID', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => console.log('API Response:', data));
```

## 🚀 部署後驗證

### 1. 清除所有快取

```bash
# 前端
npm run build

# 確保 Vite 快取被清除
rm -rf node_modules/.vite
```

### 2. 重新部署

```bash
git add .
git commit -m "Fix LINE ID Token issue with fallback"
git push
```

### 3. 測試流程

1. **清除 localStorage**
   ```javascript
   localStorage.clear();
   ```

2. **重新載入頁面**

3. **檢查登入流程**
   - 查看 Console 日誌
   - 確認是否顯示 `hasIdToken: true`
   - 確認是否顯示 `✅ LINE 登入成功，JWT Token 已獲取`

4. **測試 API 請求**
   - 查看 Network 標籤
   - 確認 API 請求返回 200（不是 401）
   - 確認 Request Headers 中有 `Authorization: Bearer ...`

5. **測試功能**
   - 記帳功能
   - 批次刪除功能
   - 帳戶管理功能
   - 資產管理功能

## 📊 問題排查流程圖

```
用戶登入
    ↓
LIFF 初始化
    ↓
檢查是否已登入?
    ├─ 否 → liff.login()
    └─ 是 ↓
取得 Profile
    ↓
嘗試取得 ID Token
    ↓
ID Token 存在?
    ├─ 是 → lineLogin(idToken) ✅ 最安全
    │         ↓
    │     後端驗證 LINE ID Token
    │         ↓
    │     生成 JWT Token
    │         ↓
    │     前端儲存 Token
    │         ↓
    │     所有 API 請求帶 Token ✅
    │
    └─ 否 → guestLogin(userId) ⚠️ 降級方案
              ↓
          生成 JWT Token（無 LINE 驗證）
              ↓
          前端儲存 Token
              ↓
          所有 API 請求帶 Token ✅
```

## ⚠️ 重要提醒

### LIFF Scope 設定位置

**錯誤的位置：**
- ❌ Messaging API Channel 的設定
- ❌ LINE Login Channel 的 Channel settings
- ❌ Basic settings

**正確的位置：**
- ✅ LINE Login Channel → **LIFF** 標籤 → 編輯你的 LIFF App → **Scopes**

### 常見錯誤

1. **修改了錯誤的 Channel**
   - 確保是修改 **LINE Login Channel**，不是 Messaging API Channel

2. **沒有勾選 openid**
   - `openid` 是必須的，沒有它就無法取得 ID Token

3. **修改後沒有清除快取**
   - 修改 Scope 後必須清除 localStorage
   - 必須重新登入 LINE

4. **LIFF ID 不正確**
   - 確認 `.env` 中的 `VITE_LIFF_ID` 是正確的

## 🎯 最終目標

### 理想狀態（完整 LINE ID Token 驗證）

```
用戶 → LINE 登入
         ↓
    取得 ID Token
         ↓
    後端驗證 ID Token（LINE API）
         ↓
    生成 JWT Token
         ↓
    前端儲存 JWT
         ↓
    所有 API 請求帶 JWT
         ↓
    後端驗證 JWT 簽名
         ↓
    檢查資源擁有者
         ↓
    處理請求 ✅

安全等級: ✅✅✅ 最高
```

### 當前狀態（降級方案）

```
用戶 → LINE 登入
         ↓
    無法取得 ID Token（Scope 問題）
         ↓
    使用 LINE User ID 訪客登入
         ↓
    生成 JWT Token（無 LINE 驗證）
         ↓
    前端儲存 JWT
         ↓
    所有 API 請求帶 JWT
         ↓
    後端驗證 JWT 簽名
         ↓
    檢查資源擁有者
         ↓
    處理請求 ✅

安全等級: ✅✅ 高（但不是最高）
```

## 💡 建議

1. **立即修復：** 前往 LINE Developers Console 添加 `openid` scope
2. **驗證修復：** 清除快取後重新測試
3. **長期方案：** 保持 `openid` scope 啟用，使用完整的 LINE ID Token 驗證
4. **監控日誌：** 持續監控是否有 `hasIdToken: false` 的日誌

---

**修復完成後，你將擁有企業級的安全認證系統！** 🎉
