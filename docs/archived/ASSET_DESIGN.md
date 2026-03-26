# 📊 資產概覽設計方案

## 目前架構分析

### Dashboard.tsx（資產概覽）
**現有功能：**
- 總資產淨值顯示
- 今日損益（金額 + 百分比）
- 資產配置圓餅圖（Stock / Crypto / Cash / ETF）
- 快捷按鈕（投資組合、策略實驗室、收支手帳）

**現有問題：**
- 貨幣單位固定為 USD
- 缺少台股特色資訊（本益比、股息率）
- 沒有個股漲跌排行
- 缺少大盤指數參考（台股加權指數）

---

## 🎨 改進方案 1：多幣別支援

### 資料結構升級
```typescript
interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'Stock' | 'Crypto' | 'Cash' | 'ETF';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  change24h: number;
  currency: 'TWD' | 'USD' | 'BTC'; // 新增幣別
  history: { date: string; value: number }[];
}

interface UserSettings {
  baseCurrency: 'TWD' | 'USD';  // 用戶偏好顯示幣別
  exchangeRate: number;          // 匯率（TWD/USD）
}
```

### UI 顯示邏輯
```typescript
// 自動顯示正確貨幣符號
function formatCurrency(value: number, currency: string) {
  if (currency === 'TWD') {
    return `NT$${value.toLocaleString('zh-TW')}`;
  }
  if (currency === 'USD') {
    return `$${value.toLocaleString('en-US')}`;
  }
  return value.toLocaleString();
}

// 範例顯示
台積電 (2330.TW): NT$650
Tesla (TSLA): $250.50
比特幣 (BTC): $62,500
```

---

## 🎨 改進方案 2：台股儀表板

### 新增區塊：大盤指數
```tsx
{/* 大盤指數卡片 */}
<div className="bg-white rounded-2xl p-6 shadow-paper border border-stone-100">
  <h3 className="text-xs font-serif text-ink-400 uppercase mb-4">台股指數</h3>
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-sm font-serif text-ink-600">加權指數</span>
      <div className="text-right">
        <div className="font-bold text-ink-900">23,456.78</div>
        <div className="text-xs text-morandi-sage">+123.45 (+0.53%)</div>
      </div>
    </div>
    
    <div className="flex justify-between items-center">
      <span className="text-sm font-serif text-ink-600">櫃買指數</span>
      <div className="text-right">
        <div className="font-bold text-ink-900">234.56</div>
        <div className="text-xs text-morandi-rose">-1.23 (-0.52%)</div>
      </div>
    </div>
  </div>
</div>
```

### 新增區塊：持股漲跌排行
```tsx
{/* 持股表現排行 */}
<div className="bg-white rounded-2xl p-6 shadow-paper border border-stone-100">
  <h3 className="text-xs font-serif text-ink-400 uppercase mb-4">持股排行</h3>
  
  {/* 漲幅榜 Top 3 */}
  <div className="mb-4">
    <h4 className="text-xs text-morandi-sage font-bold mb-2">📈 今日贏家</h4>
    <div className="space-y-2">
      {topGainers.map(stock => (
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-900">{stock.name}</span>
          <span className="text-sm font-bold text-morandi-sage">
            +{stock.changePercent}%
          </span>
        </div>
      ))}
    </div>
  </div>
  
  {/* 跌幅榜 Top 3 */}
  <div>
    <h4 className="text-xs text-morandi-rose font-bold mb-2">📉 今日輸家</h4>
    <div className="space-y-2">
      {topLosers.map(stock => (
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-900">{stock.name}</span>
          <span className="text-sm font-bold text-morandi-rose">
            {stock.changePercent}%
          </span>
        </div>
      ))}
    </div>
  </div>
</div>
```

---

## 🎨 改進方案 3：資產配置優化

### 區分台股 / 美股 / 加密貨幣
```typescript
const allocationData = useMemo(() => {
  const regionMap = new Map<string, number>();
  
  assets.forEach(asset => {
    const value = asset.quantity * asset.currentPrice;
    
    // 根據代碼自動分類
    let region = '其他';
    if (asset.symbol.endsWith('.TW')) {
      region = '🇹🇼 台股';
    } else if (asset.type === 'Crypto') {
      region = '₿ 加密貨幣';
    } else {
      region = '🇺🇸 美股';
    }
    
    regionMap.set(region, (regionMap.get(region) || 0) + value);
  });
  
  return Array.from(regionMap).map(([name, value]) => ({ name, value }));
}, [assets]);
```

### 雙層圓餅圖（區域 + 類型）
```tsx
<ResponsiveContainer width="100%" height={250}>
  <PieChart>
    {/* 內圈：資產類型 */}
    <Pie 
      data={typeData} 
      cx="50%" 
      cy="50%" 
      innerRadius={60}
      outerRadius={80}
      dataKey="value"
    >
      {typeData.map((entry, index) => (
        <Cell key={`type-${index}`} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>
    
    {/* 外圈：地區分布 */}
    <Pie 
      data={regionData} 
      cx="50%" 
      cy="50%" 
      innerRadius={90}
      outerRadius={110}
      dataKey="value"
      label
    >
      {regionData.map((entry, index) => (
        <Cell key={`region-${index}`} fill={COLORS[index + 3]} opacity={0.8} />
      ))}
    </Pie>
  </PieChart>
</ResponsiveContainer>
```

---

## 🎨 改進方案 4：台股專屬資訊

### 資料結構擴充
```typescript
interface TaiwanStockDetail {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  
  // 台股特殊欄位
  pe: number;              // 本益比
  dividendYield: number;   // 股息殖利率
  eps: number;             // 每股盈餘
  pbRatio: number;         // 股價淨值比
  volume: number;          // 成交量（張）
  volumeValue: number;     // 成交金額（億）
  foreignHolding: number;  // 外資持股比例
}
```

### 個股詳細資訊卡
```tsx
{/* 點擊個股後展開詳細資訊 */}
<div className="bg-white rounded-2xl p-6 shadow-paper border border-stone-100">
  <div className="flex justify-between items-start mb-4">
    <div>
      <h3 className="text-lg font-bold text-ink-900">台積電</h3>
      <p className="text-xs text-ink-400">2330.TW</p>
    </div>
    <div className="text-right">
      <div className="text-2xl font-bold text-ink-900">NT$650</div>
      <div className="text-sm text-morandi-sage">+5.00 (+0.77%)</div>
    </div>
  </div>
  
  {/* 關鍵指標 */}
  <div className="grid grid-cols-2 gap-4 mt-4">
    <div className="bg-paper p-3 rounded-xl">
      <div className="text-xs text-ink-400 mb-1">本益比</div>
      <div className="text-lg font-bold text-ink-900">28.5</div>
    </div>
    
    <div className="bg-paper p-3 rounded-xl">
      <div className="text-xs text-ink-400 mb-1">股息殖利率</div>
      <div className="text-lg font-bold text-ink-900">2.1%</div>
    </div>
    
    <div className="bg-paper p-3 rounded-xl">
      <div className="text-xs text-ink-400 mb-1">每股盈餘</div>
      <div className="text-lg font-bold text-ink-900">NT$22.8</div>
    </div>
    
    <div className="bg-paper p-3 rounded-xl">
      <div className="text-xs text-ink-400 mb-1">外資持股</div>
      <div className="text-lg font-bold text-ink-900">78.2%</div>
    </div>
  </div>
</div>
```

---

## 📱 響應式設計建議

### 桌面版（Dashboard）
```
┌─────────────────────────────────────┐
│  淨資產 NT$1,234,567                │
│  今日損益 +NT$12,345 (+1.2%)        │
└─────────────────────────────────────┘

┌──────────────┬──────────────────────┐
│   資產配置    │   大盤指數 + 持股排行  │
│  (圓餅圖)     │                      │
└──────────────┴──────────────────────┘

┌─────────────────────────────────────┐
│   個股列表（Table View）             │
│   2330 台積電  NT$650  +0.77%  ...   │
│   2454 聯發科  NT$920  -1.23%  ...   │
└─────────────────────────────────────┘
```

### 手機版
```
┌──────────────┐
│  淨資產卡片   │
└──────────────┘
┌──────────────┐
│  大盤指數     │
└──────────────┘
┌──────────────┐
│  資產配置     │
└──────────────┘
┌──────────────┐
│  持股列表     │
│  (卡片式)     │
└──────────────┘
```

---

## 🚀 實作優先順序

### Phase 1（立即實作）✅
- [x] 支援台股代碼自動轉換（2330 → 2330.TW）
- [ ] 顯示正確貨幣符號（NT$ vs $）
- [ ] 資產配置圓餅圖區分台股/美股

### Phase 2（下週實作）
- [ ] 大盤指數卡片（加權指數、櫃買指數）
- [ ] 持股漲跌排行
- [ ] 個股詳細資訊展開

### Phase 3（未來功能）
- [ ] 本益比、股息率等台股指標
- [ ] 外資買賣超資訊
- [ ] 技術分析圖表（K線圖）
- [ ] 即時報價（需付費 API）

---

## 💡 建議：快速啟動方案

**立即可用（使用現有架構）：**
1. 用戶輸入股票時自動判斷台股（輸入 2330 → 自動查詢 2330.TW）
2. Dashboard 顯示時根據 `.TW` 後綴自動顯示 NT$
3. 圓餅圖自動分類台股/美股

**需要的修改：**
- `stockService.ts`：已新增 `formatTaiwanStockSymbol()` ✅
- `Dashboard.tsx`：formatCurrency 加入幣別判斷
- `messageParser.ts`：LINE Bot 輸入自動轉換台股代碼

要我開始實作嗎？
