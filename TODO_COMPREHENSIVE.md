# 📋 SmartCapital 全面功能待辦清單

**更新時間**: 2024-11-25
**版本**: 1.0

---

## 🔴 P0 - Critical（必須完成）

### 1. 帳戶系統 (Account System) - 資產閉環核心

**現狀**: ❌ 完全缺失
**問題**:
- 買股票時憑空產生資產（無扣款來源）
- 轉帳無法記錄（例如：銀行 → 證券戶）
- 無法追蹤購買力（餘額）
- 總資產計算邏輯錯誤

**需要實現**:
- [ ] `Account` 資料模型（帳戶表）
- [ ] `Transfer` 資料模型（轉帳記錄）
- [ ] `Transaction` 表新增 `accountId` 欄位
- [ ] 帳戶管理頁面（AccountManagementPage）✅ **已完成**
- [ ] 轉帳功能（帳戶間轉帳）
- [ ] 購買力檢查（買股票前檢查餘額）
- [ ] 餘額同步邏輯（交易時更新帳戶餘額）

**檔案位置**:
- 後端: `server/prisma/schema.prisma` (需要 migration)
- 前端: `components/AccountManagementPage.tsx` ✅

---

### 2. 多幣別支援 (Multi-Currency)

**現狀**: ❌ 部分支援（前端有 currency 欄位，但後端儲存有問題）
**問題**:
- 美金交易無法正確儲存原始幣別
- 匯率轉換在「存入時」而非「顯示時」
- 無法還原原始金額（例如：存 $100，只存 NT$3,100）
- Dashboard 總資產計算錯誤（混合多幣別）

**需要實現**:
- [ ] `Transaction.originalCurrency` 欄位（儲存原始幣別）
- [ ] `Transaction.exchangeRate` 欄位（匯率快取）
- [ ] `Asset.avgCurrency` 欄位（持股成本幣別）
- [ ] ExchangeRateService（匯率查詢 API）
- [ ] 匯率快取機制（1小時更新）
- [ ] 幣別切換 UI（顯示偏好設定）
- [ ] 即時匯率轉換顯示

**參考文檔**: `PRODUCT_DESIGN_DOC.md` Line 1727-1960

---

### 3. LINE Bot 記帳功能整合

**現狀**: ❌ 缺失
**問題**: LINE Bot 只能查股價，無法記帳

**需要實現**:
- [ ] 訊息解析器（`messageParser.ts`）支援記帳模式
  - 數字開頭 → 記帳模式（`-120` = 支出 120）
  - 正數 = 收入，負數 = 支出
- [ ] Quick Reply 分類選擇（飲食/交通/購物/娛樂）
- [ ] 智能分類預測（Phase 1: 規則基礎）
- [ ] 記帳確認訊息（顯示餘額）
- [ ] 備註功能（例如：`-120 飲食 午餐`）

**檔案位置**:
- `server/src/utils/messageParser.ts` ✅ 已存在，需擴充
- `server/src/controllers/webhookController.ts`

**參考文檔**: `PRODUCT_DESIGN_DOC.md` Line 183-205, 625-655

---

### 4. LINE Bot 買賣股票功能

**現狀**: ❌ 只有查詢，無法交易
**問題**: LINE Bot 卡片有「買入」「賣出」按鈕，但點擊無反應

**需要實現**:
- [ ] 對話式買入流程
  - Bot 提示：「請輸入股數」
  - 用戶輸入數字
  - Bot 計算成本並確認
  - 用戶確認後儲存
- [ ] 對話式賣出流程
- [ ] 檢查持倉數量（賣出時）
- [ ] 檢查帳戶餘額（買入時）
- [ ] 交易確認 Flex Message

**檔案位置**:
- `server/src/controllers/webhookController.ts`
- `server/src/services/databaseService.ts`

**參考文檔**: `PRODUCT_DESIGN_DOC.md` Line 233-260

---

### 5. 複委託支援 (Sub-brokerage)

**現狀**: ❌ 缺失
**問題**: 台灣用戶最常見的美股購買方式是「複委託」（用 TWD 帳戶買 USD 股票），但系統強迫建立美金帳戶

**需要實現**:
- [ ] `Account.isSub` 欄位（標記複委託帳戶）
- [ ] BuyStockModal 智能帳戶選擇邏輯
  - 美股優先選 USD 帳戶
  - 若無 USD 帳戶 → 使用 TWD 帳戶（複委託模式）
- [ ] 複委託換匯提示 UI
  - 顯示：US$150 × 32.5 = NT$4,875
  - 提醒：實際匯率以券商為準
- [ ] 交易時自動計算匯率並扣款

**檔案位置**:
- `components/BuyStockModal.tsx` ✅ 已有基礎邏輯
- `server/src/services/databaseService.ts`（買入 API）

**參考文檔**: `PRODUCT_DESIGN_DOC.md` Line 139-155, 483-599

---

## 🟠 P1 - Important（重要功能）

### 6. Onboarding 流程（新用戶引導）

**現狀**: ❌ 缺失
**問題**: 新用戶不知道如何開始，沒有引導流程

**需要實現**:
- [ ] 投資範圍設定（Progressive Disclosure）
  - [ ] `User.enableTWStock` 欄位（預設 true）
  - [ ] `User.enableUSStock` 欄位（預設 false）
  - [ ] `User.enableCrypto` 欄位（預設 false）
- [ ] 本金設定
- [ ] 自動建立預設帳戶
  - 純台股：現金錢包 + 證券交割戶（TWD）
  - 複委託：證券交割戶（TWD）
  - 雙棲：自行建立 USD 帳戶
- [ ] 教學卡片（使用說明）

**檔案位置**:
- `components/OnboardingModal.tsx` ✅ 已存在，需完善
- `server/prisma/schema.prisma`（User 表需新增欄位）

**參考文檔**: `PRODUCT_DESIGN_DOC.md` Line 110-178

---

### 7. 定期投資功能 (Recurring Transactions)

**現狀**: ❌ 缺失
**問題**: 定期定額投資需要每月手動輸入，容易放棄

**需要實現**:
- [ ] `RecurringTransaction` 資料模型
  - 類型（買股票/固定支出/固定收入）
  - 週期（每日/每週/每月/每年）
  - 提醒時間
  - 自動執行開關
- [ ] LINE Bot 定期提醒
  - 推播訊息：「⏰ 定期定額提醒」
  - 快速確認按鈕：[是，以市價記錄] [手動輸入] [跳過]
- [ ] Web 管理介面
  - 定期交易列表
  - 編輯/刪除/啟用/停用

**檔案位置**:
- `server/prisma/schema.prisma`（新增表）
- `components/RecurringTransactionsPage.tsx`（新建）
- `server/src/services/cronService.ts`（新建）

**參考文檔**: `PRODUCT_DESIGN_DOC.md` Line 1596-1723

---

### 8. 智能分類預測

**現狀**: ❌ 缺失
**問題**: 每次記帳都要手動選分類，很煩

**需要實現**:
- [ ] Phase 1: 規則基礎預測
  - 時間規則（11-14點 + 小額 → 飲食）
  - 金額規則（>5000 → 居住）
  - 歷史規則（相似金額的最常用分類）
- [ ] Phase 2: 機器學習預測（未來）
- [ ] 錯誤修正機制
  - Bot 自動記錄到預測分類
  - 用戶回覆「改為 交通」即可修正

**檔案位置**:
- `server/src/services/categoryPredictionService.ts`（新建）
- `server/src/controllers/webhookController.ts`

**參考文檔**: `PRODUCT_DESIGN_DOC.md` Line 758-806

---

### 9. 備註功能 (Transaction Note)

**現狀**: ⚠️ 資料庫有欄位，但前端/LINE Bot 無法輸入
**問題**: 想記錄「午餐」「計程車」等細節，但無法輸入

**需要實現**:
- [ ] LINE Bot 支援備註
  - 格式：`-120 飲食 午餐`
  - 解析：金額 + 分類 + 備註
- [ ] Web Ledger 新增備註輸入框
- [ ] Ledger 列表顯示備註
- [ ] 備註搜尋功能

**檔案位置**:
- `server/src/utils/messageParser.ts`
- `components/Ledger.tsx` ✅

---

### 10. 語言/貨幣顯示偏好

**現狀**: ❌ 硬編碼
**問題**:
- 界面語言混雜中英文
- 貨幣顯示固定為 NT$，無法切換為 USD

**需要實現**:
- [ ] `UserSettings.language` 欄位（zh-TW / en-US）
- [ ] `UserSettings.displayCurrency` 欄位（TWD / USD）
- [ ] i18n 國際化框架（react-i18next）
- [ ] 偏好設定頁面
- [ ] 即時切換語言/貨幣

**檔案位置**:
- `server/prisma/schema.prisma`（UserSettings 擴充）
- `components/SettingsPage.tsx`
- `i18n/` 資料夾（新建）

---

### 11. 投資回報分析（真實計算）

**現狀**: ⚠️ 假資料（IRR 12.4%, Sharpe 1.85, MDD -15.2%）
**問題**: 顯示假數據會誤導用戶

**需要實現**:
- [ ] 選項 A: 隱藏區塊 + 「功能開發中」標籤 ⭐️ **推薦**
- [ ] 選項 B: 實作真實計算（複雜）
  - IRR（年化報酬率）計算
  - Sharpe Ratio（風險調整後報酬）
  - Maximum Drawdown（最大回撤）
  - 需要歷史持倉快照

**檔案位置**:
- `components/AnalyticsPage.tsx` Line 622-640

---

## 🟡 P2 - Nice to Have（體驗優化）

### 12. 空狀態引導

**現狀**: ⚠️ 部分有，部分缺失
**問題**: 新用戶看到空白頁面會困惑

**需要實現**:
- [ ] Dashboard 無持股時的引導
- [ ] Ledger 無交易時的引導
- [ ] StrategyLab 的使用說明

**檔案位置**: 各個頁面組件

---

### 13. 股票交易歷史

**現狀**: ❌ 缺失
**問題**: 只能看到當前持股，看不到歷史交易記錄

**需要實現**:
- [ ] `StockTransaction` 表已存在，需要 UI 顯示
- [ ] 交易歷史頁面（按時間排序）
- [ ] 篩選功能（按股票代碼/日期）

**檔案位置**:
- `components/TradeHistoryPage.tsx`（新建）

---

### 14. 價格預警推播

**現狀**: ❌ 缺失
**問題**: 無法設定股價提醒

**需要實現**:
- [ ] `PriceAlert` 資料模型
- [ ] 設定頁面（目標價格）
- [ ] 定時檢查股價（Cron Job）
- [ ] LINE Push Message 推播

**檔案位置**:
- `server/src/services/alertService.ts`（新建）

---

### 15. 資產報告（月報/年報）

**現狀**: ❌ 缺失
**需要實現**:
- [ ] 月度資產變化圖表
- [ ] 年度投資報酬總結
- [ ] PDF 匯出功能

**檔案位置**:
- `components/ReportsPage.tsx`（新建）

---

### 16. 全局搜尋

**現狀**: ❌ 缺失
**需要實現**:
- [ ] 搜尋交易記錄（by 金額/分類/備註）
- [ ] 搜尋股票（by 代碼/名稱）
- [ ] Cmd+K / Ctrl+K 快捷鍵

---

### 17. 群組聊天支援

**現狀**: ❌ 缺失
**問題**: LINE Bot 在群組中無法使用

**需要實現**:
- [ ] 群組模式偵測
- [ ] @mention 觸發
- [ ] 多用戶資料隔離

---

### 18. 代碼重構建議

**問題**:
- 組件過於龐大（Ledger.tsx, AnalyticsPage.tsx 都超過 600 行）
- 邏輯與 UI 混雜
- 缺少自訂 Hooks

**建議重構**:
- [ ] 抽離業務邏輯到自訂 Hooks
  - `useTransactions()`
  - `useAssets()`
  - `useAccounts()`
- [ ] 拆分大組件為小組件
  - `Ledger.tsx` → 拆成 `TransactionList`, `QuickInput`, `Statistics`
  - `AnalyticsPage.tsx` → 拆成 `IncomeExpenseView`, `AssetTrendView`
- [ ] 建立共用組件庫
  - `Button`, `Modal`, `Card`, `Input` 等

**檔案位置**:
- `hooks/` 資料夾（新建）
- `components/ui/` 資料夾（新建）

---

## 📊 優先級總結

### 立即處理（本週）:
1. ✅ 帳戶系統基礎（Account/Transfer 表）- **部分完成**
2. LINE Bot 記帳功能
3. 複委託支援
4. 備註功能

### 短期處理（2 週內）:
5. 多幣別支援
6. LINE Bot 買賣股票
7. Onboarding 流程
8. 智能分類預測

### 中期處理（1 個月內）:
9. 定期投資功能
10. 投資回報分析（隱藏或實作）
11. 語言/貨幣偏好
12. 空狀態引導

### 長期規劃（未來）:
13. 代碼重構
14. 價格預警
15. 資產報告
16. 全局搜尋
17. 群組聊天

---

## 🔗 相關文檔

- [PRODUCT_DESIGN_DOC.md](./PRODUCT_DESIGN_DOC.md) - 完整產品設計
- [LINEBOT_ARCHITECTURE.md](./LINEBOT_ARCHITECTURE.md) - LINE Bot 架構
- [UX_IMPROVEMENT_PLAN.md](./UX_IMPROVEMENT_PLAN.md) - UX 改進方案

---

**維護者**: SmartCapital Team
**更新時間**: 2024-11-25
