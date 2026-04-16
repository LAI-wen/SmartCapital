# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the Dashboard as a personal finance overview showing real cash balances, real monthly spending, budget health, recent transactions, and real-time stock prices.

**Architecture:** Keep the existing Dashboard props contract intact. Add three new data-fetch hooks (transactions, budgets, live prices) alongside the existing account/asset props. Replace the five existing UI sections with six new ones. New `services/price.service.ts` handles TWSE / CoinGecko / Finnhub with a 60-second in-memory cache.

**Tech Stack:** React 19, TypeScript, Vite, date-fns, lucide-react, existing service layer

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `services/price.service.ts` | **Create** | TWSE / CoinGecko / Finnhub fetch + 60s cache |
| `services/index.ts` | **Modify** | Export `fetchLivePrices` |
| `components/Dashboard.tsx` | **Major rewrite** | New 6-section layout using real data |
| `.env` | **Modify** | Add `VITE_FINNHUB_API_KEY` |
| `App.tsx` | **Minor** | Remove `handleOpenImport` prop if threaded |

---

## Task 1: Create `services/price.service.ts`

**Files:**
- Create: `services/price.service.ts`
- Modify: `services/index.ts`

- [ ] **Step 1: Create the file**

```typescript
// services/price.service.ts
import type { Asset } from '../types';

const CACHE_TTL = 60_000;
const priceCache = new Map<string, { price: number; ts: number }>();

const COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  ADA: 'cardano', XRP: 'ripple', DOGE: 'dogecoin', DOT: 'polkadot',
  AVAX: 'avalanche-2', MATIC: 'matic-network',
};

function getCached(symbol: string): number | null {
  const entry = priceCache.get(symbol);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.price;
  return null;
}

function setCache(symbol: string, price: number) {
  priceCache.set(symbol, { price, ts: Date.now() });
}

async function fetchTWSE(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!symbols.length) return result;
  const query = symbols.map(s => `tse_${s}.tw`).join('|');
  const res = await fetch(
    `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${query}`
  );
  const data = await res.json();
  for (const item of data.msgArray ?? []) {
    const price = parseFloat(item.z ?? item.y ?? '');
    if (!isNaN(price)) {
      result.set(item.c, price);
      setCache(item.c, price);
    }
  }
  return result;
}

async function fetchCoinGecko(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!symbols.length) return result;
  const ids = symbols
    .map(s => COINGECKO_ID[s.toUpperCase()])
    .filter(Boolean);
  if (!ids.length) return result;
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
  );
  const data = await res.json();
  for (const symbol of symbols) {
    const id = COINGECKO_ID[symbol.toUpperCase()];
    if (id && data[id]?.usd != null) {
      result.set(symbol.toUpperCase(), data[id].usd);
      setCache(symbol.toUpperCase(), data[id].usd);
    }
  }
  return result;
}

async function fetchFinnhub(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!symbols.length) return result;
  const key = import.meta.env.VITE_FINNHUB_API_KEY;
  if (!key) return result;
  const settled = await Promise.allSettled(
    symbols.map(async s => {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${s}&token=${key}`
      );
      const data = await res.json();
      return { symbol: s, price: data.c as number };
    })
  );
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value.price > 0) {
      result.set(r.value.symbol, r.value.price);
      setCache(r.value.symbol, r.value.price);
    }
  }
  return result;
}

export interface FetchPricesResult {
  prices: Map<string, number>;
  anyFailed: boolean;
}

export async function fetchLivePrices(
  assets: Asset[]
): Promise<FetchPricesResult> {
  const prices = new Map<string, number>();
  const twSymbols: string[] = [];
  const cryptoSymbols: string[] = [];
  const usSymbols: string[] = [];
  const uncachedAssets: Asset[] = [];

  for (const asset of assets) {
    const cached = getCached(asset.symbol);
    if (cached !== null) {
      prices.set(asset.symbol, cached);
    } else {
      uncachedAssets.push(asset);
      if (asset.currency === 'TWD') twSymbols.push(asset.symbol);
      else if (asset.type === 'Crypto') cryptoSymbols.push(asset.symbol);
      else usSymbols.push(asset.symbol);
    }
  }

  let anyFailed = false;
  const [twR, cgR, fnR] = await Promise.allSettled([
    fetchTWSE(twSymbols),
    fetchCoinGecko(cryptoSymbols),
    fetchFinnhub(usSymbols),
  ]);

  for (const r of [twR, cgR, fnR]) {
    if (r.status === 'fulfilled') {
      r.value.forEach((price, symbol) => prices.set(symbol, price));
    } else {
      anyFailed = true;
    }
  }

  // Fall back to stored currentPrice for any symbol we couldn't fetch
  for (const asset of uncachedAssets) {
    if (!prices.has(asset.symbol)) {
      prices.set(asset.symbol, asset.currentPrice);
      anyFailed = true;
    }
  }

  return { prices, anyFailed };
}
```

- [ ] **Step 2: Export from `services/index.ts`**

Add after the Budget Service block (around line 108):

```typescript
// Price Service
export {
  type FetchPricesResult,
  fetchLivePrices,
} from './price.service';
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors related to `price.service.ts`.

- [ ] **Step 4: Commit**

```bash
git add services/price.service.ts services/index.ts
git commit -m "feat: add price.service with TWSE/CoinGecko/Finnhub and 60s cache"
```

---

## Task 2: Add `.env` key

**Files:**
- Modify: `.env`

- [ ] **Step 1: Read the existing `.env`**

Check what keys are already present. Look for `VITE_FINNHUB_API_KEY`.

- [ ] **Step 2: Add the key if not present**

Append to `.env`:

```
VITE_FINNHUB_API_KEY=demo
```

> Note: `demo` is Finnhub's public sandbox key with reduced limits. Replace with a real key for production.

- [ ] **Step 3: Verify build still works**

```bash
npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add .env
git commit -m "chore: add VITE_FINNHUB_API_KEY placeholder for Finnhub API"
```

---

## Task 3: Add data fetching + new useMemos to Dashboard

**Files:**
- Modify: `components/Dashboard.tsx`

This task is additive only — it adds state, effects, and useMemos without changing any JSX.

- [ ] **Step 1: Add new imports at the top of `Dashboard.tsx`**

After the existing import block (after line 8 `useExchangeRates` import), add:

```typescript
import { format, parseISO, isSameDay, subDays } from 'date-fns';
import { getTransactions, getBudgets } from '../services';
import { fetchLivePrices } from '../services/price.service';
import type { Transaction } from '../services/transaction.service';
import type { Budget } from '../services/budget.service';
```

- [ ] **Step 2: Add new state variables after line 39 (`transactionAsset` state)**

```typescript
// Data state for new dashboard sections
const [transactions, setTransactions] = useState<Transaction[]>([]);
const [budgets, setBudgets] = useState<Budget[]>([]);
const [liveprices, setLiveprices] = useState<Map<string, number>>(new Map());
const [pricesLoading, setPricesLoading] = useState(true);
const [pricesFailed, setPricesFailed] = useState(false);
const [isHoldingsExpanded, setIsHoldingsExpanded] = useState(false);
```

- [ ] **Step 3: Add fetch effect for transactions and budgets after the existing `useEffect` (line 41-49)**

```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const [txs, bdgs] = await Promise.all([
        getTransactions(30),
        getBudgets(),
      ]);
      if (!cancelled) {
        setTransactions(txs);
        setBudgets(bdgs);
      }
    } catch {
      // Sections that depend on this data will show empty/zero states
    }
  })();
  return () => { cancelled = true; };
}, []);
```

- [ ] **Step 4: Add price fetch effect after Step 3**

```typescript
useEffect(() => {
  if (!assets.length) {
    setPricesLoading(false);
    return;
  }
  let cancelled = false;
  const loadPrices = async () => {
    setPricesLoading(true);
    try {
      const result = await fetchLivePrices(assets);
      if (!cancelled) {
        setLiveprices(result.prices);
        setPricesFailed(result.anyFailed);
      }
    } catch {
      if (!cancelled) setPricesFailed(true);
    } finally {
      if (!cancelled) setPricesLoading(false);
    }
  };
  loadPrices();
  const interval = setInterval(loadPrices, 60_000);
  return () => { cancelled = true; clearInterval(interval); };
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 5: Add `monthlyStats` useMemo after the existing `summary` useMemo (after line 115)**

```typescript
const monthlyStats = useMemo(() => {
  const prefix = format(new Date(), 'yyyy-MM');
  const monthTxs = transactions.filter(t => t.date.startsWith(prefix));
  const income = monthTxs
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const catMap = new Map<string, number>();
  for (const t of monthTxs.filter(t => t.type === 'expense')) {
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
  }
  const topCategories = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: expense > 0 ? (amount / expense) * 100 : 0,
    }));

  return { income, expense, net, topCategories };
}, [transactions]);
```

- [ ] **Step 6: Add `budgetAlerts` useMemo after `monthlyStats`**

```typescript
const budgetAlerts = useMemo(() => {
  const prefix = format(new Date(), 'yyyy-MM');
  const monthExpenses = transactions.filter(
    t => t.type === 'expense' && t.date.startsWith(prefix)
  );
  return budgets
    .map(b => {
      const spent = monthExpenses
        .filter(t => t.category === b.category)
        .reduce((s, t) => s + t.amount, 0);
      return { ...b, spent, pct: b.amount > 0 ? spent / b.amount : 0 };
    })
    .filter(b => b.pct >= 0.80)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
}, [budgets, transactions]);
```

- [ ] **Step 7: Add `recentTransactions` useMemo after `budgetAlerts`**

```typescript
const recentTransactions = useMemo(
  () => transactions.slice(0, 3),
  [transactions]
);
```

- [ ] **Step 8: Add `investSummary` useMemo after `recentTransactions`**

```typescript
const investSummary = useMemo(() => {
  let totalValue = 0;
  let totalCost = 0;
  for (const asset of scopeFilteredAssets) {
    const livePrice = liveprices.get(asset.symbol) ?? asset.currentPrice;
    const value = asset.quantity * livePrice;
    const cost = asset.quantity * asset.avgPrice;
    const rate = asset.currency === 'USD' ? exchangeRate : 1;
    totalValue += value * rate;
    totalCost += cost * rate;
  }
  const pnl = totalValue - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  return { totalValue, pnl, pnlPct, count: scopeFilteredAssets.length };
}, [scopeFilteredAssets, liveprices, exchangeRate]);
```

- [ ] **Step 9: Add `getCategoryIcon` helper and `formatRelativeDate` helper after `getProfitLoss` (after line 188)**

```typescript
const getCategoryIcon = (category: string) => {
  if (category.includes('飲食')) return <Coffee size={16} />;
  if (category.includes('購物')) return <ShoppingBag size={16} />;
  if (category.includes('居住')) return <Home size={16} />;
  if (category.includes('交通')) return <Bus size={16} />;
  if (category.includes('醫')) return <HeartPulse size={16} />;
  if (category.includes('薪')) return <Briefcase size={16} />;
  if (category.includes('資')) return <TrendingUp size={16} />;
  if (category.includes('娛樂')) return <Gift size={16} />;
  return <Tag size={16} />;
};

const formatRelativeDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  const today = new Date();
  if (isSameDay(date, today)) return '今天';
  if (isSameDay(date, subDays(today, 1))) return '昨天';
  return format(date, 'M/d');
};
```

- [ ] **Step 10: Add new lucide imports for the helpers**

In the existing lucide import line (line 5), add:
`Coffee, ShoppingBag, Home, Bus, HeartPulse, Gift, Tag`

The full lucide import should become:

```typescript
import { Wallet, TrendingUp, TrendingDown, Search, Activity, ReceiptText, Briefcase, ChevronRight, Landmark, Info, Package, Coffee, ShoppingBag, Home, Bus, HeartPulse, Gift, Tag } from 'lucide-react';
```

- [ ] **Step 11: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: add data fetching, useMemos, and helpers to Dashboard (no UI changes)"
```

---

## Task 4: Rewrite Hero Card (Section 1)

**Files:**
- Modify: `components/Dashboard.tsx`

Replace the existing hero card block (the `<div>` starting around line 303 that shows `summary.totalValue` and fake 24h change) with the new cash-focused hero card.

- [ ] **Step 1: Find the hero card opening tag**

The hero card is the first `<div>` inside the outermost container. It starts with:
```
{/* 1. Hero Card — Total Net Worth */}
```
and ends before `{/* 2. Quick Actions */}` at line 363.

- [ ] **Step 2: Replace the entire hero card block**

Replace from `{/* 1. Hero Card — Total Net Worth */}` through the closing `</div>` before `{/* 2. Quick Actions */}` with:

```tsx
{/* Section 1: Hero Card */}
<div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
  <div className="flex items-start justify-between mb-2">
    <div>
      <p className="text-xs text-ink-400 font-serif mb-1">現金 / 存款</p>
      <div className="text-3xl font-bold font-serif-num text-ink-900">
        {isPrivacyMode ? '•••••' : formatCurrency(summary.cashValueTWD)}
      </div>
    </div>
    <div className="p-2 bg-stone-50 rounded-xl">
      <Wallet size={20} className="text-ink-400" />
    </div>
  </div>
  <div className="flex items-center gap-2 mt-2">
    {monthlyStats.net >= 0
      ? <TrendingUp size={14} className="text-morandi-sage" />
      : <TrendingDown size={14} className="text-morandi-rose" />}
    <span className={`text-sm font-bold font-serif-num ${
      monthlyStats.net >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'
    }`}>
      {isPrivacyMode ? '••' : formatCurrency(Math.abs(monthlyStats.net))}
    </span>
    <span className="text-xs text-ink-400 font-serif">本月結餘</span>
  </div>
  <div className="flex gap-4 mt-2">
    <span className="text-xs text-ink-400 font-serif">
      收入{' '}
      <span className="text-ink-700 font-serif-num font-bold">
        {isPrivacyMode ? '••' : formatCurrency(monthlyStats.income)}
      </span>
    </span>
    <span className="text-xs text-ink-400 font-serif">
      支出{' '}
      <span className="text-ink-700 font-serif-num font-bold">
        {isPrivacyMode ? '••' : formatCurrency(monthlyStats.expense)}
      </span>
    </span>
  </div>
</div>
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: rewrite dashboard hero card to show cash balance and monthly net"
```

---

## Task 5: Replace Quick Actions with 本月收支摘要

**Files:**
- Modify: `components/Dashboard.tsx`

Replace the Quick Actions grid (lines 363–401, `{/* 2. Quick Actions */}`) with the monthly summary card.

- [ ] **Step 1: Find the Quick Actions block**

The block starts with:
```
{/* 2. Quick Actions */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
```
and ends with the closing `</div>` before `{/* 3. Mid Section */}`.

- [ ] **Step 2: Replace the block**

```tsx
{/* Section 2: 本月收支摘要 */}
<button
  onClick={() => navigate('/analytics')}
  className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 w-full text-left active:scale-[0.99] transition-all"
>
  <h3 className="text-sm font-bold font-serif text-ink-900 mb-3 flex items-center justify-between">
    本月收支摘要
    <ChevronRight size={16} className="text-ink-400" />
  </h3>
  <div className="grid grid-cols-3 gap-2 mb-4">
    {[
      { label: '收入', value: monthlyStats.income, color: 'text-ink-900' },
      { label: '支出', value: monthlyStats.expense, color: 'text-morandi-rose' },
      {
        label: '結餘',
        value: monthlyStats.net,
        color: monthlyStats.net >= 0 ? 'text-morandi-sage' : 'text-morandi-rose',
      },
    ].map(chip => (
      <div key={chip.label} className="bg-stone-50 rounded-xl p-3 text-center">
        <div className={`text-sm font-bold font-serif-num ${chip.color}`}>
          {isPrivacyMode ? '••' : formatCurrency(chip.value)}
        </div>
        <div className="text-[10px] text-ink-400 font-serif mt-0.5">{chip.label}</div>
      </div>
    ))}
  </div>
  {monthlyStats.topCategories.length > 0 && (
    <div className="space-y-1.5">
      {monthlyStats.topCategories.map(cat => (
        <div key={cat.category} className="flex items-center justify-between text-xs">
          <span className="text-ink-700 font-serif">{cat.category}</span>
          <div className="flex items-center gap-2">
            <span className="text-ink-400 font-serif-num">{cat.pct.toFixed(0)}%</span>
            <span className="font-bold font-serif-num text-morandi-rose">
              {isPrivacyMode ? '••' : formatCurrency(cat.amount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
</button>
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: replace quick actions with monthly spending summary card"
```

---

## Task 6: Add 預算警示 Section

**Files:**
- Modify: `components/Dashboard.tsx`

Insert the budget alerts section between Section 2 and the old Section 3 (Mid Section).

- [ ] **Step 1: Find the insertion point**

After the closing `</button>` of Section 2 (本月收支摘要), before the `{/* 3. Mid Section */}` comment.

- [ ] **Step 2: Insert the section**

```tsx
{/* Section 3: 預算警示 */}
{budgets.length > 0 && (
  <button
    onClick={() => navigate('/budget-settings')}
    className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 w-full text-left active:scale-[0.99] transition-all"
  >
    <h3 className="text-sm font-bold font-serif text-ink-900 mb-3 flex items-center justify-between">
      預算警示
      <ChevronRight size={16} className="text-ink-400" />
    </h3>
    {budgetAlerts.length === 0 ? (
      <p className="text-xs text-morandi-sage font-serif">本月預算正常 ✓</p>
    ) : (
      <div className="space-y-3">
        {budgetAlerts.map(b => (
          <div key={b.id}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-serif text-ink-700">{b.category}</span>
              <span className="font-serif-num text-ink-500">
                {isPrivacyMode ? '••' : formatCurrency(b.spent)}{' '}
                /{' '}
                {isPrivacyMode ? '••' : formatCurrency(b.amount)}
              </span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  b.pct >= 1 ? 'bg-morandi-rose' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(b.pct * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )}
  </button>
)}
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: add budget alerts section to dashboard"
```

---

## Task 7: Add 最近交易 Section

**Files:**
- Modify: `components/Dashboard.tsx`

Insert the recent transactions section after the budget alerts section, still before the old Mid Section.

- [ ] **Step 1: Find the insertion point**

After the closing `)}` of Section 3 (預算警示), before `{/* 3. Mid Section */}`.

- [ ] **Step 2: Insert the section**

```tsx
{/* Section 4: 最近交易 */}
<div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-bold font-serif text-ink-900">最近交易</h3>
    <button
      onClick={() => navigate('/ledger')}
      className="text-xs text-morandi-blue font-serif hover:underline"
    >
      更多交易 →
    </button>
  </div>
  {recentTransactions.length === 0 ? (
    <p className="text-xs text-ink-400 font-serif text-center py-4">尚無交易記錄</p>
  ) : (
    <div className="space-y-3">
      {recentTransactions.map(t => (
        <div key={t.id} className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white ${
              t.type === 'income' ? 'bg-ink-800' : 'bg-morandi-rose'
            }`}
          >
            {getCategoryIcon(t.category)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-ink-900 font-serif">
              {t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}
            </div>
            <div className="text-[10px] text-ink-400 truncate">
              {t.note || '無備註'}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className={`text-sm font-bold font-serif-num ${
                t.type === 'income' ? 'text-ink-900' : 'text-morandi-rose'
              }`}
            >
              {t.type === 'income' ? '+' : ''}
              {isPrivacyMode ? '••' : formatCurrency(t.amount)}
            </div>
            <div className="text-[10px] text-ink-400 font-serif">
              {formatRelativeDate(t.date)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: add recent transactions section to dashboard"
```

---

## Task 8: Add 投資摘要 Card + Remove Old Sections

**Files:**
- Modify: `components/Dashboard.tsx`
- Possibly modify: `App.tsx`

This task replaces the three old sections (Mid Section: allocation pie + top movers; Holdings Section) with a single investment summary card. StockDetailModal and BuyStockModal are kept because the expandable holdings list uses them.

- [ ] **Step 1: Find and remove the Mid Section (allocation pie + top movers)**

The block starts with:
```
{/* 3. Mid Section: Allocation & Top Movers */}
```
and ends with the closing `</div>` before `{/* 4. Holdings Section */}`.

Delete this entire block.

- [ ] **Step 2: Find and remove the Holdings Section**

The block starts with:
```
{/* 4. Holdings Section */}
```
and ends with its closing `</div>` before `{/* Detail Modal */}`.

Delete this entire block.

- [ ] **Step 3: Insert the 投資摘要 card in place**

Insert the following in the gap left by removing the two old sections (before `{/* Detail Modal */}`):

```tsx
{/* Section 5: 投資摘要 */}
{scopeFilteredAssets.length > 0 && (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold font-serif text-ink-900 flex items-center gap-2">
        <TrendingUp size={16} className="text-ink-400" />
        投資摘要
      </h3>
      <button
        onClick={() => setIsHoldingsExpanded(e => !e)}
        className="text-xs text-morandi-blue font-serif hover:underline flex items-center gap-1"
      >
        持有 {investSummary.count} 檔
        <ChevronRight
          size={12}
          className={`transition-transform ${isHoldingsExpanded ? 'rotate-90' : ''}`}
        />
      </button>
    </div>

    {pricesLoading ? (
      <div className="space-y-2">
        <div className="h-8 bg-stone-50 rounded-xl animate-pulse" />
        <div className="h-4 bg-stone-50 rounded-xl animate-pulse w-1/2" />
      </div>
    ) : (
      <>
        <div className="text-2xl font-bold font-serif-num text-ink-900 mb-1">
          {isPrivacyMode ? '•••••' : formatCurrency(investSummary.totalValue)}
        </div>
        <div
          className={`text-sm font-serif-num flex items-center gap-1 ${
            investSummary.pnl >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'
          }`}
        >
          {investSummary.pnl >= 0
            ? <TrendingUp size={14} />
            : <TrendingDown size={14} />}
          {isPrivacyMode ? '••' : formatCurrency(Math.abs(investSummary.pnl))}
          <span className="text-xs">
            ({investSummary.pnl >= 0 ? '+' : ''}
            {investSummary.pnlPct.toFixed(2)}%)
          </span>
          <span className="text-xs text-ink-400 font-serif ml-1">未實現損益</span>
        </div>
        {pricesFailed && (
          <p className="text-[10px] text-amber-600 mt-1 font-serif">
            ⚠ 價格可能未即時
          </p>
        )}
        {(investmentScope.us || investmentScope.crypto) && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-ink-400 font-serif">
            <Info size={10} /> 以 1 USD ≈ {exchangeRate.toFixed(0)} TWD 計算
          </div>
        )}
      </>
    )}

    {/* Expandable holdings list */}
    {isHoldingsExpanded && (
      <div className="mt-4 border-t border-stone-100 pt-4 space-y-2">
        {scopeFilteredAssets.map(asset => {
          const livePrice = liveprices.get(asset.symbol) ?? asset.currentPrice;
          const rate = asset.currency === 'USD' ? exchangeRate : 1;
          const value = asset.quantity * livePrice * rate;
          const cost = asset.quantity * asset.avgPrice * rate;
          const pnl = value - cost;
          return (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="flex items-center justify-between cursor-pointer hover:bg-stone-50 rounded-xl p-2 -mx-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center text-xs font-bold text-morandi-blue font-serif shrink-0">
                  {asset.symbol.substring(0, 2)}
                </div>
                <div>
                  <div className="text-xs font-bold text-ink-900 font-serif">
                    {asset.symbol}
                  </div>
                  <div className="text-[10px] text-ink-400 font-serif-num">
                    {isPrivacyMode ? '••' : formatCurrency(livePrice, asset.currency)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold font-serif-num text-ink-900">
                  {isPrivacyMode ? '••' : formatCurrency(value)}
                </div>
                <div
                  className={`text-[10px] font-serif-num ${
                    pnl >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'
                  }`}
                >
                  {pnl >= 0 ? '+' : ''}
                  {isPrivacyMode ? '••' : formatCurrency(pnl)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

{/* Section 6: 訂閱摘要（預留） */}
{/* Reserved for subscription tracking — to be implemented in a future spec */}
```

- [ ] **Step 4: Remove now-unused state and useMemos**

Remove the following from `Dashboard.tsx` (they were only used by the deleted sections):

- `const [filter, setFilter] = useState<...>('All');`
- `const [searchTerm, setSearchTerm] = useState('');`
- `const [shouldLoadAllocationChart, setShouldLoadAllocationChart] = useState(false);`
- The `useEffect` that sets `shouldLoadAllocationChart` (lines 41–49)
- `const displayAssets = useMemo(...)`
- `const allocationData = useMemo(...)`
- `const topMovers = useMemo(...)`
- `const filterLabels = {...}`
- `const renderAllocationChartFallback = () => (...)`
- `const handleOpenImport = () => {...}` (import action moved off Dashboard)

Also remove the three lazy imports that are no longer used:
```typescript
// REMOVE these three lines:
const DashboardAllocationChart = lazy(() => import('./DashboardAllocationChart'));
```
Keep `StockDetailModal` and `BuyStockModal` — they're still used by the expandable holdings list.

- [ ] **Step 5: Remove unused lucide icons from the import line**

After removing the old sections, these icons are no longer referenced:
`Search, Activity, ReceiptText, Package`

Remove them from the lucide import line.

- [ ] **Step 6: Check App.tsx for `handleOpenImport` prop**

Search for `handleOpenImport` in `App.tsx`:

```bash
grep -n "handleOpenImport\|onOpenImport" App.tsx
```

If found, remove the prop from both the Dashboard component usage in `App.tsx` and from the `DashboardProps` interface in `Dashboard.tsx`.

- [ ] **Step 7: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 8: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: successful build with no errors.

- [ ] **Step 9: Commit**

```bash
git add components/Dashboard.tsx App.tsx
git commit -m "feat: add investment summary card with real-time prices, remove old allocation/holdings sections"
```

---

## Post-Implementation Verification

After all tasks complete, verify the full feature works end-to-end:

1. `npm run typecheck` — no errors
2. `npm run build` — successful build
3. Manual smoke test in browser:
   - Hero card shows cash balance (sum of accounts), not net worth
   - Monthly summary chips show correct totals, tapping navigates to `/analytics`
   - Budget alerts section shows only when budgets exist; hides if none configured
   - Recent transactions section shows ≤3 rows; "更多交易 →" navigates to `/ledger`
   - Investment section shows skeleton while prices load, then real-time values
   - Expandable holdings list opens on "持有 N 檔" tap
   - Privacy mode masks all numbers with `••`
   - Old fake 24h change, allocation pie, Top 3 Movers, and Holdings search bar are gone
