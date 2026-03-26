# 🔍 投資市場設定 & 語言/貨幣功能分析報告

> **更新時間:** 2025-12-05

---

## 1️⃣ 投資市場設定 (Investment Scope)

### 📊 現況分析

#### ✅ 已實作的功能
- **UI 設定頁面** (`SettingsPage.tsx` Line 94-128)
  - 可切換台股 🇹🇼
  - 可切換美股/海外 🇺🇸
  - 可切換加密貨幣 ₿

- **實際應用** (`Dashboard.tsx` Line 39-50)
  ```typescript
  const scopeFilteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (isTW && !investmentScope.tw) return false;
      if (isUS && !investmentScope.us) return false;
      if (isCrypto && !investmentScope.crypto) return false;
      return true;
    });
  }, [assets, investmentScope]);
  ```
  - ✅ Dashboard 會根據設定篩選顯示的資產
  - ✅ 總資產計算會排除未勾選的市場

#### ⚠️ 存在的問題

**問題 1: 設定不會保存**
- `investmentScope` 只存在於 `App.tsx` 的 state 中
- 重新整理頁面後會重置為預設值
- 沒有儲存到：
  - ❌ localStorage
  - ❌ 後端資料庫（User 表有 enableTW/US/Crypto 欄位但未使用）

**問題 2: 與後端不同步**
- 後端資料庫 `User` 表已有欄位：
  ```prisma
  enableTWStock Boolean @default(true)
  enableUSStock Boolean @default(false)
  enableCrypto  Boolean @default(false)
  ```
- 但前端沒有從後端載入，也沒有更新回去

**問題 3: 影響範圍有限**
- 只有 Dashboard 有使用
- 其他地方（Ledger、Analytics 等）沒有套用

---

### 💡 建議方案

#### 選項 A: 完整實作（推薦）⭐
**保留並完善這個功能**

**優點:**
- 對用戶很實用（純台股用戶不想看到空的美股區域）
- 資料庫已準備好
- UI 已完成

**需要做的事:**
1. ✅ 從後端載入 `enableTW/US/Crypto` 設定
2. ✅ 用戶修改設定時更新到後端
3. ✅ 首次登入時在 Onboarding 詢問（已有 OnboardingModal）
4. ✅ 擴展到其他頁面（Analytics、StrategyLab）

**工時估計:** 2-3 小時

**實作步驟:**
```typescript
// 1. App.tsx - 載入用戶設定
useEffect(() => {
  const loadUserSettings = async () => {
    const settings = await getUserSettings();
    setInvestmentScope({
      tw: settings.enableTWStock,
      us: settings.enableUSStock,
      crypto: settings.enableCrypto
    });
  };
  loadUserSettings();
}, []);

// 2. SettingsPage.tsx - 保存設定
const toggleScope = async (key: keyof InvestmentScope) => {
  const newScope = { ...investmentScope, [key]: !investmentScope[key] };
  setInvestmentScope(newScope);
  await updateUserSettings({
    enableTWStock: newScope.tw,
    enableUSStock: newScope.us,
    enableCrypto: newScope.crypto
  });
};
```

---

#### 選項 B: 簡化保存到 localStorage
**不串後端，只用本地儲存**

**優點:**
- 實作簡單（5分鐘）
- 不需要後端 API

**缺點:**
- 換裝置會遺失設定
- 清除瀏覽器資料會遺失

**實作:**
```typescript
// App.tsx
const [investmentScope, setInvestmentScope] = useState<InvestmentScope>(() => {
  const saved = localStorage.getItem('investmentScope');
  return saved ? JSON.parse(saved) : { tw: true, us: true, crypto: true };
});

// SettingsPage.tsx
const toggleScope = (key: keyof InvestmentScope) => {
  const newScope = { ...investmentScope, [key]: !investmentScope[key] };
  setInvestmentScope(newScope);
  localStorage.setItem('investmentScope', JSON.stringify(newScope));
};
```

---

#### 選項 C: 刪除這個功能
**完全移除**

**優點:**
- 減少程式碼複雜度
- 不需要維護

**缺點:**
- 失去一個有用的功能
- 資料庫欄位會變成廢棄欄位

**不推薦的原因:**
- 這個功能對用戶體驗有幫助
- UI 和資料庫都已經準備好了
- 只差臨門一腳

---

## 2️⃣ 語言/貨幣顯示功能

### 📊 現況分析

#### ✅ 語言切換功能 - 部分完成

**已實作:**
- ✅ i18n 框架已設定 (`i18n/config.ts`)
- ✅ 翻譯檔案已建立
  - `i18n/locales/zh-TW.ts` - 繁體中文
  - `i18n/locales/en-US.ts` - 英文
- ✅ 16 個組件已引入 `useTranslation`
- ✅ SettingsPage 可切換語言
- ✅ 設定會保存到 localStorage

**翻譯覆蓋率:**
```
✅ 有使用翻譯的組件:
- Dashboard.tsx
- SettingsPage.tsx
- MorePage.tsx
- Ledger.tsx
- AnalyticsPage.tsx
- AccountManagementPage.tsx
- OnboardingModal.tsx
- BuyStockModal.tsx
... 等 16 個

⚠️ 仍有硬編碼中文的地方:
- 部分按鈕文字
- 部分錯誤訊息
- 部分提示文字
```

**估計覆蓋率:** 約 70%

---

#### ⚠️ 貨幣顯示偏好 - 未完成

**問題分析:**
```typescript
// SettingsPage.tsx Line 30
const [currency, setCurrency] = useState('TWD');
```

**存在的問題:**
1. ❌ `currency` state 只在 SettingsPage 本地
2. ❌ 沒有提升到 App.tsx 或使用 Context
3. ❌ 其他組件無法讀取這個設定
4. ❌ 沒有實際改變任何顯示
5. ❌ 沒有保存到 localStorage 或後端

**影響:**
- 用戶點擊切換貨幣時，**什麼都不會發生**
- 這是一個「假功能」

---

### 💡 建議方案

#### 🎯 語言功能 - 選項 A: 完善翻譯覆蓋率

**目標:** 達到 95% 翻譯覆蓋率

**需要做的事:**
1. 檢查所有硬編碼文字
2. 新增到翻譯檔案
3. 替換為 `t('key')`

**工時估計:** 3-4 小時

**優先級:** 🟡 中等（如果要國際化才需要）

---

#### 🎯 貨幣功能 - 選項 A: 完整實作 ⭐

**實作全域貨幣切換**

**需要建立 Context:**
```typescript
// contexts/CurrencyContext.tsx
export const CurrencyContext = createContext({
  displayCurrency: 'TWD',
  setDisplayCurrency: (currency: string) => {}
});

export const CurrencyProvider = ({ children }) => {
  const [displayCurrency, setDisplayCurrency] = useState(() => {
    return localStorage.getItem('displayCurrency') || 'TWD';
  });

  const setCurrency = (currency: string) => {
    setDisplayCurrency(currency);
    localStorage.setItem('displayCurrency', currency);
  };

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};
```

**應用到所有金額顯示:**
```typescript
// utils/formatCurrency.ts
export const formatAmount = (amount: number, fromCurrency: string, displayCurrency: string, exchangeRate: number) => {
  if (fromCurrency === displayCurrency) {
    return `${getCurrencySymbol(displayCurrency)}${amount.toLocaleString()}`;
  }

  const converted = fromCurrency === 'TWD'
    ? amount / exchangeRate
    : amount * exchangeRate;

  return `${getCurrencySymbol(displayCurrency)}${converted.toLocaleString()}`;
};
```

**工時估計:** 4-6 小時

---

#### 🎯 貨幣功能 - 選項 B: 移除這個設定項

**刪除貨幣切換按鈕**

**理由:**
- 目前是假功能
- 實作複雜度高
- 大部分用戶不會切換

**修改:**
```typescript
// SettingsPage.tsx - 刪除這段
<SettingItem
  icon={CreditCard}
  label={t('settings.displayCurrency')}
  value={currency}
  onClick={() => setCurrency(currency === 'USD' ? 'TWD' : 'USD')}
/>
```

**優點:**
- 避免誤導用戶
- 減少維護負擔

---

## 📊 總結與建議

### 🎯 推薦方案

| 功能 | 建議 | 優先級 | 工時 |
|------|------|--------|------|
| **投資市場設定** | **選項 A - 完整實作** ⭐ | 🔴 高 | 2-3小時 |
| **語言切換** | 保持現狀（70%已足夠） | 🟢 低 | 0小時 |
| **貨幣顯示** | **選項 B - 移除設定項** ⭐ | 🔴 高 | 5分鐘 |

### 🚀 立即可做（5分鐘）

**移除貨幣切換的假功能:**

```bash
# 1. 編輯 SettingsPage.tsx
# 刪除或註解掉 Line 130-136 的 CreditCard SettingItem

# 2. 刪除 Line 30 的 currency state（已無用處）
```

### 📝 後續改進（2-3小時）

**完善投資市場設定:**

1. 建立 API (`services/user.service.ts`)
2. 載入設定 (`App.tsx`)
3. 保存設定 (`SettingsPage.tsx`)
4. 擴展到其他頁面

---

## ❓ 決策問題

### 問題 1: 投資市場設定要保留嗎？

**我的建議:** ✅ **保留並完善**（選項 A）

**理由:**
- 功能已經在運作（Dashboard 有使用）
- 對用戶有實際幫助
- 資料庫已準備好
- 只需要 2-3 小時就能完成

### 問題 2: 貨幣顯示功能要實作嗎？

**我的建議:** ❌ **先移除假功能**（選項 B）

**理由:**
- 目前是假功能，會誤導用戶
- 實作複雜度較高（需要改所有金額顯示）
- 大部分台灣用戶不需要切換到 USD
- 可以之後再加（如果有需求）

---

**要我幫你實作嗎？**
1. ✅ 完善投資市場設定（2-3小時）
2. ✅ 移除假的貨幣切換（5分鐘）

還是你想要不同的方案？
