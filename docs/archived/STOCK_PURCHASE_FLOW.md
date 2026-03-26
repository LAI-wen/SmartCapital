# 📈 買股票流程分析與改進方案

## 🔍 目前流程問題

### Current User Flow (現況)

```
Dashboard「買股票」按鈕
    ↓
navigate('/portfolio')  ← 跳到投資組合頁面
    ↓
顯示現有持股列表
    ↓
然後呢？🤔 沒有「買入」功能！
```

**核心問題：**
1. ❌ **按鈕名稱誤導**：叫「買股票」但沒有買入介面
2. ❌ **流程斷裂**：跳到 Portfolio 後使用者不知道要做什麼
3. ❌ **缺少買入表單**：Portfolio 頁面只有搜尋/篩選，沒有新增功能
4. ❌ **個股 Modal 也沒實作**：買入/賣出按鈕只有 `alert('開發中')`

---

## ✅ 正確的使用者流程設計

### Option 1: 直接在 Dashboard 買股票（推薦）⭐

```
Dashboard 點擊「買股票」
    ↓
彈出「買入股票 Modal」
    ├─ 輸入：股票代碼 (AAPL / 2330)
    ├─ 自動查詢：即時價格、公司名稱
    ├─ 輸入：買入數量
    ├─ 輸入：買入價格（預設市價）
    ├─ 選擇：日期
    └─ 按鈕：確認買入
    ↓
新增到持股列表（樂觀更新）
    ↓
同步到後端 API
    ↓
Dashboard 持股卡片自動更新
```

**優點：**
- ✅ 一鍵完成，不需要跳轉頁面
- ✅ 符合按鈕名稱預期
- ✅ 與「記一筆」保持一致的 UX（都是 Modal）
- ✅ 快速輸入，適合行動裝置

---

### Option 2: 跳轉到專門的買入頁面

```
Dashboard 點擊「買股票」
    ↓
navigate('/portfolio/add')  ← 新增子路由
    ↓
顯示買入表單頁面
    ├─ 搜尋股票（自動完成）
    ├─ 顯示股票資訊卡片
    ├─ 輸入買入數量/價格
    └─ 確認買入
    ↓
返回 Dashboard 或 Portfolio
```

**優點：**
- ✅ 介面更寬敞，適合桌面端
- ✅ 可以顯示更多資訊（技術分析圖表等）
- ✅ 符合傳統網頁應用習慣

**缺點：**
- ❌ 多一次頁面跳轉
- ❌ 需要新增路由和組件

---

### Option 3: 在個股詳情 Modal 買入（目前實作中）

```
Dashboard 點擊持股卡片
    ↓
開啟「個股詳情 Modal」
    ├─ 顯示：價格、走勢圖、持股資訊
    ├─ 按鈕：買入、賣出
    └─ 點擊「買入」
    ↓
切換到「買入表單 Tab」或新 Modal
    ├─ 當前價格已帶入
    ├─ 輸入數量
    └─ 確認買入
    ↓
更新持股數量（追加買入）
```

**優點：**
- ✅ 適合「加碼」現有持股
- ✅ 價格資訊上下文完整

**缺點：**
- ❌ 不適合「新增」持股（因為要先點擊卡片）
- ❌ Dashboard「買股票」按鈕仍然跳到 Portfolio

---

## 🎯 推薦方案：混合模式

結合三種流程的優點：

### 完整使用者旅程

```
【新增持股】
Dashboard 快捷按鈕「買股票」
    → 開啟「買入 Modal」
    → 搜尋股票代碼
    → 輸入數量/價格
    → 新增到持股

【加碼持股】
Dashboard 點擊持股卡片
    → 開啟「詳情 Modal」
    → 點擊「買入」按鈕
    → 輸入追加數量
    → 更新持股

【賣出持股】
持股卡片 hover 顯示「賣出」按鈕
    或
詳情 Modal 點擊「賣出」
    → 輸入賣出數量/價格
    → 減少持股或完全賣出

【查看所有持股】
Dashboard 持股列表向下滾動
    或
導航到 Portfolio 頁面（完整版）
```

---

## 🛠 實作優先級

### P0 - 立即實作（核心功能）

1. **買入 Modal 組件**
   ```tsx
   // components/BuyStockModal.tsx
   interface BuyStockModalProps {
     isOpen: boolean;
     onClose: () => void;
     existingAsset?: Asset; // 如果是加碼，傳入現有資產
   }
   ```

2. **修改 Dashboard「買股票」按鈕**
   ```tsx
   // Before
   onClick={() => navigate('/portfolio')}
   
   // After
   onClick={() => setShowBuyModal(true)}
   ```

3. **個股 Modal 的買入/賣出按鈕**
   ```tsx
   // 買入：開啟 BuyStockModal 並帶入 selectedAsset
   onClick={() => {
     setShowBuyModal(true);
     closeDetailModal();
   }}
   
   // 賣出：開啟 SellStockModal
   onClick={() => {
     setShowSellModal(true);
     closeDetailModal();
   }}
   ```

### P1 - 短期優化

4. **股票搜尋自動完成**
   - 整合 Yahoo Finance API 搜尋
   - 支援台股代碼（自動加 .TW）
   - 顯示公司名稱和即時價格

5. **樂觀 UI 更新**
   - 買入後立即顯示在列表
   - 等待 API 回應後更新真實 ID

6. **後端 API 端點**
   ```
   POST /api/transactions/stock/buy
   POST /api/transactions/stock/sell
   GET /api/stocks/search?q=AAPL
   GET /api/stocks/quote/:symbol
   ```

### P2 - 長期增強

7. **高級功能**
   - 限價單/市價單選擇
   - 停損/停利設定
   - 分批買入計算器
   - 成本計算器（含手續費）

---

## 📝 BuyStockModal 組件設計

### UI 結構

```tsx
<BuyStockModal>
  {/* Header */}
  <div className="gradient-header">
    {existingAsset ? '加碼買入' : '買入股票'}
  </div>
  
  {/* Search Section (新增持股時) */}
  {!existingAsset && (
    <StockSearchInput 
      onSelect={handleStockSelect}
      placeholder="輸入股票代碼 (例如：AAPL 或 2330)"
    />
  )}
  
  {/* Selected Stock Display */}
  {selectedStock && (
    <StockInfoCard
      symbol={selectedStock.symbol}
      name={selectedStock.name}
      currentPrice={selectedStock.price}
      change24h={selectedStock.change}
    />
  )}
  
  {/* Purchase Form */}
  <div className="form-section">
    {/* 數量 */}
    <input 
      type="number" 
      placeholder="買入數量（股）"
      value={quantity}
      onChange={(e) => setQuantity(e.target.value)}
    />
    
    {/* 價格 */}
    <input 
      type="number" 
      placeholder="買入價格（預設市價）"
      value={price}
      onChange={(e) => setPrice(e.target.value)}
    />
    
    {/* 日期 */}
    <input 
      type="date"
      value={date}
      onChange={(e) => setDate(e.target.value)}
    />
    
    {/* 計算預覽 */}
    <div className="calculation-preview">
      總成本：{formatCurrency(quantity * price)}
    </div>
  </div>
  
  {/* Actions */}
  <div className="modal-actions">
    <button onClick={handleConfirm}>
      確認買入
    </button>
    <button onClick={onClose}>
      取消
    </button>
  </div>
</BuyStockModal>
```

### 資料流

```typescript
// 1. 使用者輸入股票代碼
handleStockSearch(symbol: string)
  → 調用 API: GET /api/stocks/quote/${symbol}
  → 取得即時報價和公司資訊
  → 顯示在卡片中

// 2. 使用者輸入數量和價格
handleQuantityChange(qty: number)
  → 計算總成本 = qty * price
  → 即時顯示預覽

// 3. 確認買入
handleConfirm()
  → 驗證輸入
  → 樂觀更新 UI（新增到 assets 列表）
  → 調用 API: POST /api/transactions/stock/buy
  → 成功：更新真實 ID
  → 失敗：回退並顯示錯誤
```

---

## 🎨 UI/UX 細節

### Modal 樣式

```scss
// Morandi 風格
.buy-stock-modal {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  
  .gradient-header {
    background: linear-gradient(135deg, #8FA5B5, #B5C4D0);
    color: white;
    padding: 24px;
  }
  
  .stock-info-card {
    background: #F9F7F2; // morandi-sand
    border: 1px solid #E6E2D6;
    border-radius: 12px;
    padding: 16px;
    margin: 16px;
  }
  
  input {
    background: #F9F7F2;
    border: 1px solid #E6E2D6;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 16px;
    
    &:focus {
      border-color: #8FA5B5; // morandi-blue
      outline: none;
    }
  }
}
```

### 互動反饋

```tsx
// Loading 狀態
{isSearching && <Spinner />}

// 錯誤提示
{error && (
  <div className="error-toast">
    <AlertCircle /> {error}
  </div>
)}

// 成功提示
{success && (
  <div className="success-toast">
    <CheckCircle /> 買入成功！
  </div>
)}
```

---

## 🔗 與現有系統整合

### 1. Dashboard 整合

```tsx
// Dashboard.tsx
const [showBuyModal, setShowBuyModal] = useState(false);
const [buyAsset, setBuyAsset] = useState<Asset | null>(null);

// 快捷按鈕
<button onClick={() => setShowBuyModal(true)}>
  買股票
</button>

// 持股卡片買入按鈕
<button onClick={(e) => {
  e.stopPropagation();
  setBuyAsset(asset);
  setShowBuyModal(true);
}}>
  買入
</button>

// Modal 組件
{showBuyModal && (
  <BuyStockModal
    isOpen={showBuyModal}
    onClose={() => {
      setShowBuyModal(false);
      setBuyAsset(null);
    }}
    existingAsset={buyAsset}
    onSuccess={handlePurchaseSuccess}
  />
)}
```

### 2. 與記帳系統整合

買入股票應該同時：
- ✅ 新增到 Portfolio（assets 列表）
- ✅ 記錄到 Ledger（作為支出交易）

```typescript
const handlePurchaseSuccess = (purchase: StockPurchase) => {
  // 1. 更新 Portfolio
  updateAssets(purchase);
  
  // 2. 自動記帳
  createTransaction({
    type: 'expense',
    amount: purchase.quantity * purchase.price,
    category: '投資',
    note: `買入 ${purchase.symbol} x${purchase.quantity}`,
    date: purchase.date
  });
};
```

### 3. LINE Bot 指令

```
使用者在 LINE 傳送：
「買 AAPL 10股 150」

Bot 回應：
✅ 已記錄買入
股票：AAPL (Apple Inc.)
數量：10 股
價格：$150.00
總成本：$1,500.00

[查看持股] [修改記錄]
```

---

## 📊 資料結構

### StockPurchase Interface

```typescript
interface StockPurchase {
  id?: string;           // 交易 ID
  userId: string;        // 使用者 ID
  symbol: string;        // 股票代碼
  name: string;          // 公司名稱
  quantity: number;      // 買入數量
  price: number;         // 買入價格
  totalCost: number;     // 總成本
  date: string;          // 買入日期
  type: 'buy' | 'sell';  // 交易類型
  createdAt: string;     // 記錄時間
}
```

### API Request/Response

```typescript
// POST /api/transactions/stock/buy
Request: {
  symbol: "AAPL",
  quantity: 10,
  price: 150.00,
  date: "2024-11-24"
}

Response: {
  success: true,
  transaction: {
    id: "txn_123",
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 10,
    price: 150.00,
    totalCost: 1500.00,
    date: "2024-11-24",
    type: "buy",
    createdAt: "2024-11-24T10:30:00Z"
  },
  updatedAsset: {
    id: "asset_456",
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 20,        // 原本 10 + 新增 10
    avgPrice: 145.00,    // 重新計算平均成本
    currentPrice: 152.00,
    change24h: 1.33
  }
}
```

---

## ✅ Implementation Checklist

### Phase 1: 基本買入功能
- [ ] 建立 `BuyStockModal.tsx` 組件
- [ ] 實作股票搜尋（Yahoo Finance API）
- [ ] 實作買入表單（數量/價格/日期）
- [ ] 修改 Dashboard「買股票」按鈕行為
- [ ] 樂觀 UI 更新

### Phase 2: 後端整合
- [ ] 建立 POST `/api/transactions/stock/buy` 端點
- [ ] 建立 POST `/api/transactions/stock/sell` 端點
- [ ] 建立 GET `/api/stocks/quote/:symbol` 端點
- [ ] Prisma Schema 新增 StockTransaction 模型
- [ ] 資料庫 Migration

### Phase 3: 賣出功能
- [ ] 建立 `SellStockModal.tsx` 組件
- [ ] 持股卡片加入「賣出」按鈕
- [ ] 詳情 Modal 的賣出按鈕實作
- [ ] 計算損益（賣出價 - 平均成本）

### Phase 4: 進階功能
- [ ] 成本計算器（含手續費/稅金）
- [ ] 交易歷史記錄頁面
- [ ] 股票搜尋自動完成
- [ ] LINE Bot 買賣指令

---

## 🎯 結論

**當前問題：**
- Dashboard「買股票」按鈕跳到 Portfolio，但沒有買入功能
- 使用者體驗斷裂，不符合預期

**推薦解決方案：**
1. 立即實作 `BuyStockModal` 組件
2. 修改「買股票」按鈕為開啟 Modal（而非跳轉頁面）
3. 個股詳情 Modal 的買入/賣出按鈕實作
4. 整合 Yahoo Finance API 取得即時報價
5. 後端 API 支援股票交易記錄

**預期效果：**
- 使用者可以在 2 步內完成買入（點按鈕 → 輸入資料 → 確認）
- 一致的 UX（與記帳 Modal 相同）
- 行動裝置友善（不需要跳轉頁面）

---

## 📋 設計決策（已確認）

### 1. 資料結構
✅ **兩者都記錄**：交易表（StockTransaction）+ 持股表（Portfolio Assets）
- 交易表：記錄每筆買賣歷史
- 持股表：聚合計算當前狀態

### 2. 平均成本計算
✅ **加權平均成本法**
- 多次買入：`(數量1×價格1 + 數量2×價格2) / 總數量`
- 賣出不影響剩餘持股的平均成本

### 3. 手續費處理
✅ **簡化版**（Phase 1）
- 只記錄總成本，不拆分手續費
- 進階版（Phase 2）再加入手續費欄位

### 4. 價格來源
✅ **混合模式**
- 自動查詢並顯示市價（參考用）
- 使用者可修改為實際成交價

### 5. 時間處理
✅ **以實際交易日期為準**
- `buyDate`: 真實交易日期（用於損益計算）
- `createdAt`: 系統記錄時間（用於審計）

### 6. 分批買入
✅ **Phase 2 再做**
- 先實作單次買入
- 之後再加批次/週期性功能

### 7. 記帳整合
✅ **自動建立支出記錄**
- 買入股票 → 自動在 Ledger 新增「投資」類別支出
- 使用者可選擇是否同步（預設開啟）

### 8. LINE Bot
✅ **回傳確認卡片**
- 不直接買入，需要按鈕確認（安全）
- 支援台股代碼自動轉換（2330 → 2330.TW）

### 9. 錯誤處理
✅ **基本驗證 + 友善提示**
- 股票代碼查無：顯示「查無此股票」
- 價格異常：警告「偏離市價 X%」
- 賣出超量：錯誤「持有不足」

### 10. UI 流程
✅ **單頁表單**（快速模式）
- 所有欄位在同一頁
- 即時計算總成本
- 適合熟手快速操作
