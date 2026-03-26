# 🔒 安全漏洞修復總結

## 修復日期
2025-12-01

## 🚨 發現的嚴重安全漏洞

### 問題描述
原本的 API 端點缺乏授權檢查，導致**任何用戶都可以刪除、修改其他用戶的資料**。

### 受影響的端點
1. `DELETE /api/transactions/:transactionId` - 刪除交易記錄
2. `DELETE /api/accounts/:accountId` - 刪除帳戶
3. `PATCH /api/accounts/:accountId` - 更新帳戶資訊
4. `POST /api/accounts/:accountId/balance` - 更新帳戶餘額
5. `PATCH /api/price-alerts/:alertId` - 更新價格警示
6. `DELETE /api/price-alerts/:alertId` - 刪除價格警示

### 漏洞原理
這些端點只檢查資源 ID 是否存在，**沒有驗證該資源是否屬於當前用戶**。

例如，原始的 `deleteTransaction` 函數：
```typescript
// ❌ 原始代碼（不安全）
export async function deleteTransaction(req: Request, res: Response) {
  const { transactionId } = req.params;

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  });

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  // 直接刪除，沒有檢查擁有者！
  await prisma.transaction.delete({ where: { id: transactionId } });
}
```

## ✅ 已實施的修復

### 1. 新增授權驗證機制

所有受影響的端點都加入了以下安全檢查：

```typescript
// ✅ 修復後的代碼（安全）
export async function deleteTransaction(req: Request, res: Response) {
  const { transactionId } = req.params;
  const { lineUserId } = req.query;

  // 🔒 安全檢查 1：必須提供 lineUserId
  if (!lineUserId || typeof lineUserId !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: lineUserId is required'
    });
  }

  // 查詢交易並包含用戶資訊
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: true }
  });

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  // 🔒 安全檢查 2：驗證交易擁有者
  if (transaction.user.lineUserId !== lineUserId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: You can only delete your own transactions'
    });
  }

  // 驗證通過，執行刪除
  await prisma.transaction.delete({ where: { id: transactionId } });
}
```

### 2. 實現批次刪除功能

新增了 `POST /api/transactions/batch-delete` 端點，支援批次刪除交易記錄。

**特點：**
- ✅ 批次驗證所有交易的擁有者
- ✅ 自動回滾帳戶餘額
- ✅ 提供詳細的刪除結果報告
- ✅ 部分失敗也會繼續處理其他交易

**使用範例：**
```typescript
POST /api/transactions/batch-delete
Content-Type: application/json

{
  "lineUserId": "U1234567890abcdef",
  "transactionIds": ["tx1", "tx2", "tx3"]
}
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "deletedCount": 3,
    "totalRequested": 3,
    "errors": []
  }
}
```

## 📝 修復的端點清單

### 交易相關
- ✅ `DELETE /api/transactions/:transactionId` - 新增 lineUserId 驗證
- ✅ `POST /api/transactions/batch-delete` - 新增批次刪除功能（含授權）

### 帳戶相關
- ✅ `DELETE /api/accounts/:accountId` - 新增 lineUserId 驗證
- ✅ `PATCH /api/accounts/:accountId` - 新增 lineUserId 驗證
- ✅ `POST /api/accounts/:accountId/balance` - 新增 lineUserId 驗證

### 價格警示相關
- ✅ `PATCH /api/price-alerts/:alertId` - 新增 lineUserId 驗證
- ✅ `DELETE /api/price-alerts/:alertId` - 新增 lineUserId 驗證

## 🔐 安全機制說明

### 雙重驗證
1. **身份驗證（Authentication）**：要求提供 `lineUserId`
2. **授權驗證（Authorization）**：驗證資源擁有者與當前用戶是否一致

### HTTP 狀態碼
- `401 Unauthorized`：未提供 lineUserId
- `403 Forbidden`：提供了 lineUserId 但資源不屬於該用戶
- `404 Not Found`：資源不存在

### 資料庫查詢優化
使用 Prisma 的 `include` 功能一次性查詢資源及其擁有者資訊，減少資料庫查詢次數。

## 🧪 測試建議

### 1. 正常流程測試
```bash
# 刪除自己的交易（應該成功）
curl -X DELETE "http://localhost:3000/api/transactions/tx123?lineUserId=U1234567890abcdef"
```

### 2. 未授權測試
```bash
# 嘗試刪除別人的交易（應該失敗 403）
curl -X DELETE "http://localhost:3000/api/transactions/tx123?lineUserId=WRONG_USER_ID"
```

### 3. 批次刪除測試
```bash
curl -X POST "http://localhost:3000/api/transactions/batch-delete" \
  -H "Content-Type: application/json" \
  -d '{
    "lineUserId": "U1234567890abcdef",
    "transactionIds": ["tx1", "tx2", "tx3"]
  }'
```

## 📋 前端集成注意事項

所有受影響的端點現在都需要提供 `lineUserId`：

### DELETE 請求（query parameter）
```typescript
// 單個刪除
await fetch(`/api/transactions/${transactionId}?lineUserId=${currentUser.lineUserId}`, {
  method: 'DELETE'
});

// 刪除帳戶
await fetch(`/api/accounts/${accountId}?lineUserId=${currentUser.lineUserId}`, {
  method: 'DELETE'
});

// 刪除警示
await fetch(`/api/price-alerts/${alertId}?lineUserId=${currentUser.lineUserId}`, {
  method: 'DELETE'
});
```

### POST/PATCH 請求（body）
```typescript
// 批次刪除
await fetch('/api/transactions/batch-delete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lineUserId: currentUser.lineUserId,
    transactionIds: selectedIds
  })
});

// 更新帳戶
await fetch(`/api/accounts/${accountId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lineUserId: currentUser.lineUserId,
    name: newName
  })
});
```

## 🚀 部署檢查清單

- [x] 修復所有受影響的端點
- [x] 新增批次刪除功能
- [x] TypeScript 編譯成功
- [ ] 更新前端代碼以傳遞 lineUserId
- [ ] 執行整合測試
- [ ] 部署到生產環境
- [ ] 監控錯誤日誌

## 📖 相關文件

- 修改的文件：
  - `/server/src/controllers/apiController.ts` - 主要的 API 控制器
  - `/server/src/index.ts` - 路由配置

## 👤 聯絡資訊

如有任何問題或需要協助，請聯繫開發團隊。
