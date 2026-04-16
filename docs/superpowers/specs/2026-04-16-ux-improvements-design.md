# UX Improvements Design

**Date:** 2026-04-16  
**Scope:** 7 UX fixes across Analytics, Notifications, Ledger, and MorePage  
**Priority order:** 2 → 4 → 6 → 1 → 3 → 5 → 7

---

## Item 2 — Connect Notifications to Backend

**Problem:** `NotificationsPage` displays hardcoded `MOCK_NOTIFICATIONS` from constants. Users see fake data that never updates.

**Design:**
- Remove `notifications` and `setNotifications` state from `App.tsx`; move data ownership into `NotificationsPage` itself via a local `useEffect` that calls `getNotifications()`
- On mount: call `getNotifications(limit=20)` from `notification.service.ts`
- `markAsRead(id)`: call `markNotificationAsRead(id)`, then update local state optimistically
- `markAllRead()`: call `markAllNotificationsAsRead(userId)`, then update local state
- Show empty state ("目前沒有新通知") when API returns empty array
- Show loading spinner while fetching
- Remove `notifications` and `setNotifications` props from `App.tsx` → `NotificationsPage` route

**Files changed:** `components/NotificationsPage.tsx`, `App.tsx`

---

## Item 4 — Remove "投資回報分析" Placeholder Card

**Problem:** The IRR / Sharpe / MDD card in AnalyticsPage shows `--` for all values under a "開發中" badge. Makes the page feel unfinished.

**Design:**
- Delete the entire "ROI Analysis - Coming Soon" card block from `AnalyticsPage.tsx` (lines ~744-765)
- No replacement needed; the net worth card and trend chart above it are sufficient

**Files changed:** `components/AnalyticsPage.tsx`

---

## Item 6 — Hide Category Filter in Calendar Mode

**Problem:** The category filter pills (飲食/交通/全部) are visible in calendar mode but have no effect on the calendar rendering.

**Design:**
- Wrap the category filter `<div>` with `{viewMode !== 'calendar' && (...)}`
- Also reset `selectedCategory` to `'All'` when switching to calendar mode (inside `onClick` for the calendar mode button)

**Files changed:** `components/AnalyticsPage.tsx`

---

## Item 1 — Show Transaction List on Calendar Day Click

**Problem:** Clicking a day in the Analytics calendar only switches to "day" view with aggregate stats. No transaction list is shown.

**Design:**
- Add `selectedDay: string | null` state to `AnalyticsPage` (ISO date string, e.g. `"2026-04-16"`)
- When a calendar cell is clicked: set `selectedDay` to that date (toggle off if same day clicked again); do NOT switch to day view mode
- Below the calendar grid, conditionally render a transaction list panel when `selectedDay` is set:
  - Header: "2026/04/16 的交易" with a close button
  - List of transactions for that day (filter from already-loaded `transactions` state — no extra API call)
  - Each row: category icon, note, amount (income green / expense rose), time
  - Empty state: "這天沒有記錄"
- The existing `onClick` that switched viewMode is removed; navigation between months still works via prev/next arrows

**Files changed:** `components/AnalyticsPage.tsx`

---

## Item 3 — Category Click in Analytics Jumps to Ledger with Filter

**Problem:** User sees a high-spend category in Analytics but must manually navigate to Ledger and re-apply the same filter.

**Design:**
- In the category breakdown list (expense category rows), add a small `→` `ArrowRight` icon button on the right of each row
- On click: `navigate('/ledger?category=飲食&month=2026-04')` using `useNavigate`; month derived from `currentDate` in `yyyy-MM` format
- In `Ledger.tsx`: read `useSearchParams()` on mount; if `category` param is present, set `selectedCategory`; if `month` param is present, set `currentDate` to that month
- The Ledger URL params are consumed once on mount and not kept in sync (one-way handoff)

**Files changed:** `components/AnalyticsPage.tsx`, `components/Ledger.tsx`

---

## Item 5 — Move Budget Settings to MorePage

**Problem:** Budget settings are hidden inside a modal triggered from the Ledger page. Users don't know it exists.

**Design:**
- Extract budget management modal from `Ledger.tsx` into a new standalone `BudgetSettingsPage.tsx` component
- Add route `/budget-settings` in `App.tsx`
- Add "預算設定" entry to `MorePage.tsx` with a `Wallet` icon linking to `/budget-settings`
- `Ledger.tsx` retains the read-only budget progress bars, but removes the edit modal and the "設定預算" button
- `BudgetSettingsPage` receives no props; fetches and saves budgets internally via `getBudgets()` / `setBudget()` / `removeBudget()`

**Files changed:** `components/Ledger.tsx`, `components/MorePage.tsx`, `App.tsx`, new `components/BudgetSettingsPage.tsx`

---

## Item 7 — Fix Day-Mode Metrics

**Problem:** In day view, "日均支出" equals the day's total expense (same number), making it meaningless. 

**Design:**
- When `viewMode === 'day'`: replace "日均支出" card with "今日交易" showing the count of transactions for that day
- Label: "今日交易", value: `${filteredTransactions.length} 筆`
- The other two metrics (儲蓄率, 最高消費日) remain as-is (they still make sense for a single day)

**Files changed:** `components/AnalyticsPage.tsx`

---

## Summary of Files Changed

| File | Items |
|------|-------|
| `components/AnalyticsPage.tsx` | 4, 6, 1, 3, 7 |
| `components/NotificationsPage.tsx` | 2 |
| `components/Ledger.tsx` | 3, 5 |
| `components/MorePage.tsx` | 5 |
| `components/BudgetSettingsPage.tsx` (new) | 5 |
| `App.tsx` | 2, 5 |
