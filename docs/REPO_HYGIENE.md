# Repo Hygiene Guide

> 更新時間: 2026-04-15

## 正式來源

目前專案的正式開發來源只有兩個區域：

- repo 根目錄前端：`App.tsx`、`components/`、`contexts/`、`services/`、`i18n/`、`src/`
- 後端：`server/`

所有新的功能開發、除錯、測試與文件同步，都應以這兩個區域為準。

## 歷史資料夾

目前 repo 內仍有兩組歷史資料：

- `backup_20251124/`
- `ＮＥＷsmartcapital/`

這兩個資料夾目前都不是正式執行入口，也不應再作為主線修改位置。它們已自 git 解除追蹤，只保留在本地工作目錄作為歷史參考。

其中 `ＮＥＷsmartcapital/` 已完成一次比對盤點，結果記錄於 [docs/NEWSMARTCAPITAL_AUDIT.md](/Users/wen/Documents/dev/smartcapital/docs/NEWSMARTCAPITAL_AUDIT.md)。目前判定它較接近舊版前端副本，而非另一條更完整的主線。

## 已套用的保護措施

- 前端 `tsconfig.json` 已排除 `backup_20251124/`
- 前端 `tsconfig.json` 已排除 `ＮＥＷsmartcapital/`
- 前端 `typecheck` 與 build-based smoke test 只驗證主線來源
- `.gitignore` 已忽略這兩個歷史資料夾，避免未來再被誤加回 repo

這表示歷史資料夾目前不會再干擾主線型別檢查，但它們仍然存在於 repo 中，需要團隊共同遵守來源邊界。

## 建議工作規則

- 不要在 `backup_20251124/` 新增或修改功能
- 不要在 `ＮＥＷsmartcapital/` 直接繼續開發
- 若發現歷史資料夾內有需要保留的實作，應手動比對後再合併回主線
- 文件、build、test、review 都只以根目錄前端與 `server/` 為準

## 後續整理建議

若之後要做真正的 repo 瘦身，可依序處理：

1. 盤點 `ＮＥＷsmartcapital/` 是否仍有未回收差異
2. 將 `backup_20251124/` 與 `ＮＥＷsmartcapital/` 移至單一 `archive/` 目錄，或直接刪除本地副本
3. 清理過時文件，保留少量有效狀態文件

在尚未完成上述動作前，請將這兩個資料夾視為「僅供參考的歷史快照」。
