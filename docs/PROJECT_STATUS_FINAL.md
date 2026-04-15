# SmartCapital 專案狀態更新

> 更新時間: 2026-04-15
> 來源: 目前 repo 實作、build 與 test 驗證結果

## 目前判斷

專案目前屬於「功能型 MVP 已完整、工程面已完成一輪補強，但還沒到 fully production-ready」的階段。

- P0 風險已處理完成
- P1 工程補強完成大半
- 文件同步已改善，但 repo 歷史資料與前端自動化測試仍待整理

## 這次已確認完成的修正

### 安全性

- 受保護的 `/:lineUserId` API 已補上 ownership 驗證，不再只信任 path / body / query 送入的 `lineUserId`
- 部分以資源 id 操作的 API 已改為以 JWT 使用者為主，避免跨帳號操作
- CORS 已由 `Access-Control-Allow-Origin: *` 改為白名單模式，使用 `FRONTEND_URL` 與 `CORS_ALLOWED_ORIGINS`

### 核心功能正確性

- `server/src/utils/messageParser.ts` 的規則順序已修正
- 收入、查股、買入、賣出指令不再被泛用中文金額規則誤判為支出
- 後端測試由原本失敗 8 筆，修正後為 `67/67` 全綠

### 前端載入效能

- `index.html` 中已移除失效的 `/index.css` 引用，build warning 已消失
- 頁面已改為 route-level lazy loading
- Dashboard 中圖表與 modal 已改為按需載入
- `@line/liff` 已改為動態載入
- vendor chunk 已拆分為 `framework`、`router`、`icons`、`i18n`、`date-utils`、`charts`

## 最新驗證結果

以下結果為本次直接在 repo 驗證：

- 前端 `npm run build` 通過
- 前端 `npm run typecheck` 通過
- 前端 `npm run test:smoke` 通過
- 後端 `cd server && npm run build` 通過
- 後端 `cd server && npm run test:run` 通過，結果為 `67/67`

## 前端目前產物概況

- 主入口 `index` 約 `47.40 kB`，gzip 約 `14.36 kB`
- Dashboard chunk 約 `16.44 kB`，gzip 約 `5.05 kB`
- `icons` chunk 約 `29.84 kB`，gzip 約 `6.34 kB`
- `charts` chunk 仍約 `369.13 kB`，gzip 約 `108.06 kB`

## 目前仍未完成的項目

### 工程與 repo 整理

- `backup_20251124/` 與 `ＮＥＷsmartcapital/` 已自 git 解除追蹤，僅保留於本地工作目錄作為歷史快照
- 前端 `tsconfig.json` 已排除這些歷史資料夾，不再影響主線 typecheck
- 已新增 [docs/REPO_HYGIENE.md](/Users/wen/Documents/dev/smartcapital/docs/REPO_HYGIENE.md) 作為主線來源與封存策略說明
- 已新增 [docs/NEWSMARTCAPITAL_AUDIT.md](/Users/wen/Documents/dev/smartcapital/docs/NEWSMARTCAPITAL_AUDIT.md)，判定 `ＮＥＷsmartcapital/` 較接近舊版前端副本，非主線超集
- 歷史文件很多，仍有部分內容與最新實作重疊或過時

### 驗證與維護性

- 前端目前已補上 `typecheck` 與 build-based smoke test，但仍未建立正式 ESLint 流程
- 前端也尚未建立元件 / 整合測試框架
- `Analytics` 部分進階投資績效數值仍屬開發中狀態

## 建議優先順序

### 第 1 階段

- 依 [docs/REPO_HYGIENE.md](/Users/wen/Documents/dev/smartcapital/docs/REPO_HYGIENE.md) 盤點本地歷史快照是否仍有需要回收的差異
- 若確認不再需要本地參考，再決定是否將歷史資料夾移至統一 `archive/` 位置或直接刪除本地副本

### 第 2 階段

- 補前端 ESLint
- 規劃最小可行的前端測試，例如關鍵頁面的 render / routing smoke tests

### 第 3 階段

- 進一步減少 `charts` chunk 體積
- 若要準備正式上線，再補 deployment checklist 與環境設定驗證

## 結論

目前不建議再使用「已可直接正式上線」作為專案結論。

比較準確的描述是：

- 功能面已可 demo，也具備完整產品雛形
- 安全性與核心正確性問題已處理
- 工程與文件品質比先前穩定許多
- 若要正式上線，仍建議先完成 repo 整理、前端 lint / 測試補強與部署流程確認
