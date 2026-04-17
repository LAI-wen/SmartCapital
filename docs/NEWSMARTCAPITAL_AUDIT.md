# ＮＥＷsmartcapital Audit

> 更新時間: 2026-04-16
> 比對對象: repo 根目錄前端 vs `ＮＥＷsmartcapital/`

## 結論

`ＮＥＷsmartcapital/` 目前判定為「較早期的前端副本」，不是另一條更完整或更新的主線。

目前沒有明顯證據顯示它包含必須先回收的獨有功能；更合理的處理方式是：

- 視為歷史副本
- 保留作為短期參考
- 後續在確認無需回收後，移至統一 archive 位置或自 git 移除

## 主要判斷依據

### 1. `App.tsx` 顯示主線已整合更多正式能力

主線 [App.tsx](App.tsx:9) 已接上：

- `services/api`
- `contexts/LiffContext`
- `i18n/config`
- route-level lazy loading
- `AccountManagementPage`
- `PriceAlertsPage`
- `OnboardingModal`

相對地，[ＮＥＷsmartcapital/App.tsx](ＮＥＷsmartcapital/App.tsx:13) 仍以：

- `MOCK_ASSETS`
- `MOCK_NOTIFICATIONS`
- `MOCK_ACCOUNTS`

作為主要資料來源，沒有看到對應的 API / LIFF / i18n 整合。

### 2. `package.json` 依賴較少，反映功能面較舊

主線 [package.json](package.json:13) 已包含：

- `@line/liff`
- `i18next`
- `react-i18next`

而 [ＮＥＷsmartcapital/package.json](ＮＥＷsmartcapital/package.json:11) 沒有這些依賴，表示它不是目前整合 LIFF 與多語系的版本。

### 3. `vite.config.ts` 缺少目前主線的 bundle 優化

主線 [vite.config.ts](vite.config.ts:12) 已加入 `manualChunks`，將 `framework`、`router`、`icons`、`i18n`、`date-utils`、`charts` 分組。

[ＮＥＷsmartcapital/vite.config.ts](ＮＥＷsmartcapital/vite.config.ts:12) 沒有這些設定，顯示它停留在優化前版本。

### 4. `tsconfig.json` 也沒有目前主線的驗證邊界

主線 [tsconfig.json](tsconfig.json:1) 已加入：

- `vite/client` 型別
- 明確的 `include`
- 對 `backup_20251124/`、`server/`、`ＮＥＷsmartcapital/` 的 `exclude`

[ＮＥＷsmartcapital/tsconfig.json](ＮＥＷsmartcapital/tsconfig.json:1) 仍是較早期版本，沒有這些主線維護設定。

### 5. 元件集合比主線更少

根目錄主線存在但 `ＮＥＷsmartcapital/` 缺少的頁面 / 元件至少包含：

- `components/AccountManagementPage.tsx`
- `components/PriceAlertsPage.tsx`
- `components/OnboardingModal.tsx`
- `components/WelcomePage.tsx`
- `components/DashboardAllocationChart.tsx`
- `contexts/`
- `services/`
- `i18n/`

這顯示 `ＮＥＷsmartcapital/` 不是主線超集，而是更接近主線的舊子集。

## 建議處理方式

### 短期

- 保持目前「歷史副本」定位
- 不再於 `ＮＥＷsmartcapital/` 直接開發
- 只以 repo 根目錄前端與 `server/` 作為正式來源

### 中期

- 若之後沒有發現需回收差異，可將 `ＮＥＷsmartcapital/` 移至統一 `archive/` 目錄
- 或直接自 git 移除，只保留必要文件摘要

## 補充

目前 `.gitignore` 已加入：

- `/backup_20251124/`
- `/ＮＥＷsmartcapital/`

這兩個資料夾目前也已自 git 解除追蹤，後續若保留本地副本，也不會再被誤加回 repo。
