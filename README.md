# 📊 SmartCapital

一個整合記帳與投資分析的智慧理財平台，結合 LINE Bot 與 Web 介面，提供無縫的記帳與投資追蹤體驗。

## ✨ 功能特色

### 🌐 Web 平台
- **Dashboard**: 資產總覽與視覺化圖表
- **Portfolio**: 投資組合管理與即時股價
- **Strategy Lab**: 投資策略計算器
  - 凱利公式（Kelly Criterion）
  - 馬丁格爾策略（Martingale）
  - 金字塔加碼（Pyramid）
  - 網格交易（Grid Trading）
  - 價值平均法（Value Averaging）
- **Ledger**: 生活記帳與分類統計

### 📱 LINE Bot
- **對話式記帳**: 輸入數字即可快速記帳
- **投資助理**: 查詢股價、買入/賣出記錄
- **智慧建議**: 凱利公式倉位建議、馬丁格爾救援點
- **一鍵開啟網站**: 從 LINE 快速查看完整資料

## 🚀 技術架構

### 前端
- React 19 + TypeScript
- Vite
- React Router
- Recharts (圖表)
- Lucide React (圖示)
- Morandi 配色設計

### 後端
- Node.js + Express
- TypeScript
- Prisma ORM
- SQLite (開發) / PostgreSQL (生產)
- LINE Bot SDK
- Yahoo Finance API (股價數據)

## 📦 本地開發

### 前端
```bash
npm install
npm run dev
```
訪問 `http://localhost:3001`

### 後端
```bash
cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```
訪問 `http://localhost:3000`

## 🌍 部署

詳見 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

- **前端**: Vercel
- **後端**: Render
- **資料庫**: PostgreSQL (Render)

## 📚 文件

- [LINE Bot 架構設計](./LINEBOT_ARCHITECTURE.md)
- [前端整合指南](./FRONTEND_INTEGRATION.md)
- [LIFF 整合指南](./LIFF_INTEGRATION_GUIDE.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)

## 🎨 設計理念

採用 Morandi 色系打造優雅寧靜的視覺體驗：
- Sage Green (#84A98C) - 獲利
- Dusty Rose (#D68C92) - 虧損
- Warm Charcoal (#44403C) - 主文字
- Stone Grey (#78716C) - 次要文字
- Paper (#F9F8F4) - 背景

## 📄 授權

MIT License

## 👨‍💻 開發者

SmartCapital Team
# SmartCapital
# SmartCapital
