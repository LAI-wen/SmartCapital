# Batch 4: Split Large Frontend Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `Ledger.tsx` (938 lines) and `AnalyticsPage.tsx` (898 lines) into container + focused sub-components, reducing each container to ~300 lines.

**Architecture:** Extract pure rendering pieces into `components/ledger/` and `components/analytics/`. Container components keep all state, data fetching, and handlers. Sub-components receive only the data and callbacks they need via props — no hooks, no data fetching inside them.

**Tech Stack:** React 18, TypeScript, Tailwind CSS

---

## Part A: Ledger.tsx

### File Structure

```
components/
  Ledger.tsx                          ← container (~300 lines, keeps all state/handlers)
  ledger/
    TransactionForm.tsx               ← add/edit modal (lines 808–932 of current Ledger.tsx)
    TransactionList.tsx               ← grouped transaction list (lines 730–797)
    LedgerSummaryCards.tsx            ← 3 stat cards (lines 603–617)
```

---

### Task A1: Extract `LedgerSummaryCards`

**Files:**
- Create: `components/ledger/LedgerSummaryCards.tsx`
- Modify: `components/Ledger.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React from 'react';

interface LedgerSummaryCardsProps {
  income: number;
  expense: number;
  balance: number;
  formatCurrency: (val: number) => string;
}

const LedgerSummaryCards: React.FC<LedgerSummaryCardsProps> = ({ income, expense, balance, formatCurrency }) => (
  <div className="grid grid-cols-3 gap-3">
    <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center">
      <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-1">收入</span>
      <span className="text-ink-900 font-bold font-serif-num text-lg">{formatCurrency(income)}</span>
    </div>
    <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center">
      <span className="text-[10px] font-bold text-morandi-rose uppercase tracking-widest mb-1">支出</span>
      <span className="text-morandi-rose font-bold font-serif-num text-lg">{formatCurrency(expense)}</span>
    </div>
    <div className="bg-morandi-blueLight/20 p-4 rounded-2xl border border-morandi-blue/20 flex flex-col items-center justify-center">
      <span className="text-[10px] font-bold text-morandi-blue uppercase tracking-widest mb-1">結餘</span>
      <span className="text-morandi-blue font-bold font-serif-num text-lg">{formatCurrency(balance)}</span>
    </div>
  </div>
);

export default LedgerSummaryCards;
```

- [ ] **Step 2: Replace the inline cards in `Ledger.tsx`**

In `Ledger.tsx`, add import at top:
```tsx
import LedgerSummaryCards from './ledger/LedgerSummaryCards';
```

Find the `{/* Summary Cards */}` block (lines 603–617) and replace the entire `<div className="grid grid-cols-3 gap-3">...</div>` with:
```tsx
<LedgerSummaryCards
  income={summary.income}
  expense={summary.expense}
  balance={summary.balance}
  formatCurrency={formatCurrency}
/>
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```
Expected: no errors

---

### Task A2: Extract `TransactionList`

**Files:**
- Create: `components/ledger/TransactionList.tsx`
- Modify: `components/Ledger.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React from 'react';
import { Transaction } from '../../types';
import {
  Coffee, ShoppingBag, Home, Bus, HeartPulse, Briefcase,
  TrendingUp, Gift, Tag, CalendarIcon, CheckSquare, Square
} from 'lucide-react';
import { format } from 'date-fns';

const getChineseWeekDay = (dateStr: string) => {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return days[new Date(dateStr).getDay()];
};

const getCategoryIcon = (category: string) => {
  if (category.includes('飲食')) return <Coffee size={18} />;
  if (category.includes('購物')) return <ShoppingBag size={18} />;
  if (category.includes('居住')) return <Home size={18} />;
  if (category.includes('交通')) return <Bus size={18} />;
  if (category.includes('醫')) return <HeartPulse size={18} />;
  if (category.includes('薪')) return <Briefcase size={18} />;
  if (category.includes('資')) return <TrendingUp size={18} />;
  if (category.includes('娛樂')) return <Gift size={18} />;
  return <Tag size={18} />;
};

interface TransactionListProps {
  groupedTransactions: Record<string, Transaction[]>;
  isSelectMode: boolean;
  selectedIds: Set<string>;
  accounts: { id: string; name: string }[];
  isPrivacyMode: boolean;
  formatCurrency: (val: number) => string;
  onOpenModal: (t: Transaction) => void;
  onToggleSelect: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  groupedTransactions,
  isSelectMode,
  selectedIds,
  accounts,
  formatCurrency,
  onOpenModal,
  onToggleSelect,
}) => {
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name ?? '未知帳戶';

  if (Object.keys(groupedTransactions).length === 0) {
    return (
      <div className="text-center py-10 opacity-40">
        <div className="w-16 h-16 bg-stone-200 rounded-full mx-auto mb-3 flex items-center justify-center">
          <CalendarIcon className="text-stone-400" />
        </div>
        <p className="font-serif text-sm">本期間無交易紀錄</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.keys(groupedTransactions).map(dateKey => (
        <div key={dateKey} className="animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-sm font-bold font-serif text-ink-900">{format(new Date(dateKey), 'dd')} 日</span>
            <span className="text-xs text-ink-400 font-serif">週{getChineseWeekDay(dateKey)}</span>
            <div className="h-px bg-stone-100 flex-1 ml-2" />
          </div>
          <div className="space-y-2">
            {groupedTransactions[dateKey].map(t => (
              <div
                key={t.id}
                onClick={() => isSelectMode ? onToggleSelect(t.id) : onOpenModal(t)}
                className={`group bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer ${
                  isSelectMode && selectedIds.has(t.id)
                    ? 'border-morandi-blue bg-morandi-blueLight/10'
                    : 'border-stone-100 hover:border-morandi-blue/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  {isSelectMode && (
                    <div className="shrink-0">
                      {selectedIds.has(t.id)
                        ? <CheckSquare size={20} className="text-morandi-blue" />
                        : <Square size={20} className="text-stone-300" />}
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm transition-transform group-hover:scale-105 ${t.type === 'income' ? 'bg-ink-800' : 'bg-morandi-rose'}`}>
                    {getCategoryIcon(t.category)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-ink-900 font-serif">
                      {t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-ink-300 font-serif bg-stone-100 px-1.5 rounded">{getAccountName(t.accountId)}</span>
                      <span className="text-xs text-ink-400 truncate max-w-[80px] md:max-w-[150px]">{t.note || '無備註'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-serif-num font-bold text-base ${t.type === 'income' ? 'text-ink-900' : 'text-morandi-rose'}`}>
                    {t.type === 'income' ? '+' : ''}{formatCurrency(t.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
```

- [ ] **Step 2: Replace the inline list in `Ledger.tsx`**

Add import:
```tsx
import TransactionList from './ledger/TransactionList';
```

Find the `{/* Transaction List */}` block (lines 730–797) and replace the entire `<div className="space-y-4">...</div>` with:
```tsx
<TransactionList
  groupedTransactions={groupedTransactions}
  isSelectMode={isSelectMode}
  selectedIds={selectedIds}
  accounts={accounts}
  isPrivacyMode={isPrivacyMode}
  formatCurrency={formatCurrency}
  onOpenModal={openModal}
  onToggleSelect={toggleSelectTransaction}
/>
```

Also remove `getCategoryIcon` and `getChineseWeekDay` from `Ledger.tsx` since they're now in `TransactionList.tsx`. Remove their icon imports from `Ledger.tsx` if no longer used there.

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```
Expected: no errors

---

### Task A3: Extract `TransactionForm`

**Files:**
- Create: `components/ledger/TransactionForm.tsx`
- Modify: `components/Ledger.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React from 'react';
import { TransactionType, Account } from '../../types';
import { TRANSACTION_CATEGORIES } from '../../constants';
import {
  Trash2, X, ArrowUpRight, ArrowDownRight, Wallet, Tag, Check,
  Coffee, ShoppingBag, Home, Bus, HeartPulse, Briefcase, TrendingUp, Gift,
  Calendar as CalendarIcon
} from 'lucide-react';

const getCategoryIcon = (category: string) => {
  if (category.includes('飲食')) return <Coffee size={18} />;
  if (category.includes('購物')) return <ShoppingBag size={18} />;
  if (category.includes('居住')) return <Home size={18} />;
  if (category.includes('交通')) return <Bus size={18} />;
  if (category.includes('醫')) return <HeartPulse size={18} />;
  if (category.includes('薪')) return <Briefcase size={18} />;
  if (category.includes('資')) return <TrendingUp size={18} />;
  if (category.includes('娛樂')) return <Gift size={18} />;
  return <Tag size={18} />;
};

interface TransactionFormProps {
  isOpen: boolean;
  editingId: string | null;
  accounts: Account[];
  formType: TransactionType;
  formAmount: string;
  formCategory: string;
  formDate: string;
  formNote: string;
  formAccountId: string;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
  setFormType: (t: TransactionType) => void;
  setFormAmount: (v: string) => void;
  setFormCategory: (v: string) => void;
  setFormDate: (v: string) => void;
  setFormNote: (v: string) => void;
  setFormAccountId: (v: string) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen, editingId, accounts,
  formType, formAmount, formCategory, formDate, formNote, formAccountId,
  onClose, onDelete, onSave,
  setFormType, setFormAmount, setFormCategory, setFormDate, setFormNote, setFormAccountId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink-900/60 backdrop-blur-sm animate-fade-in p-0 md:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="font-bold text-ink-900 text-lg font-serif">{editingId ? '編輯紀錄' : '新增紀錄'}</h3>
          <div className="flex gap-2">
            {editingId && (
              <button onClick={onDelete} className="p-2 text-morandi-rose hover:bg-morandi-roseLight rounded-full transition-colors">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-ink-400 hover:bg-stone-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-stone-100 p-1.5 rounded-2xl mb-8">
            <button
              onClick={() => { setFormType('expense'); if (!editingId) setFormCategory(TRANSACTION_CATEGORIES.expense[0]); }}
              className={`py-3 rounded-xl text-sm font-bold font-serif transition-all flex items-center justify-center gap-2 ${formType === 'expense' ? 'bg-white text-morandi-rose shadow-sm' : 'text-ink-400'}`}
            >
              <ArrowDownRight size={16} /> 支出
            </button>
            <button
              onClick={() => { setFormType('income'); if (!editingId) setFormCategory(TRANSACTION_CATEGORIES.income[0]); }}
              className={`py-3 rounded-xl text-sm font-bold font-serif transition-all flex items-center justify-center gap-2 ${formType === 'income' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'}`}
            >
              <ArrowUpRight size={16} /> 收入
            </button>
          </div>

          {/* Amount */}
          <div className="mb-8 text-center relative">
            <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">金額</label>
            <div className="flex items-center justify-center text-5xl font-serif-num font-bold text-ink-900">
              <span className="text-3xl text-stone-300 font-light mr-1">$</span>
              <input
                type="number"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                placeholder="0"
                className="w-48 text-center bg-transparent focus:outline-none placeholder-stone-200 caret-morandi-blue"
                autoFocus={!editingId}
              />
            </div>
          </div>

          {/* Account */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">帳戶 (Account)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
                <Wallet size={18} />
              </div>
              <select
                value={formAccountId || ''}
                onChange={e => setFormAccountId(e.target.value)}
                className="w-full bg-white border border-stone-200 pl-10 pr-4 py-3 rounded-xl text-sm font-bold text-ink-900 focus:outline-none focus:border-morandi-blue appearance-none"
              >
                {accounts.length === 0 && <option value="">請先建立帳戶</option>}
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Grid */}
          <div className="mb-8">
            <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">分類</label>
            <div className="grid grid-cols-4 gap-3">
              {TRANSACTION_CATEGORIES[formType].map(c => (
                <button
                  key={c}
                  onClick={() => setFormCategory(c)}
                  className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 ${formCategory === c ? 'bg-ink-50 border-ink-900 text-ink-900 ring-1 ring-ink-900' : 'bg-white border-stone-100 text-ink-400 hover:border-stone-300'}`}
                >
                  <div className={formCategory === c ? 'text-ink-900' : 'text-ink-300'}>{getCategoryIcon(c)}</div>
                  <span className="text-[10px] font-medium">{c}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date + Note */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-stone-50 p-1 rounded-xl border border-stone-100 focus-within:border-morandi-blue transition-colors">
              <div className="p-3 text-ink-400"><CalendarIcon size={18} /></div>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="flex-1 bg-transparent py-2 text-sm font-bold text-ink-900 outline-none font-serif-num"
              />
            </div>
            <div className="flex items-center gap-3 bg-stone-50 p-1 rounded-xl border border-stone-100 focus-within:border-morandi-blue transition-colors">
              <div className="p-3 text-ink-400"><Tag size={18} /></div>
              <input
                type="text"
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
                placeholder="寫點備註..."
                className="flex-1 bg-transparent py-2 text-sm text-ink-900 outline-none"
              />
            </div>
          </div>

          <button onClick={onSave} className="w-full mt-8 py-4 bg-ink-900 text-white rounded-2xl font-bold shadow-lg shadow-ink-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <Check size={20} /> {editingId ? '儲存變更' : '完成記帳'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;
```

- [ ] **Step 2: Replace modal in `Ledger.tsx`**

Add import:
```tsx
import TransactionForm from './ledger/TransactionForm';
```

Find the `{/* === Add/Edit Modal === */}` block (lines 808–932) and replace the entire `{isModalOpen && (...)}` block with:
```tsx
<TransactionForm
  isOpen={isModalOpen}
  editingId={editingId}
  accounts={accounts}
  formType={formType}
  formAmount={formAmount}
  formCategory={formCategory}
  formDate={formDate}
  formNote={formNote}
  formAccountId={formAccountId}
  onClose={() => setIsModalOpen(false)}
  onDelete={handleDelete}
  onSave={handleSave}
  setFormType={setFormType}
  setFormAmount={setFormAmount}
  setFormCategory={setFormCategory}
  setFormDate={setFormDate}
  setFormNote={setFormNote}
  setFormAccountId={setFormAccountId}
/>
```

Remove duplicate icon imports from `Ledger.tsx` that are now only used in `TransactionForm.tsx`.

- [ ] **Step 3: Verify typecheck and tests**

```bash
npm run typecheck && npm run test:run
```
Expected: both pass

- [ ] **Step 4: Commit Part A**

```bash
git add components/Ledger.tsx components/ledger/
git commit -m "refactor: split Ledger.tsx into container + TransactionForm, TransactionList, SummaryCards"
```

---

## Part B: AnalyticsPage.tsx

### File Structure

```
components/
  AnalyticsPage.tsx                          ← container (~350 lines)
  analytics/
    CalendarView.tsx                         ← calendar grid + day panel (~200 lines)
    AnalyticsSummaryBar.tsx                  ← period income/expense/savings rate bar
```

---

### Task B1: Extract `AnalyticsSummaryBar`

**Files:**
- Create: `components/analytics/AnalyticsSummaryBar.tsx`
- Modify: `components/AnalyticsPage.tsx`

- [ ] **Step 1: Identify the summary bar JSX in `AnalyticsPage.tsx`**

Run: `grep -n "currentIncome\|currentExpense\|savingsRate\|savings_rate\|Income\|Expense" components/AnalyticsPage.tsx | head -20`

This shows you the lines that render the income/expense/savings summary section. Read those lines carefully, then create a component:

```tsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AnalyticsSummaryBarProps {
  income: number;
  expense: number;
  savingsRate: number;
  formatCurrency: (val: number) => string;
  isPrivacyMode: boolean;
}

const AnalyticsSummaryBar: React.FC<AnalyticsSummaryBarProps> = ({
  income, expense, savingsRate, formatCurrency, isPrivacyMode
}) => {
  // Copy the JSX for the summary cards/bar from AnalyticsPage.tsx here
  // (the section that shows income, expense, and savings rate for the current period)
};

export default AnalyticsSummaryBar;
```

Read `AnalyticsPage.tsx` lines 370–460 to copy the exact JSX for this section.

- [ ] **Step 2: Replace the inline summary bar in `AnalyticsPage.tsx`**

Add import and replace the inline JSX with:
```tsx
import AnalyticsSummaryBar from './analytics/AnalyticsSummaryBar';

// Then inside the return:
<AnalyticsSummaryBar
  income={currentPeriodStats.currentIncome}
  expense={currentPeriodStats.currentExpense}
  savingsRate={calculateSavingsRate()}
  formatCurrency={formatCurrency}
  isPrivacyMode={isPrivacyMode}
/>
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```
Expected: no errors

---

### Task B2: Extract `CalendarView`

**Files:**
- Create: `components/analytics/CalendarView.tsx`
- Modify: `components/AnalyticsPage.tsx`

- [ ] **Step 1: Identify the calendar section**

Run: `grep -n "calendar\|CalendarDays\|eachDayOfInterval\|selectedDay\|calendarDays" components/AnalyticsPage.tsx | head -20`

The calendar renders a month grid with clickable day cells. When a day is selected, a day panel slides in with that day's transactions.

- [ ] **Step 2: Read the calendar section**

Read `components/AnalyticsPage.tsx` lines 600–898 to see the full calendar + day panel JSX.

- [ ] **Step 3: Create the component**

```tsx
import React from 'react';
import { Transaction } from '../../types';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { CalendarDays, X as XIcon } from 'lucide-react';

interface CalendarViewProps {
  currentDate: Date;
  transactions: Transaction[];
  selectedDay: string | null;
  isPrivacyMode: boolean;
  formatCurrency: (val: number) => string;
  onSelectDay: (day: string | null) => void;
  onNavigateToLedger: (category: string, month: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate, transactions, selectedDay, isPrivacyMode,
  formatCurrency, onSelectDay, onNavigateToLedger
}) => {
  // Copy the calendar grid + day panel JSX from AnalyticsPage.tsx here.
  // Replace all `setSelectedDay(...)` calls with `onSelectDay(...)`.
  // Replace navigate calls with `onNavigateToLedger(category, month)`.
};

export default CalendarView;
```

- [ ] **Step 4: Replace the calendar section in `AnalyticsPage.tsx`**

Add import and replace:
```tsx
import CalendarView from './analytics/CalendarView';

// In the return, where viewMode === 'calendar':
{viewMode === 'calendar' && (
  <CalendarView
    currentDate={currentDate}
    transactions={transactions}
    selectedDay={selectedDay}
    isPrivacyMode={isPrivacyMode}
    formatCurrency={formatCurrency}
    onSelectDay={setSelectedDay}
    onNavigateToLedger={(category, month) => navigate(`/ledger?category=${category}&month=${month}`)}
  />
)}
```

- [ ] **Step 5: Verify typecheck and build**

```bash
npm run typecheck && npm run build
```
Expected: both pass

- [ ] **Step 6: Visual check**

Start dev server (`npm run dev`), open AnalyticsPage, switch to calendar view, click a day — verify the day panel still opens correctly.

- [ ] **Step 7: Commit Part B**

```bash
git add components/AnalyticsPage.tsx components/analytics/
git commit -m "refactor: split AnalyticsPage.tsx into container + CalendarView, SummaryBar"
```
