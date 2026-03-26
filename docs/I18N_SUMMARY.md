# 多語系功能總結

## 🌍 已實現功能

### ✅ 支援語言
1. **繁體中文** (zh-TW) - 預設語言
2. **English** (en-US)

---

## 📦 實現內容

### 1. **i18n 框架設置**
- ✅ 安裝 `react-i18next` 與 `i18next`
- ✅ 創建配置文件 `/i18n/config.ts`
- ✅ 初始化在 App.tsx

### 2. **翻譯文件**
- ✅ `/i18n/locales/zh-TW.ts` - 繁體中文翻譯
- ✅ `/i18n/locales/en-US.ts` - 英文翻譯

### 3. **翻譯覆蓋範圍**

#### 已翻譯模組
- ✅ 通用詞彙 (common)
- ✅ 導航選單 (nav)
- ✅ 資產總覽 (dashboard)
- ✅ 記帳本 (ledger)
- ✅ 分析 (analytics)
- ✅ 策略實驗室 (strategy)
- ✅ 設定 (settings)
- ✅ 帳戶管理 (account)
- ✅ 價格警示 (priceAlerts)
- ✅ 買入/賣出模態框 (buyStockModal)
- ✅ 幫助中心 (help)
- ✅ 通知 (notifications)
- ✅ 錯誤訊息 (errors)

#### 已整合組件
- ✅ App.tsx - 底部導航列
- ✅ SettingsPage.tsx - 語言切換器

---

## 🎯 使用方式

### 在組件中使用翻譯

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.totalAssets')}</p>
    </div>
  );
}
```

### 帶參數的翻譯

```typescript
// 翻譯檔案
{
  exchangeRateNote: '以 1 USD ≈ {{rate}} TWD 計算'
}

// 使用
<p>{t('dashboard.exchangeRateNote', { rate: 31.85 })}</p>
```

### 切換語言

```typescript
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const switchLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <button onClick={() => switchLanguage('en-US')}>
      Switch to English
    </button>
  );
}
```

---

## 💾 語言持久化

### localStorage
- 語言偏好儲存在 `localStorage.getItem('language')`
- 下次訪問時自動載入使用者的語言選擇
- 預設語言：`zh-TW`

### 後端整合（待實現）
未來可以將語言偏好儲存到後端：

```typescript
// 在 UserSettings 表新增欄位
model UserSettings {
  language String @default("zh-TW") // "zh-TW" | "en-US"
  // ...
}
```

---

## 📝 翻譯文件結構

```typescript
{
  common: {
    confirm: '確認',
    cancel: '取消',
    // ...
  },
  nav: {
    dashboard: '總覽',
    ledger: '記帳',
    // ...
  },
  dashboard: {
    title: '資產總覽',
    totalAssets: '總資產',
    // ...
  },
  // ... 更多模組
}
```

---

## 🚀 已實現功能

### ✅ 設定頁面
- 語言切換器（繁中 ↔ 英文）
- 即時切換無需刷新頁面
- 自動保存到 localStorage

### ✅ 底部導航
- 主頁 (Dashboard)
- 記帳 (Ledger)
- 通知 (Notifications)
- 更多 (More)

---

## 📊 翻譯統計

| 類別 | 中文翻譯 | 英文翻譯 | 狀態 |
|------|---------|---------|------|
| common | ✅ 13 項 | ✅ 13 項 | 完成 |
| nav | ✅ 8 項 | ✅ 8 項 | 完成 |
| dashboard | ✅ 12 項 | ✅ 12 項 | 完成 |
| ledger | ✅ 20+ 項 | ✅ 20+ 項 | 完成 |
| analytics | ✅ 10+ 項 | ✅ 10+ 項 | 完成 |
| strategy | ✅ 15+ 項 | ✅ 15+ 項 | 完成 |
| settings | ✅ 20+ 項 | ✅ 20+ 項 | 完成 |
| account | ✅ 15+ 項 | ✅ 15+ 項 | 完成 |
| buyStockModal | ✅ 20+ 項 | ✅ 20+ 項 | 完成 |
| **總計** | **~150+ 翻譯** | **~150+ 翻譯** | **完成** |

---

## 🔮 未來擴展

### 計劃新增的語言
- 🇯🇵 日本語 (ja-JP)
- 🇰🇷 한국어 (ko-KR)
- 🇨🇳 简体中文 (zh-CN)

### 待整合組件
以下組件尚未整合翻譯（當前仍為硬編碼中文）：
- [ ] Dashboard.tsx
- [ ] Ledger.tsx
- [ ] AnalyticsPage.tsx
- [ ] StrategyLab.tsx
- [ ] BuyStockModal.tsx
- [ ] AccountManagementPage.tsx
- [ ] PriceAlertsPage.tsx
- [ ] NotificationsPage.tsx
- [ ] HelpPage.tsx

**註**: 這些組件的翻譯文件已準備好，只需將硬編碼文字替換為 `t('key')` 即可。

---

## 🎓 最佳實踐

### 1. 命名規範
```typescript
// ✅ 好的命名
t('dashboard.totalAssets')
t('ledger.categories.food')

// ❌ 避免
t('total')
t('food')
```

### 2. 保持一致性
```typescript
// 所有按鈕都用 common.confirm
<button>{t('common.confirm')}</button>

// 不要每個頁面都自己定義
<button>{t('dashboard.confirmButton')}</button>
```

### 3. 複數處理
```typescript
// 翻譯檔案
{
  itemCount: '{{count}} 個項目',
  itemCount_plural: '{{count}} 個項目'
}

// 使用
t('itemCount', { count: 5 })
```

---

## ✅ 測試檢查清單

- [x] 編譯成功
- [x] 語言切換器正常運作
- [x] localStorage 正確保存語言偏好
- [x] 底部導航顯示正確翻譯
- [ ] 所有頁面切換語言後正確顯示（待全面整合後測試）
- [ ] 翻譯文字沒有截斷或溢出
- [ ] 英文版排版正常

---

## 📚 參考資源

- [react-i18next 官方文檔](https://react.i18next.com/)
- [i18next 文檔](https://www.i18next.com/)
- 翻譯文件位置：`/i18n/locales/`
- 配置文件：`/i18n/config.ts`

---

**總結**: 多語系基礎框架已完成，核心翻譯已準備好，可以逐步整合到各個組件中。✅
