# 重構總結 - API Service Layer

## 📅 日期
2025-12-01

## 🎯 目標
將單一的 `api.ts` (736 行) 拆分為多個領域特定的服務模組，提升程式碼可維護性和可測試性。

## ✅ 已完成

### 1. **服務層拆分**
原本的 `services/api.ts` 已拆分為 8 個專注的服務模組：

| 服務模組 | 職責 | 行數 |
|---------|------|------|
| `core/http.ts` | HTTP 請求封裝、錯誤處理 | ~100 |
| `user.service.ts` | 用戶資料、投資組合、設定 | ~90 |
| `asset.service.ts` | 資產持倉管理 | ~110 |
| `transaction.service.ts` | 交易記錄 CRUD | ~60 |
| `account.service.ts` | 帳戶與轉帳管理 | ~130 |
| `stock.service.ts` | 股票搜尋 | ~30 |
| `priceAlert.service.ts` | 價格警示 | ~90 |
| `notification.service.ts` | 通知管理 | ~40 |

**總行數**: ~650 行（比原本少 86 行，移除了重複的錯誤處理）

### 2. **統一 HTTP 封裝**
創建了 `core/http.ts` 提供：
- ✅ `get<T>()` - GET 請求
- ✅ `post<T>()` - POST 請求
- ✅ `patch<T>()` - PATCH 請求
- ✅ `del()` - DELETE 請求
- ✅ `postBoolean()` - 返回布林值的 POST

**優點**:
- 統一的錯誤處理邏輯
- 減少重複代碼（原本 20+ 次重複的 try-catch）
- 更容易添加中介層功能（如認證、日誌）

### 3. **統一導出 (Barrel Export)**
創建 `services/index.ts` 統一導出所有服務：

```typescript
// 新的導入方式（推薦）
import { getUser, getAssets, createTransaction } from '../services';

// 舊的導入方式（仍然支援）
import { getUser, getAssets } from '../services/api';
```

### 4. **向後兼容**
`api.ts` 現在是一個 deprecated 檔案，重新導出所有服務：
- ✅ 不會破壞現有代碼
- ✅ 添加了 `@deprecated` JSDoc 標記
- ✅ 包含遷移指南

### 5. **組件更新**
已更新以下 7 個組件的 import 語句：

1. ✅ `BuyStockModal.tsx`
2. ✅ `OnboardingModal.tsx`
3. ✅ `PriceAlertsPage.tsx`
4. ✅ `AccountManagementPage.tsx`
5. ✅ `AnalyticsPage.tsx`
6. ✅ `Ledger.tsx`
7. ✅ `LivePortfolio.tsx`

## 📊 改進指標

### 程式碼品質
| 指標 | 改進前 | 改進後 | 提升 |
|------|-------|--------|------|
| 單檔案行數 | 736 | ~130 (最大) | ↓ 82% |
| 錯誤處理重複 | 20+ 次 | 1 次 (core/http) | ↓ 95% |
| 服務職責分離 | 1 個檔案 | 8 個模組 | ✅ |
| TypeScript 類型安全 | 部分 | 完整 | ✅ |

### 可維護性
- ✅ **單一職責原則** - 每個服務只處理一個領域
- ✅ **開放封閉原則** - 易於擴展，不需修改現有代碼
- ✅ **依賴反轉** - 組件依賴抽象接口，不依賴具體實現

### 可測試性
- ✅ **單元測試更簡單** - 每個服務可獨立測試
- ✅ **Mock 更容易** - 可針對特定服務進行 mock
- ✅ **減少測試覆蓋難度** - 小模組比大檔案容易達到 100% 覆蓋

## 🔧 技術細節

### getUserId() 優化
移動到 `user.service.ts`，統一管理用戶 ID 邏輯：

```typescript
// 優先級：localStorage > URL 參數 > Mock ID
export function getUserId(): string {
  const storedUserId = localStorage.getItem('lineUserId');
  if (storedUserId) return storedUserId;

  const params = new URLSearchParams(window.location.search);
  const userIdFromUrl = params.get('userId');
  if (userIdFromUrl) return userIdFromUrl;

  return MOCK_LINE_USER_ID;
}
```

### 類型導出優化
使用 TypeScript 的 `type` 關鍵字導出類型：

```typescript
// 改進前
import { PriceAlert, AlertType } from '../services/api';

// 改進後（明確標記為類型導入）
import { type PriceAlert, type AlertType } from '../services';
```

## 🚀 建構驗證
```bash
npm run build
```

**結果**: ✅ 建構成功
- Bundle 大小: 1,001.40 kB (gzip: 290.64 kB)
- 無錯誤、無警告（除了 chunk 大小提示）

## 📝 遷移指南

### 對於開發者
1. **新功能開發**: 使用新的服務模組
   ```typescript
   import { createAsset } from '../services/asset.service';
   ```

2. **現有代碼**: 可繼續使用，但建議遷移
   ```typescript
   // 舊的（仍可用）
   import { getUser } from '../services/api';

   // 新的（推薦）
   import { getUser } from '../services';
   ```

3. **新增 API**: 在對應的服務模組中添加
   - 用戶相關 → `user.service.ts`
   - 資產相關 → `asset.service.ts`
   - 等等...

### 何時刪除 api.ts
建議在以下條件滿足後刪除：
- ✅ 所有組件已遷移到新的 import 路徑
- ✅ 所有測試通過
- ✅ 團隊成員熟悉新結構
- ✅ 至少經過一個 sprint 週期穩定運行

## 🎓 學到的經驗

### 1. **逐步重構優於大爆炸式重寫**
- 保持向後兼容性
- 逐步遷移組件
- 持續驗證建構

### 2. **關注點分離**
- HTTP 邏輯 → `core/http.ts`
- 業務邏輯 → 各領域服務
- UI 邏輯 → 組件

### 3. **TypeScript 的威力**
- 類型安全防止錯誤
- IDE 自動補全提升開發效率
- 重構時編譯器會捕捉錯誤

## 🔮 下一步

### P0 - 高優先級
1. ✅ ~~拆分 api.ts~~ (已完成)
2. ⏳ 拆分大型組件 (Dashboard, AnalyticsPage, BuyStockModal)
3. ⏳ 提取自定義 Hooks

### P1 - 中優先級
4. ⏳ 提取共用工具函數 (currency format, P/L calculation)
5. ⏳ 創建常數檔案 (magic numbers → named constants)
6. ⏳ 統一樣式系統 (theme.ts, spacing.ts)

### P2 - 低優先級
7. ⏳ 添加單元測試覆蓋
8. ⏳ 優化 bundle 大小 (code splitting)
9. ⏳ 添加 ESLint 規則防止回退

## 📚 參考資料
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

---

**重構完成時間**: 2025-12-01
**影響範圍**: Frontend Services Layer
**破壞性變更**: 無 (向後兼容)
**測試狀態**: ✅ Build Passed
