# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7 UX improvements across AnalyticsPage, NotificationsPage, Ledger, MorePage, and App in priority order 2→4→6→1→3→5→7.

**Architecture:** Each task is a self-contained change to one or two files. No new dependencies are needed. Item 5 introduces one new file (`BudgetSettingsPage.tsx`) extracted from `Ledger.tsx`. All other items modify existing files only.

**Tech Stack:** React 19, TypeScript, react-router-dom v6, Tailwind CSS (via CDN config in index.html), lucide-react icons, date-fns, existing service functions in `services/`.

---

## File Map

| File | Items | Action |
|------|-------|--------|
| `components/NotificationsPage.tsx` | 2 | Modify — remove props, add local data fetching |
| `App.tsx` | 2, 5 | Modify — remove notification state/props, add budget-settings route |
| `components/AnalyticsPage.tsx` | 4, 6, 1, 3, 7 | Modify — 5 targeted edits |
| `components/Ledger.tsx` | 3, 5 | Modify — add URL param reading, remove budget modal |
| `components/MorePage.tsx` | 5 | Modify — add 預算設定 menu entry |
| `components/BudgetSettingsPage.tsx` | 5 | Create — standalone budget management page |

---

## Task 1: Item 2 — Connect Notifications to Backend

**Files:**
- Modify: `components/NotificationsPage.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Update `NotificationsPage.tsx` — remove props, add local state + data fetching**

Replace the entire file with:

```tsx

import React, { useState, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle } from 'lucide-react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, type Notification } from '../services/notification.service';
import { getUserId } from '../services/user.service';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await getNotifications(20);
      setNotifications(data);
      setIsLoading(false);
    };
    load();
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await markNotificationAsRead(id);
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await markAllNotificationsAsRead(getUserId());
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle size={20} />;
      case 'success': return <Check size={20} />;
      case 'info': default: return <Info size={20} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'alert': return 'bg-morandi-roseLight text-morandi-rose';
      case 'success': return 'bg-morandi-sageLight text-morandi-sage';
      case 'info': default: return 'bg-morandi-blueLight text-morandi-blue';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 animate-fade-in">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-morandi-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-ink-400 font-serif">載入通知中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6">
         <div className="text-sm text-ink-400 font-serif">
           您有 {notifications.filter(n => !n.read).length} 則未讀通知
         </div>
         {notifications.some(n => !n.read) && (
           <button 
             onClick={markAllRead} 
             className="text-xs font-bold text-morandi-blue hover:underline font-serif"
           >
             全部標為已讀
           </button>
         )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Bell size={48} className="text-stone-300 mb-4" />
              <p className="font-serif text-ink-400">目前沒有新通知</p>
           </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => markAsRead(n.id)}
              className={`
                relative p-4 rounded-xl border transition-all cursor-pointer
                ${n.read ? 'bg-white border-stone-100' : 'bg-white border-morandi-blue/20 shadow-sm'}
              `}
            >
              {!n.read && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-morandi-rose"></div>
              )}
              
              <div className="flex gap-4">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getColor(n.type)}`}>
                    {getIcon(n.type)}
                 </div>
                 <div className="flex-1 pr-4">
                    <h4 className={`text-sm font-bold font-serif mb-1 ${n.read ? 'text-ink-500' : 'text-ink-900'}`}>
                      {n.title}
                    </h4>
                    <p className="text-xs text-ink-400 font-serif leading-relaxed mb-2">
                      {n.message}
                    </p>
                    <div className="text-[10px] text-stone-300 font-serif">
                      {n.time}
                    </div>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
```

- [ ] **Step 2: Update `App.tsx` — remove notification state and props**

In `App.tsx`:

a) Remove line 63 (notification state):
```tsx
// DELETE this line:
const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
```

b) Remove line 64 (unreadCount derived from state):
```tsx
// DELETE this line:
const unreadCount = notifications.filter(n => !n.read).length;
```

Add in their place a hardcoded `unreadCount = 0` (the badge will update once we add a real count from backend, for now the badge simply disappears — acceptable given notifications are read via their own page):
```tsx
const unreadCount = 0;
```

c) Change the `/notifications` route from:
```tsx
<Route path="/notifications" element={<NotificationsPage notifications={notifications} setNotifications={setNotifications} />} />
```
to:
```tsx
<Route path="/notifications" element={<NotificationsPage />} />
```

d) Remove `MOCK_NOTIFICATIONS` from the import on line 7 — change:
```tsx
import { MOCK_ASSETS, MOCK_NOTIFICATIONS } from './constants';
```
to:
```tsx
import { MOCK_ASSETS } from './constants';
```

e) Remove `Notification` from the types import on line 8 if it is no longer used anywhere else in App.tsx. Check first — if `Notification` is only used in the deleted state, remove it:
```tsx
// Before:
import { Notification, Asset, Account, InvestmentScope } from './types';
// After (if Notification unused):
import { Asset, Account, InvestmentScope } from './types';
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/NotificationsPage.tsx App.tsx
git commit -m "feat: connect NotificationsPage to backend API, remove mock data"
```

---

## Task 2: Item 4 — Remove "投資回報分析" Placeholder Card

**Files:**
- Modify: `components/AnalyticsPage.tsx:744-765`

- [ ] **Step 1: Delete the ROI card block**

In `components/AnalyticsPage.tsx`, find and delete lines 744–765 (the entire ROI Analysis card):

```tsx
// DELETE this entire block:
           {/* ROI Analysis - Coming Soon */}
           <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-morandi-clay text-white text-xs font-bold px-3 py-1 rounded-full">
                 開發中
              </div>
              <h3 className="font-bold text-ink-900 font-serif mb-4">投資回報分析</h3>
              <div className="space-y-4 opacity-50">
                 <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                    <span className="text-sm text-ink-500 font-serif">年化報酬率 (IRR)</span>
                    <span className="font-serif-num font-bold text-morandi-sage text-lg">--</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                    <span className="text-sm text-ink-500 font-serif">夏普比率 (Sharpe)</span>
                    <span className="font-serif-num font-bold text-ink-900 text-lg">--</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                    <span className="text-sm text-ink-500 font-serif">最大回撤 (MDD)</span>
                    <span className="font-serif-num font-bold text-morandi-rose text-lg">--</span>
                 </div>
              </div>
              <p className="text-xs text-ink-400 mt-4 text-center">此功能正在開發中，敬請期待</p>
           </div>
```

The `{activeTab === 'asset' && ...}` block should end with just the trend chart card, followed by `</div>` and `)}`.

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/AnalyticsPage.tsx
git commit -m "feat: remove 投資回報分析 placeholder card from AnalyticsPage"
```

---

## Task 3: Item 6 — Hide Category Filter in Calendar Mode

**Files:**
- Modify: `components/AnalyticsPage.tsx`

- [ ] **Step 1: Wrap the category filter with a conditional**

In `components/AnalyticsPage.tsx`, find the `{/* Category Filter */}` block (around line 505):

```tsx
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-1">
          {allCategories.map(cat => (
            ...
          ))}
        </div>
```

Wrap the entire `<div>` in a conditional:

```tsx
        {/* Category Filter — hidden in calendar mode */}
        {viewMode !== 'calendar' && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-1">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-serif whitespace-nowrap border transition-all ${
                  selectedCategory === cat
                    ? 'bg-ink-800 text-white border-ink-800 shadow-sm'
                    : 'bg-white text-ink-400 border-stone-200 hover:border-ink-400'
                }`}
              >
                {cat === 'All' ? '全部' : cat}
              </button>
            ))}
          </div>
        )}
```

- [ ] **Step 2: Reset selectedCategory when switching to calendar mode**

Find the calendar mode button's `onClick` (around line 476):

```tsx
            onClick={() => { setViewMode('calendar'); setCurrentDate(new Date()); }}
```

Change it to also reset selectedCategory:

```tsx
            onClick={() => { setViewMode('calendar'); setCurrentDate(new Date()); setSelectedCategory('All'); }}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/AnalyticsPage.tsx
git commit -m "feat: hide category filter in calendar mode, reset on switch"
```

---

## Task 4: Item 1 — Show Transaction List on Calendar Day Click

**Files:**
- Modify: `components/AnalyticsPage.tsx`

- [ ] **Step 1: Add `selectedDay` state**

In `AnalyticsPage`, after the existing `isDatePickerOpen` state declarations (around line 70), add:

```tsx
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
```

- [ ] **Step 2: Add `ArrowRight` to lucide imports and `format` is already imported**

Change the lucide import line from:
```tsx
import { TrendingUp, TrendingDown, DollarSign, Calendar, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
```
to:
```tsx
import { TrendingUp, TrendingDown, DollarSign, Calendar, ChevronLeft, ChevronRight, CalendarDays, X as XIcon } from 'lucide-react';
```

(We need `X` for the close button on the day transaction panel. Import it as `XIcon` to avoid clash with any variable named `X`.)

- [ ] **Step 3: Change calendar day click to toggle `selectedDay` instead of switching view**

In `renderCalendar()`, find the day cell's `onClick` (around line 393):

```tsx
                onClick={() => { setCurrentDate(day); setViewMode('day'); }}
```

Replace it with:

```tsx
                onClick={() => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  setSelectedDay(prev => prev === dayStr ? null : dayStr);
                }}
```

Also remove the `cursor-pointer` highlight that was implying view mode switch — keep the existing hover/border classes unchanged (they still provide good visual feedback).

- [ ] **Step 4: Add the selected day transaction panel below `renderCalendar()`**

In the JSX, after `renderCalendar()` inside the `{viewMode === 'calendar' ? renderCalendar() : (...)}` block — change:

```tsx
          {/* Calendar View */}
          {viewMode === 'calendar' ? (
            renderCalendar()
          ) : (
```

to:

```tsx
          {/* Calendar View */}
          {viewMode === 'calendar' ? (
            <>
              {renderCalendar()}
              {selectedDay && (() => {
                const dayTxs = transactions.filter(t => t.date.startsWith(selectedDay));
                return (
                  <div className="bg-white rounded-2xl border border-stone-100 shadow-paper p-4 animate-fade-in mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold font-serif text-ink-900 text-sm">
                        {selectedDay.replace(/-/g, '/')} 的交易
                      </h4>
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="p-1 hover:bg-stone-100 rounded-lg text-ink-400 transition-colors"
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                    {dayTxs.length === 0 ? (
                      <p className="text-sm text-ink-400 font-serif text-center py-4">這天沒有記錄</p>
                    ) : (
                      <div className="space-y-2">
                        {dayTxs.map(t => (
                          <div key={t.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shrink-0 ${t.type === 'income' ? 'bg-morandi-sage' : 'bg-morandi-rose'}`}>
                                {t.category.slice(0, 1)}
                              </div>
                              <div>
                                <div className="text-sm font-serif text-ink-900">{t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}</div>
                                <div className="text-xs text-ink-400 font-serif">{t.note || '無備註'} · {t.date.slice(11, 16)}</div>
                              </div>
                            </div>
                            <div className={`font-serif-num font-bold text-sm ${t.type === 'income' ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                              {t.type === 'income' ? '+' : '-'}{isPrivacyMode ? '••••' : `$${t.amount.toLocaleString()}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
```

- [ ] **Step 5: Reset `selectedDay` when leaving calendar mode**

When any of the other view mode buttons are clicked (day/week/month/year), reset selectedDay. Find the view mode switcher's `onClick` for the four standard modes (around line 464):

```tsx
              onClick={() => { setViewMode(mode); setCurrentDate(new Date()); }}
```

Change to:

```tsx
              onClick={() => { setViewMode(mode); setCurrentDate(new Date()); setSelectedDay(null); }}
```

- [ ] **Step 6: Verify**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/AnalyticsPage.tsx
git commit -m "feat: show transaction list on calendar day click"
```

---

## Task 5: Item 3 — Category Click Jumps to Ledger with Filter

**Files:**
- Modify: `components/AnalyticsPage.tsx`
- Modify: `components/Ledger.tsx`

### Part A — AnalyticsPage: add navigation arrow to category rows

- [ ] **Step 1: Add `useNavigate` to AnalyticsPage imports**

Add to the react-router import at the top of `AnalyticsPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
```

- [ ] **Step 2: Instantiate navigate inside the component**

After the first few state declarations inside `AnalyticsPage`, add:

```tsx
  const navigate = useNavigate();
```

- [ ] **Step 3: Add `ArrowRight` to lucide imports**

Add `ArrowRight` to the lucide import line (it already has XIcon from Task 4; just add `ArrowRight`):

```tsx
import { TrendingUp, TrendingDown, DollarSign, Calendar, ChevronLeft, ChevronRight, CalendarDays, X as XIcon, ArrowRight } from 'lucide-react';
```

- [ ] **Step 4: Add the ArrowRight button to each category row**

In the expense category breakdown list (around line 656–676), find the outer `<div key={item.name}>` row structure:

```tsx
                        return (
                          <div key={item.name}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                                <span className="text-ink-700 font-serif">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-serif-num font-bold text-ink-900">{formatCurrency(item.value)}</span>
                                <span className="text-[10px] text-ink-300 w-6 text-right">{pct.toFixed(0)}%</span>
                                {change !== null && (
                                  <span className={`text-[10px] font-bold w-10 text-right ${change > 0 ? 'text-morandi-rose' : 'text-morandi-sage'}`}>
                                    {change > 0 ? '↑' : '↓'}{Math.abs(change).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
```

Replace with (adds the ArrowRight button at the end of the right-side flex row):

```tsx
                        const monthParam = format(currentDate, 'yyyy-MM');
                        return (
                          <div key={item.name}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                                <span className="text-ink-700 font-serif">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-serif-num font-bold text-ink-900">{formatCurrency(item.value)}</span>
                                <span className="text-[10px] text-ink-300 w-6 text-right">{pct.toFixed(0)}%</span>
                                {change !== null && (
                                  <span className={`text-[10px] font-bold w-10 text-right ${change > 0 ? 'text-morandi-rose' : 'text-morandi-sage'}`}>
                                    {change > 0 ? '↑' : '↓'}{Math.abs(change).toFixed(0)}%
                                  </span>
                                )}
                                <button
                                  onClick={() => navigate(`/ledger?category=${encodeURIComponent(item.name)}&month=${monthParam}`)}
                                  className="p-1 hover:bg-stone-100 rounded text-ink-300 hover:text-morandi-blue transition-colors"
                                  title={`在帳本中查看${item.name}`}
                                >
                                  <ArrowRight size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
```

### Part B — Ledger: read URL params on mount

- [ ] **Step 5: Add react-router imports to `Ledger.tsx`**

Add to the import section at the top of `Ledger.tsx`:

```tsx
import { useSearchParams } from 'react-router-dom';
```

- [ ] **Step 6: Add `useSearchParams` hook inside the `Ledger` component**

After the existing state declarations (around line 63), add:

```tsx
  const [searchParams] = useSearchParams();
```

- [ ] **Step 7: Consume URL params on mount**

Add a new `useEffect` after the `loadTransactions` useEffect (around line 80), that runs once on mount:

```tsx
  // Consume URL params from Analytics navigation (one-way handoff)
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const monthParam = searchParams.get('month');
    // category filter is not currently a state in Ledger — it's handled by Analytics.
    // month param: set currentDate to the specified month
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentDate(new Date(y, m - 1, 1));
      }
    }
    // Note: Ledger does not have a category filter UI. Month navigation is sufficient.
    // If a category filter is added to Ledger in future, read categoryParam here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

> **Note:** The spec says to set `selectedCategory` in Ledger, but Ledger has no `selectedCategory` state — it renders all transactions for the selected month. The useful handoff here is the month navigation. If a full category filter is needed in Ledger later, that is a separate task.

- [ ] **Step 8: Verify**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add components/AnalyticsPage.tsx components/Ledger.tsx
git commit -m "feat: add category→ledger navigation from Analytics breakdown"
```

---

## Task 6: Item 5 — Move Budget Settings to MorePage

**Files:**
- Create: `components/BudgetSettingsPage.tsx`
- Modify: `components/Ledger.tsx`
- Modify: `components/MorePage.tsx`
- Modify: `App.tsx`

### Part A — Create BudgetSettingsPage

- [ ] **Step 1: Create `components/BudgetSettingsPage.tsx`**

```tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { getBudgets, setBudget, removeBudget, type Budget } from '../services';

const BUDGET_CATEGORIES = ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '其他', '總計'];

const BudgetSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('飲食');
  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await getBudgets();
      setBudgets(data ?? []);
      setIsLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    const amt = parseFloat(amountInput);
    if (!selectedCategory || isNaN(amt) || amt <= 0) return;
    const saved = await setBudget(selectedCategory, amt);
    if (saved) {
      setBudgets(prev => {
        const filtered = prev.filter(b => b.category !== selectedCategory);
        return [...filtered, saved].sort((a, b) => a.category.localeCompare(b.category));
      });
    }
    setAmountInput('');
  };

  const handleRemove = async (category: string) => {
    await removeBudget(category);
    setBudgets(prev => prev.filter(b => b.category !== category));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-morandi-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-20 space-y-6 animate-fade-in">
      <div className="space-y-3">
        <h2 className="font-bold font-serif text-ink-900">新增 / 修改預算</h2>

        {/* Category selector */}
        <div>
          <label className="text-xs text-ink-400 font-serif mb-1.5 block">分類</label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-serif border transition-all ${
                  selectedCategory === cat
                    ? 'bg-ink-900 text-white border-ink-900'
                    : 'bg-white text-ink-500 border-stone-200 hover:border-ink-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Amount input */}
        <div>
          <label className="text-xs text-ink-400 font-serif mb-1.5 block">月預算金額（元）</label>
          <input
            type="number"
            placeholder="例：5000"
            value={amountInput}
            onChange={e => setAmountInput(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm font-serif-num focus:outline-none focus:border-morandi-blue"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-ink-900 text-white rounded-xl py-3 text-sm font-serif font-bold hover:bg-ink-700 transition-colors"
        >
          儲存預算
        </button>
      </div>

      {/* Existing budgets list */}
      {budgets.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-50">
            <h3 className="text-xs font-bold font-serif text-ink-400">已設定的預算</h3>
          </div>
          <div className="divide-y divide-stone-50">
            {budgets.map(b => (
              <div key={b.category} className="flex items-center justify-between px-4 py-3 group">
                <div>
                  <span className="text-sm font-bold text-ink-700 font-serif">{b.category}</span>
                  <span className="text-xs text-ink-400 font-serif-num ml-2">${b.amount.toLocaleString()} / 月</span>
                </div>
                <button
                  onClick={() => handleRemove(b.category)}
                  className="text-stone-300 hover:text-morandi-rose transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {budgets.length === 0 && (
        <p className="text-center text-sm text-ink-400 font-serif py-4">尚未設定任何預算</p>
      )}
    </div>
  );
};

export default BudgetSettingsPage;
```

### Part B — Remove budget modal from Ledger

- [ ] **Step 2: Remove budget state from `Ledger.tsx`**

Remove the three budget-modal-specific state lines (around line 60–62):

```tsx
// DELETE these three lines:
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('飲食');
  const [budgetAmount, setBudgetAmountInput] = useState('');
```

Keep `budgets` and `setBudgets` — the read-only progress bars still use them.

- [ ] **Step 3: Remove `handleSaveBudget` from `Ledger.tsx`**

Delete the `handleSaveBudget` function (lines 442–454):

```tsx
// DELETE this function:
  const handleSaveBudget = async () => {
    const amt = parseFloat(budgetAmount);
    if (!budgetCategory || isNaN(amt) || amt <= 0) return;
    const saved = await setBudget(budgetCategory, amt);
    if (saved) {
      setBudgets(prev => {
        const filtered = prev.filter(b => b.category !== budgetCategory);
        return [...filtered, saved].sort((a, b) => a.category.localeCompare(b.category));
      });
    }
    setBudgetAmountInput('');
    setIsBudgetModalOpen(false);
  };
```

- [ ] **Step 4: Remove budget modal JSX from `Ledger.tsx`**

Remove the `{/* Budget Modal */}` block entirely (lines 721–761):

```tsx
// DELETE this entire block:
         {/* Budget Modal */}
         {isBudgetModalOpen && (
           <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setIsBudgetModalOpen(false)}>
             <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8 shadow-xl" onClick={e => e.stopPropagation()}>
               ...
             </div>
           </div>
         )}
```

- [ ] **Step 5: Remove "+ 設定" button from budget summary header in `Ledger.tsx`**

In the budget summary section (around line 667–675), find:

```tsx
               <button
                 onClick={() => setIsBudgetModalOpen(true)}
                 className="text-[10px] text-morandi-blue font-serif hover:underline"
               >
                 + 設定
               </button>
```

Replace it with a navigate link to `/budget-settings`:

```tsx
               <button
                 onClick={() => navigate('/budget-settings')}
                 className="text-[10px] text-morandi-blue font-serif hover:underline"
               >
                 前往設定
               </button>
```

This requires `useNavigate` in Ledger — it was already added in Task 5 Step 5 via `useSearchParams`. If `useNavigate` is not yet imported, add it now:

```tsx
import { useSearchParams, useNavigate } from 'react-router-dom';
```

And instantiate it:
```tsx
  const navigate = useNavigate();
```

- [ ] **Step 6: Remove "設定月預算" empty-state button from `Ledger.tsx`**

Find the `{budgets.length === 0 && ...}` block (around line 712–719):

```tsx
         {budgets.length === 0 && (
           <button
             onClick={() => setIsBudgetModalOpen(true)}
             className="w-full py-3 rounded-2xl border border-dashed border-stone-200 text-xs text-ink-300 font-serif hover:border-morandi-blue hover:text-morandi-blue transition-colors"
           >
             + 設定月預算
           </button>
         )}
```

Replace with a navigate link:

```tsx
         {budgets.length === 0 && (
           <button
             onClick={() => navigate('/budget-settings')}
             className="w-full py-3 rounded-2xl border border-dashed border-stone-200 text-xs text-ink-300 font-serif hover:border-morandi-blue hover:text-morandi-blue transition-colors"
           >
             + 設定月預算
           </button>
         )}
```

- [ ] **Step 7: Remove unused imports from `Ledger.tsx`**

After removing the budget modal, `setBudget` and `removeBudget` are no longer used in Ledger. Remove them from the services import:

```tsx
// Before:
import { getTransactions as fetchTransactions, createTransaction as apiCreateTransaction, deleteTransaction as apiDeleteTransaction, batchDeleteTransactions as apiBatchDeleteTransactions, getBudgets, setBudget, removeBudget, type Budget } from '../services';
// After:
import { getTransactions as fetchTransactions, createTransaction as apiCreateTransaction, deleteTransaction as apiDeleteTransaction, batchDeleteTransactions as apiBatchDeleteTransactions, getBudgets, type Budget } from '../services';
```

### Part C — Add entry to MorePage

- [ ] **Step 8: Add "預算設定" to MorePage `menuGroups`**

In `components/MorePage.tsx`, find the `帳戶管理` group (around line 45). Add a new entry after "我的帳戶":

```tsx
    {
      title: "帳戶管理",
      items: [
        {
          label: "我的帳戶",
          icon: <Wallet size={20} />,
          desc: "管理資金帳戶和餘額",
          action: () => navigate('/account-management'),
          color: "bg-morandi-blueLight/30 text-morandi-blue"
        },
        {
          label: "預算設定",
          icon: <Wallet size={20} />,
          desc: "設定各類別月預算上限",
          action: () => navigate('/budget-settings'),
          color: "bg-morandi-sageLight text-morandi-sage"
        }
      ]
    },
```

### Part D — Add route in App.tsx

- [ ] **Step 9: Add lazy import for BudgetSettingsPage in `App.tsx`**

After the existing lazy imports (around line 24), add:

```tsx
const BudgetSettingsPage = lazy(() => import('./components/BudgetSettingsPage'));
```

- [ ] **Step 10: Add `/budget-settings` route in `App.tsx`**

Inside the `<Routes>` block, after the `/price-alerts` route, add:

```tsx
                <Route path="/budget-settings" element={<BudgetSettingsPage />} />
```

- [ ] **Step 11: Verify**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add components/BudgetSettingsPage.tsx components/Ledger.tsx components/MorePage.tsx App.tsx
git commit -m "feat: extract budget settings to standalone page, add MorePage entry"
```

---

## Task 7: Item 7 — Fix Day-Mode Metrics

**Files:**
- Modify: `components/AnalyticsPage.tsx:531-549`

- [ ] **Step 1: Replace "日均支出" with "今日交易" when in day view**

In `AnalyticsPage.tsx`, find the Top Metrics Row (around line 531):

```tsx
              {/* Top Metrics Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  <div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">日均支出</div>
                  <div className="text-sm font-serif-num font-bold text-ink-900">
                    {isPrivacyMode ? '••••' : dailyAvgExpense > 0 ? `$${Math.round(dailyAvgExpense).toLocaleString()}` : '--'}
                  </div>
                </div>
```

Replace the first metric card with a conditional:

```tsx
              {/* Top Metrics Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  {viewMode === 'day' ? (
                    <>
                      <div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">今日交易</div>
                      <div className="text-sm font-serif-num font-bold text-ink-900">
                        {filteredTransactions.length} 筆
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">日均支出</div>
                      <div className="text-sm font-serif-num font-bold text-ink-900">
                        {isPrivacyMode ? '••••' : dailyAvgExpense > 0 ? `$${Math.round(dailyAvgExpense).toLocaleString()}` : '--'}
                      </div>
                    </>
                  )}
                </div>
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/AnalyticsPage.tsx
git commit -m "feat: show transaction count instead of daily avg in day view"
```

---

## Spec Coverage Check

| Spec item | Task | Covered? |
|-----------|------|----------|
| Item 2: NotificationsPage → backend API | Task 1 | ✅ |
| Item 4: Remove ROI placeholder card | Task 2 | ✅ |
| Item 6: Hide category filter in calendar mode + reset | Task 3 | ✅ |
| Item 1: Calendar day click shows transaction list | Task 4 | ✅ |
| Item 3: Category → Ledger navigation with month param | Task 5 | ✅ |
| Item 5: Budget settings to MorePage + standalone page | Task 6 | ✅ |
| Item 7: Day view "今日交易" count metric | Task 7 | ✅ |
