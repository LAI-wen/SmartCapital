# 🔴 嚴重安全問題分析

## 當前日期
2025-12-01

## 🚨 發現的嚴重安全漏洞

### 漏洞 1：URL 參數攻擊 ⚠️⚠️⚠️

**攻擊方式：**
```javascript
// 攻擊者只需要訪問這個 URL
https://your-app.com/?userId=Ucb528757211bf9eef17f7f0a391dd56e

// 代碼會自動使用這個 ID
const userIdFromUrl = params.get('userId');
if (userIdFromUrl) {
  localStorage.setItem('lineUserId', userIdFromUrl);  // 危險！
  return userIdFromUrl;
}
```

**影響：**
- ❌ 任何人只要知道你的 User ID 就能冒充你
- ❌ 可以看到你的所有記帳、投資資料
- ❌ 可以修改、刪除你的資料
- ❌ URL 可以被分享、記錄、洩露

### 漏洞 2：localStorage 可被操控 ⚠️⚠️

**攻擊方式：**
```javascript
// 在瀏覽器控制台執行
localStorage.getItem('lineUserId')  // 看到當前 ID
localStorage.setItem('lineUserId', '受害者的ID')  // 偽裝身份
location.reload()  // 重新載入，成功冒充
```

**影響：**
- ❌ 任何能訪問設備的人都能偷取身份
- ❌ 技術人員可以輕易冒充任何人
- ❌ 沒有防護機制

### 漏洞 3：純 lineUserId 驗證 ⚠️⚠️⚠️

**當前機制：**
```typescript
// 前端
const userId = getUserId();  // 只是從 localStorage 讀取

// 後端
const { lineUserId } = req.query;  // 直接相信前端傳來的值
if (transaction.user.lineUserId !== lineUserId) {
  return 403;  // 但這個 lineUserId 可能是假的！
}
```

**問題：**
- ❌ 沒有驗證 lineUserId 是否真的屬於當前用戶
- ❌ 沒有 Token、Session、密碼等額外驗證
- ❌ 完全依賴客戶端傳來的值
- ❌ 等於「我說我是誰就是誰」

### 漏洞 4：沒有 LINE 真實登入驗證 ⚠️

**當前 LIFF 代碼：**
```typescript
if (!liffId) {
  // 如果沒有 LIFF ID，直接跳過真實驗證
  const mockUserId = generateMockUserId();
  setLineUserId(mockUserId);  // 沒有真正的 LINE 驗證
  return;
}
```

**問題：**
- ❌ 開發模式下完全沒有驗證
- ❌ Mock User ID 沒有密碼保護
- ❌ 任何人都能創建假身份

## 🎯 攻擊場景演示

### 場景 1：URL 分享攻擊
```
你：分享螢幕截圖給朋友
朋友：看到 URL 中的 ?userId=Ucb528757...
朋友：複製這個 URL 並訪問
結果：朋友可以看到你的所有資料 ❌
```

### 場景 2：localStorage 竊取
```
朋友：借用你的電腦
朋友：打開瀏覽器控制台
朋友：執行 localStorage.getItem('lineUserId')
朋友：記下你的 User ID
朋友：回家後使用這個 ID 訪問
結果：朋友可以冒充你 ❌
```

### 場景 3：猜測攻擊
```
攻擊者：知道 User ID 格式是 U + 32位16進制
攻擊者：如果資料庫有洩露或其他途徑知道某些 ID
攻擊者：直接用這些 ID 訪問
結果：可以訪問這些用戶的資料 ❌
```

## 🛡️ 需要的安全機制

### 1. JWT Token 認證 ⭐⭐⭐
```typescript
// 用戶登入時
POST /api/auth/login
{ lineUserId: "U123...", password: "1234" }

// 後端返回
{
  token: "eyJhbGciOiJIUzI1NiIs...",  // JWT Token
  expiresIn: 3600
}

// 之後所有請求都帶 Token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// 後端驗證
const decoded = jwt.verify(token, SECRET);
if (decoded.userId !== requestedUserId) {
  return 403;
}
```

### 2. PIN 碼保護 ⭐⭐
```typescript
// 訪客模式需要設置 PIN
localStorage.setItem('userPin', hash('1234'));

// 每次訪問都需要輸入 PIN
if (hash(inputPin) !== storedPin) {
  redirect to /login;
}
```

### 3. Session 管理 ⭐⭐⭐
```typescript
// 後端 Session
const sessions = new Map();
const sessionId = generateSecureRandom();
sessions.set(sessionId, { userId, expiresAt });

// Cookie
Set-Cookie: sessionId=abc123; HttpOnly; Secure

// 每次請求驗證
const session = sessions.get(sessionId);
if (!session || session.expiresAt < now) {
  return 401;
}
```

### 4. 真實 LINE 登入 ⭐⭐⭐
```typescript
// 使用 LINE LIFF SDK
const profile = await liff.getProfile();
const idToken = liff.getIDToken();  // 重要！

// 後端驗證 LINE ID Token
const verified = await verifyLineIdToken(idToken);
if (verified.userId !== profile.userId) {
  return 403;
}
```

## 📊 安全等級對比

### 當前 (完全不安全)
```
前端: lineUserId (從 localStorage 讀取)
  ↓
後端: 直接相信這個值
  ↓
結果: ❌ 任何人都能冒充
```

### 應該要有 (基本安全)
```
前端: lineUserId + PIN 碼
  ↓
後端: 驗證 PIN 是否正確
  ↓
返回: JWT Token
  ↓
之後請求: 帶 Token
  ↓
後端: 驗證 Token 簽名和過期時間
  ↓
結果: ✅ 有基本保護
```

### 最佳實踐 (高安全)
```
前端: LINE 登入按鈕
  ↓
LINE: 返回 ID Token + Access Token
  ↓
後端: 驗證 LINE Token 真實性
  ↓
後端: 創建 Session + JWT Token
  ↓
之後請求: Authorization Header + Session Cookie
  ↓
後端: 雙重驗證 (Token + Session)
  ↓
結果: ✅✅✅ 高度安全
```

## 🚨 緊急建議

### 短期方案 (1-2小時)
1. **移除 URL 參數功能** - 這是最大的漏洞
2. **添加 PIN 碼保護** - 訪客模式需要密碼
3. **添加 Token 驗證** - 基本的 JWT

### 中期方案 (1-2天)
1. **實現真實 LINE 登入** - 使用 LIFF ID Token
2. **Session 管理** - 服務器端 Session
3. **Token 刷新機制** - Refresh Token

### 長期方案 (1週)
1. **多因素認證** - Email/SMS 驗證
2. **設備指紋** - 識別可疑登入
3. **審計日誌** - 記錄所有操作
4. **異常檢測** - 自動鎖定可疑帳號

## 💡 立即行動

### 最緊急：移除 URL 參數攻擊向量

**修改這些文件：**
1. `/services/user.service.ts`
2. `/contexts/LiffContext.tsx`
3. `/components/LineBotData.tsx`

**刪除這段代碼：**
```typescript
// ❌ 刪除這個！太危險了！
const params = new URLSearchParams(window.location.search);
const userIdFromUrl = params.get('userId');
if (userIdFromUrl) {
  localStorage.setItem('lineUserId', userIdFromUrl);
  return userIdFromUrl;
}
```

### 第二步：添加 PIN 碼

創建一個簡單的 PIN 碼登入頁面，訪客首次訪問需要設置 PIN。

### 第三步：實現 JWT Token

後端生成 Token，前端所有請求都帶上 Token。

---

**需要立即修復嗎？我可以幫你實現安全的認證系統。**
