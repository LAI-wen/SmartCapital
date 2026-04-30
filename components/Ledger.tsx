import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Transaction, Account } from '../types';
import { getTransactions as fetchTransactions, getBudgets, removeBudget, type Budget } from '../services';
import { Plus } from 'lucide-react';
import LedgerSummaryCards from './ledger/LedgerSummaryCards';
import TransactionList from './ledger/TransactionList';
import TransactionForm from './ledger/TransactionForm';
import MiniTrendChart from './ledger/MiniTrendChart';
import BudgetPanel from './ledger/BudgetPanel';
import LedgerHeader from './ledger/LedgerHeader';
import { format, isSameMonth, isSameYear, addMonths, subMonths, addYears, subYears, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useLedgerActions } from '../hooks/useLedgerActions';

interface LedgerProps {
  isPrivacyMode: boolean;
  accounts: Account[];
  isSessionReady: boolean;
  onAccountsUpdate?: () => void;
}

type ViewMode = 'month' | 'year';

const Ledger: React.FC<LedgerProps> = ({ isPrivacyMode, accounts, isSessionReady, onAccountsUpdate }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const actions = useLedgerActions({ accounts, transactions, setTransactions, onAccountsUpdate });

  useEffect(() => {
    const loadTransactions = async () => {
      if (!isSessionReady) {
        setTransactions([]);
        setIsLoadingTransactions(false);
        return;
      }

      setIsLoadingTransactions(true);
      try {
        setTransactions(await fetchTransactions(200));
      } catch (error) {
        console.error('❌ 載入交易失敗:', error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };
    loadTransactions();
  }, [isSessionReady]);

  useEffect(() => {
    if (!isSessionReady) {
      setBudgets([]);
      return;
    }

    getBudgets().then(setBudgets).catch(console.error);
  }, [isSessionReady]);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const monthParam = searchParams.get('month');
    if (!categoryParam && !monthParam) return;
    if (categoryParam) setSelectedCategory(categoryParam);
    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
        setCurrentDate(new Date(year, month - 1, 1));
      }
    }
    navigate('/ledger', { replace: true });
  }, [navigate, searchParams]);

  const periodTransactions = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date);
      return viewMode === 'month' ? isSameMonth(d, currentDate) : isSameYear(d, currentDate);
    }), [transactions, currentDate, viewMode]);

  const filteredTransactions = useMemo(() =>
    periodTransactions
      .filter(t => selectedCategory === 'All' || t.category === selectedCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [periodTransactions, selectedCategory]);

  const summary = useMemo(() => {
    let income = 0, expense = 0;
    filteredTransactions.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const monthlyExpenseByCategory = useMemo(() => {
    const now = new Date();
    const map: Record<string, number> = { '總計': 0 };
    transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; map['總計'] += t.amount; });
    return map;
  }, [transactions]);

  const chartData = useMemo(() => {
    if (viewMode === 'month') {
      const dataMap = new Map(
        eachDayOfInterval({ start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), end: endOfMonth(currentDate) })
          .map(d => [format(d, 'yyyy-MM-dd'), 0])
      );
      filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
          const k = t.date.split('T')[0];
          dataMap.set(k, (dataMap.get(k) || 0) + t.amount);
        }
      });
      return Array.from(dataMap).map(([date, value]) => ({ key: format(new Date(date), 'dd'), value }));
    } else {
      const data = Array(12).fill(0).map((_, i) => ({ key: `${i + 1}月`, value: 0 }));
      filteredTransactions.forEach(t => { if (t.type === 'expense') data[new Date(t.date).getMonth()].value += t.amount; });
      return data;
    }
  }, [filteredTransactions, viewMode, currentDate]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      const k = t.date.split('T')[0];
      (groups[k] ??= []).push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const handleRemoveBudget = async (category: string) => {
    await removeBudget(category);
    setBudgets(prev => prev.filter(b => b.category !== category));
  };

  if (!isSessionReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="text-5xl mb-4">🧾</div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">記帳資料暫時不可用</h2>
          <p className="text-ink-400 font-serif leading-relaxed">
            請先完成 LINE 登入或進入訪客模式，之後就能查看與新增交易記錄。
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingTransactions) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-morandi-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink-400 font-serif">載入交易記錄中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-48 md:pb-32 min-h-screen relative">
      <LedgerHeader
        currentDate={currentDate}
        viewMode={viewMode}
        selectedCategory={selectedCategory}
        isSelectMode={actions.isSelectMode}
        selectedCount={actions.selectedIds.size}
        filteredCount={filteredTransactions.length}
        quickAmount={actions.quickAmount}
        onPrev={() => setCurrentDate(prev => viewMode === 'month' ? subMonths(prev, 1) : subYears(prev, 1))}
        onNext={() => setCurrentDate(prev => viewMode === 'month' ? addMonths(prev, 1) : addYears(prev, 1))}
        onToggleMode={() => setViewMode(prev => prev === 'month' ? 'year' : 'month')}
        onClearCategory={() => setSelectedCategory('All')}
        onToggleSelectMode={actions.toggleSelectMode}
        onSelectAll={() => actions.selectAllInView(filteredTransactions.map(t => t.id))}
        onBatchDelete={actions.handleBatchDelete}
        onQuickAmountChange={actions.setQuickAmount}
        onQuickKeyDown={actions.handleQuickAdd}
      />

      <div className="px-4 py-6 space-y-6">
        <LedgerSummaryCards income={summary.income} expense={summary.expense} balance={summary.balance} formatCurrency={formatCurrency} />
        <MiniTrendChart chartData={chartData} viewMode={viewMode} />
        <BudgetPanel budgets={budgets} monthlyExpenseByCategory={monthlyExpenseByCategory} onNavigateToBudgetSettings={() => navigate('/budget-settings')} onRemoveBudget={handleRemoveBudget} />
        <TransactionList groupedTransactions={groupedTransactions} isSelectMode={actions.isSelectMode} selectedIds={actions.selectedIds} accounts={accounts} formatCurrency={formatCurrency} onOpenModal={actions.openModal} onToggleSelect={actions.toggleSelectTransaction} />
      </div>

      <button onClick={() => actions.openModal()} className="fixed bottom-24 right-4 md:right-8 md:bottom-10 w-14 h-14 bg-morandi-blue text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30 ring-4 ring-paper hover:bg-ink-900">
        <Plus size={24} />
      </button>

      <TransactionForm
        isOpen={actions.isModalOpen}
        editingId={actions.editingId}
        accounts={accounts}
        formType={actions.formType}
        formAmount={actions.formAmount}
        formCategory={actions.formCategory}
        formDate={actions.formDate}
        formNote={actions.formNote}
        formAccountId={actions.formAccountId}
        onClose={() => actions.setIsModalOpen(false)}
        onDelete={actions.handleDelete}
        onSave={actions.handleSave}
        setFormType={actions.setFormType}
        setFormAmount={actions.setFormAmount}
        setFormCategory={actions.setFormCategory}
        setFormDate={actions.setFormDate}
        setFormNote={actions.setFormNote}
        setFormAccountId={actions.setFormAccountId}
      />
    </div>
  );
};

export default Ledger;
