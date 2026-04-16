# Dashboard Redesign Design

**Date:** 2026-04-17  
**Scope:** Reposition 資產主頁 as a personal finance dashboard with real stock prices  
**Out of scope:** Subscription tracking (separate spec)

---

## Problem

The current Dashboard tries to be an investment portfolio tracker, but all stock prices are static (hardcoded). The 24h change figures are fake. This makes the page feel broken and untrustworthy. Meanwhile, the app's strongest features — expense tracking, budgeting, analytics — are buried below the fold.

---

## Goal

Make the homepage answer "how am I doing financially right now?" using only real data. Pull real stock prices from free APIs so the investment section is also trustworthy.

---

## Section 1 — Hero Card

**Replaces:** Current hero card showing total net worth + fake 24h change

**Shows:**
- Headline number: sum of all cash account balances (real, from AccountManagement)
- Secondary line: current month net (income − expense), with ↑↓ arrow and color (sage = positive, rose = negative)
- Below: inline breakdown "收入 $X  支出 $Y" in small text

**Removes:** 24h change figure (was fake), investment total from headline (moved to section 5)

---

## Section 2 — 本月收支摘要

**Replaces:** Quick actions row (Ledger / Buy Stock / Import / Strategy buttons stay as FAB or move to MorePage)

**Shows:**
- Three summary chips: 收入 / 支出 / 結餘
- Top 2 highest-spend categories this month: category name + amount + percentage of total expense
- Entire section is tappable → navigates to `/analytics`

**Data source:** Existing `getTransactions()` — same data Analytics already uses, filtered to current month

---

## Section 3 — 預算警示

**Shows only when:** User has set at least one budget via BudgetSettingsPage

**Logic:**
- Filter budgets where `spent / limit ≥ 0.80`
- Show those budgets as progress bars (same style as Ledger's budget bars)
- If no budget is ≥80%: show single line "本月預算正常 ✓" (collapsed state)
- If no budgets configured: hide section entirely

**Tappable:** Navigates to `/budget-settings`

**Max rows shown:** 3 (to keep homepage scannable)

---

## Section 4 — 最近交易

**Shows:** 3 most recent transactions across all accounts

**Each row:** Category icon + category·subcategory label + note (truncated) + amount (sage/rose) + relative date ("今天" / "昨天" / "4/15")

**Footer:** "更多交易 →" link to `/ledger`

**Data source:** Existing `getTransactions(limit=3)`

---

## Section 5 — 投資摘要

**Replaces:** Large asset allocation pie chart + Top 3 Movers + full holdings list

**Shows:**
- Total market value (real-time)
- Total unrealized P&L (amount + percentage)
- Holdings count: "持有 N 檔"
- Tappable → expands or navigates to a holdings detail view (existing modal/page)

**Real-time price APIs:**

| Asset type | API | Notes |
|---|---|---|
| 台股 (TWD) | TWSE Open API `https://mis.twse.com.tw/stock/api/getStockInfo.jsp` | Official, free, no key required |
| 加密貨幣 | CoinGecko `/api/v3/simple/price` | Free, 30 req/min |
| 美股 | Finnhub `/quote` | Free tier, 60 req/min, requires API key |

**Caching:** Prices cached for 60 seconds in component state to avoid rate-limit spam on re-renders.

**Loading state:** Skeleton placeholder while fetching. If any API fails, show last known price with a "⚠ 價格可能未即時" label.

**Finnhub API key:** Stored in `.env` as `VITE_FINNHUB_API_KEY`, accessed via `import.meta.env`.

---

## Section 6 — 訂閱摘要（預留）

Not implemented in this spec. Section slot reserved in layout order. Will be filled when subscription tracking spec is implemented.

---

## Removed from Dashboard

| Element | Reason |
|---|---|
| Top 3 Movers | Fake 24h data, misleading |
| Asset allocation pie chart | Replaced by compact investment card |
| Large holdings list | Too detailed for homepage; accessible via investment card tap |
| Fake 24h change on hero | No real price feed at hero level |
| Quick action buttons (Buy/Import/Strategy) | Move to FAB or MorePage to reduce clutter |

---

## Data Flow

```
Dashboard mounts
  ├── getTransactions(30)       → sections 2, 4
  ├── getBudgets()              → section 3
  ├── getAccounts()             → section 1 (cash balance)
  └── fetchPrices(assets)       → section 5
        ├── TWSE API  (TW stocks)
        ├── CoinGecko (crypto)
        └── Finnhub   (US stocks)
```

All calls made in parallel via `Promise.all`. Dashboard shows skeleton until all resolve (or timeout after 5s, then shows what's available).

---

## Files Changed

| File | Action |
|---|---|
| `components/Dashboard.tsx` | Major rewrite — new section layout |
| `services/price.service.ts` | New — TWSE + CoinGecko + Finnhub fetch + cache |
| `.env` | Add `VITE_FINNHUB_API_KEY` |
| `App.tsx` | Minor — remove quick-action prop threading if any |
