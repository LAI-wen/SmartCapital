

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Transaction, TransactionType, Account } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants';
import { getTransactions as fetchTransactions, createTransaction as apiCreateTransaction, deleteTransaction as apiDeleteTransaction, batchDeleteTransactions as apiBatchDeleteTransactions, getBudgets, removeBudget, type Budget } from '../services';
import {
  Plus, ChevronLeft, ChevronRight,
  Tag, Trash2, X, Zap,
  CheckSquare
} from 'lucide-react';
import LedgerSummaryCards from './ledger/LedgerSummaryCards';
import TransactionList from './ledger/TransactionList';
import TransactionForm from './ledger/TransactionForm';
import { 
  format, isSameMonth, isSameYear, addMonths, subMonths, 
  addYears, subYears, endOfMonth, eachDayOfInterval
} from 'date-fns';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

interface LedgerProps {
  isPrivacyMode: boolean;
  accounts: Account[]; // New Prop
  onAccountsUpdate?: () => void; // Callback to reload accounts after transactions
}

type ViewMode = 'month' | 'year';

const Ledger: React.FC<LedgerProps> = ({ isPrivacyMode, accounts, onAccountsUpdate }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // --- STATE ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Quick Add State
  const [quickAmount, setQuickAmount] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formAccountId, setFormAccountId] = useState('');

  // 批次刪除狀態
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 預算狀態
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // 🔥 載入交易記錄從資料庫
  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoadingTransactions(true);
      try {
        const txs = await fetchTransactions(200); // 載入最近 200 筆
        setTransactions(txs);
      } catch (error) {
        console.error('❌ 載入交易失敗:', error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, []);

  useEffect(() => {
    getBudgets().then(setBudgets).catch(console.error);
  }, []);

  // Consume Analytics handoff once, then clear the query string.
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const monthParam = searchParams.get('month');

    if (!categoryParam && !monthParam) return;

    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
        setCurrentDate(new Date(year, month - 1, 1));
      }
    }

    navigate('/ledger', { replace: true });
  }, [navigate, searchParams]);

  // --- DATA COMPUTATION ---

  const periodTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      if (viewMode === 'month') {
        return isSameMonth(tDate, currentDate);
      } else {
        return isSameYear(tDate, currentDate);
      }
    });
  }, [transactions, currentDate, viewMode]);

  const filteredTransactions = useMemo(() => {
    return periodTransactions
      .filter(t => selectedCategory === 'All' || t.category === selectedCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [periodTransactions, selectedCategory]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  // 本月各分類支出（用於預算對比）
  const monthlyExpenseByCategory = useMemo(() => {
    const now = new Date();
    const monthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const map: Record<string, number> = { '總計': 0 };
    monthTxs.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
      map['總計'] += t.amount;
    });
    return map;
  }, [transactions]);

  const chartData = useMemo(() => {
    if (viewMode === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start, end });
      const dataMap = new Map(days.map(d => [format(d, 'yyyy-MM-dd'), 0]));
      
      filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
          const dateKey = t.date.split('T')[0];
          const current = dataMap.get(dateKey) || 0;
          dataMap.set(dateKey, current + t.amount);
        }
      });

      return Array.from(dataMap).map(([date, value]) => ({
        key: format(new Date(date), 'dd'),
        value
      }));
    } else {
      const data = Array(12).fill(0).map((_, i) => ({ key: `${i + 1}月`, value: 0 }));
      filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
           const month = new Date(t.date).getMonth();
           data[month].value += t.amount;
        }
      });
      return data;
    }
  }, [filteredTransactions, viewMode, currentDate]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      // 只取日期部分，忽略時間
      const dateKey = t.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // --- ACTIONS ---

  const handlePrev = () => {
    setCurrentDate(prev => viewMode === 'month' ? subMonths(prev, 1) : subYears(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => viewMode === 'month' ? addMonths(prev, 1) : addYears(prev, 1));
  };

  const toggleMode = () => {
    setViewMode(prev => prev === 'month' ? 'year' : 'month');
  };

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAmount) {
      const amount = parseFloat(quickAmount);
      if (isNaN(amount) || amount <= 0) return;

      // 使用預設帳戶
      const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
      if (!defaultAccount) {
        alert('請先建立帳戶');
        return;
      }

      try {
        const newTx = await apiCreateTransaction(
          'expense',
          amount,
          '其他', // Default category
          new Date().toISOString().split('T')[0],
          '快速記帳',
          defaultAccount.id
        );

        if (newTx) {
          setTransactions([newTx, ...transactions]);
          // 🔥 通知父組件刷新帳戶餘額
          onAccountsUpdate?.();
        }
      } catch (error) {
        console.error('❌ 快速記帳失敗:', error);
        alert('記帳失敗，請重試');
      }

      setQuickAmount('');
    }
  };

  const openModal = (tx?: Transaction) => {
    if (tx) {
      setEditingId(tx.id);
      setFormType(tx.type);
      setFormAmount(tx.amount.toString());
      setFormCategory(tx.category);
      // 只取日期部分，去掉時間戳
      setFormDate(tx.date.split('T')[0]);
      setFormNote(tx.note);
      setFormAccountId(tx.accountId);
    } else {
      // 新增模式：使用預設帳戶
      const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
      const accountId = defaultAccount?.id || '';

      setEditingId(null);
      setFormType('expense');
      setFormAmount('');
      setFormCategory(TRANSACTION_CATEGORIES.expense[0]);
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormNote('');
      setFormAccountId(accountId);
    }
    setIsModalOpen(true);
  };

  const reloadTransactions = async () => {
    try {
      const txs = await fetchTransactions(200);
      setTransactions(txs);
    } catch (error) {
      console.error('❌ 刷新交易失敗:', error);
    }
  };

  const handleSave = async () => {
    if (!formAmount) return;
    const amountVal = Math.abs(parseFloat(formAmount)); // 使用絕對值，確保金額為正

    // 確保有選擇帳戶
    if (!formAccountId || formAccountId === '') {
      alert('請選擇帳戶');
      return;
    }

    try {
      if (editingId) {
        // 編輯模式：先刪除舊的，再新增（因為沒有 update API）
        await apiDeleteTransaction(editingId);
        const newTx = await apiCreateTransaction(
          formType,
          amountVal,
          formCategory,
          formDate,
          formNote,
          formAccountId
        );

        if (newTx) {
          setIsModalOpen(false);
          // 刷新列表以取得最新資料
          await reloadTransactions();
          // 🔥 通知父組件刷新帳戶餘額
          onAccountsUpdate?.();
        }
      } else {
        // 新增模式
        const newTx = await apiCreateTransaction(
          formType,
          amountVal,
          formCategory,
          formDate,
          formNote,
          formAccountId
        );

        if (newTx) {
          setIsModalOpen(false);
          // 刷新列表以取得最新資料
          await reloadTransactions();
          // 🔥 通知父組件刷新帳戶餘額
          onAccountsUpdate?.();
        } else {
          // API returned null, check if it's balance issue
          const account = accounts.find(a => a.id === formAccountId);
          if (formType === 'expense' && account && account.balance < amountVal) {
            alert(`帳戶餘額不足！\n${account.name} 餘額：${account.currency === 'TWD' ? 'NT$' : '$'}${account.balance}\n需要金額：${account.currency === 'TWD' ? 'NT$' : '$'}${amountVal}`);
          } else {
            alert('儲存失敗，請重試');
          }
        }
      }
    } catch (error) {
      console.error('❌ 儲存交易失敗:', error);
      // Try to parse error message from backend
      if (error instanceof Error && error.message.includes('餘額不足')) {
        alert(error.message);
      } else {
        alert('儲存失敗，請重試');
      }
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;

    // 顯示自定義確認對話框
    const confirmed = confirm('確定要刪除此紀錄嗎？');
    if (!confirmed) return;

    // 詢問是否要連動帳戶餘額
    const updateBalance = confirm(
      '是否要同步更新帳戶餘額？\n\n' +
      '• 點選「確定」：刪除記錄並回復帳戶餘額\n' +
      '• 點選「取消」：只刪除記錄，不影響帳戶餘額'
    );

    try {
      const skipBalanceUpdate = !updateBalance;
      const success = await apiDeleteTransaction(editingId, skipBalanceUpdate);
      if (success) {
        setIsModalOpen(false);
        // 刷新列表以取得最新資料
        await reloadTransactions();
        // 🔥 如果有連動資金池，通知父組件刷新帳戶餘額
        if (!skipBalanceUpdate) {
          onAccountsUpdate?.();
        }
      }
    } catch (error) {
      console.error('❌ 刪除交易失敗:', error);
      alert('刪除失敗，請重試');
    }
  };

  // 批次刪除處理函數
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedIds(new Set());
  };

  const toggleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAllInView = () => {
    const allIds = new Set(filteredTransactions.map(t => t.id));
    setSelectedIds(allIds);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      alert('請選擇要刪除的交易記錄');
      return;
    }

    if (!confirm(`確定要刪除 ${selectedIds.size} 筆交易記錄嗎？`)) {
      return;
    }

    // 詢問是否要連動帳戶餘額
    const updateBalance = confirm(
      '是否要同步更新帳戶餘額？\n\n' +
      '• 點選「確定」：刪除記錄並回復帳戶餘額\n' +
      '• 點選「取消」：只刪除記錄，不影響帳戶餘額'
    );

    try {
      const idsArray: string[] = Array.from(selectedIds);
      const skipBalanceUpdate = !updateBalance;

      const result = await apiBatchDeleteTransactions(idsArray, skipBalanceUpdate);

      if (result) {
        if (result.errors && result.errors.length > 0) {
          alert(`部分刪除失敗：${result.deletedCount}/${result.totalRequested} 筆成功`);
        } else {
          alert(`成功刪除 ${result.deletedCount} 筆交易記錄`);
        }

        // 刷新列表
        await reloadTransactions();
        // 🔥 如果有連動資金池，通知父組件刷新帳戶餘額
        if (!skipBalanceUpdate) {
          onAccountsUpdate?.();
        }
        // 退出選擇模式
        setIsSelectMode(false);
        setSelectedIds(new Set());
      } else {
        console.error('❌ 批次刪除返回 null');
        alert('批次刪除失敗，請檢查網路連線或查看控制台錯誤訊息');
      }
    } catch (error) {
      console.error('❌ 批次刪除失敗:', error);
      alert('批次刪除失敗，請重試');
    }
  };

  const handleRemoveBudget = async (category: string) => {
    await removeBudget(category);
    setBudgets(prev => prev.filter(b => b.category !== category));
  };

  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const getAccountName = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    return acc ? acc.name : '未知帳戶';
  };

  // Reusable Quick Input Component
  const QuickInput = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`${mobile ? 'fixed bottom-20 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-stone-200 md:hidden z-30' : 'hidden md:block pt-4 pb-2 px-4'}`}>
      <div className={`relative group max-w-xl mx-auto ${mobile ? 'shadow-lg rounded-2xl' : ''}`}>
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
           <Zap className="text-morandi-blue group-focus-within:text-ink-900 transition-colors" size={20} />
        </div>
        <input 
          type="number" 
          placeholder="輸入金額按 Enter..." 
          className={`w-full bg-white border border-stone-200 text-ink-900 pl-12 pr-4 rounded-2xl text-lg font-serif-num focus:outline-none focus:border-morandi-blue focus:ring-4 focus:ring-morandi-blue/10 transition-all placeholder-ink-300 shadow-sm
            ${mobile ? 'py-4' : 'py-3.5'}
          `}
          value={quickAmount}
          onChange={(e) => setQuickAmount(e.target.value)}
          onKeyDown={handleQuickAdd}
        />
      </div>
    </div>
  );

  // 載入中顯示
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

      {/* === Sticky Date Header === */}
      <div className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md transition-shadow shadow-sm">
        
        {/* Desktop Quick Input (Top) */}
        <QuickInput />

        {/* Date Nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
           <button onClick={handlePrev} className="p-2 rounded-full hover:bg-stone-100 text-ink-400 hover:text-ink-900 transition-colors">
              <ChevronLeft size={20} />
           </button>
           <button
             onClick={toggleMode}
             className="px-4 py-1.5 rounded-lg hover:bg-stone-100 transition-colors flex flex-col items-center"
           >
              <span className="text-base font-bold font-serif text-ink-900 tracking-wide">
                {viewMode === 'month' ? format(currentDate, 'yyyy年 MM月') : format(currentDate, 'yyyy年')}
              </span>
              <span className="text-[10px] text-ink-400 font-serif -mt-0.5">
                {viewMode === 'month' ? '切換年檢視' : '切換月檢視'}
              </span>
           </button>
           <button onClick={handleNext} className="p-2 rounded-full hover:bg-stone-100 text-ink-400 hover:text-ink-900 transition-colors">
              <ChevronRight size={20} />
           </button>
        </div>

        {selectedCategory !== 'All' && (
          <div className="flex items-center justify-between px-4 py-2 bg-morandi-blueLight/20 border-b border-morandi-blue/10">
            <div className="flex items-center gap-2 text-xs font-serif text-morandi-blue">
              <Tag size={14} />
              <span>分類篩選：{selectedCategory}</span>
            </div>
            <button
              onClick={() => setSelectedCategory('All')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-ink-500 hover:bg-white hover:text-ink-900 transition-colors"
            >
              <X size={14} />
              <span>清除</span>
            </button>
          </div>
        )}

        {/* 批次刪除工具欄 */}
        <div className="flex items-center justify-between px-4 py-2 bg-stone-50 border-b border-stone-100">
          {!isSelectMode ? (
            <button
              onClick={toggleSelectMode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-ink-600 hover:bg-white hover:text-morandi-rose transition-colors"
            >
              <CheckSquare size={16} />
              <span>批次刪除</span>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllInView}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-ink-600 hover:bg-white transition-colors"
                >
                  全選 ({filteredTransactions.length})
                </button>
                <span className="text-xs text-ink-400">
                  已選 {selectedIds.size} 筆
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-morandi-rose text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-morandi-rose/90 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>刪除</span>
                </button>
                <button
                  onClick={toggleSelectMode}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-ink-600 hover:bg-white transition-colors"
                >
                  <X size={14} />
                  <span>取消</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* === Content Area === */}
      <div className="px-4 py-6 space-y-6">
         
         {/* Summary Cards */}
         <LedgerSummaryCards
           income={summary.income}
           expense={summary.expense}
           balance={summary.balance}
           formatCurrency={formatCurrency}
         />

         {/* Mini Trend Chart */}
         {(() => {
           const peakPoint = chartData.reduce<{ key: string; value: number } | null>((best, d) =>
             d.value > (best?.value ?? 0) ? d : best, null);
           return (
             <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
               <div className="flex justify-between items-center mb-3 px-1">
                 <h3 className="text-xs font-bold font-serif text-ink-400">支出趨勢</h3>
                 <div className="flex items-center gap-2">
                   {peakPoint && peakPoint.value > 0 && (
                     <span className="text-[10px] text-morandi-rose font-serif-num">
                       最高 {viewMode === 'month' ? `${peakPoint.key}日` : peakPoint.key} ${peakPoint.value.toLocaleString()}
                     </span>
                   )}
                   <span className="text-[10px] text-ink-300 font-serif">
                     {viewMode === 'month' ? '每日' : '每月'}
                   </span>
                 </div>
               </div>
               <div className="h-[160px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                     <defs>
                       <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#C8A4A4" stopOpacity={0.35}/>
                         <stop offset="95%" stopColor="#C8A4A4" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <Tooltip
                       cursor={{ stroke: '#C8A4A4', strokeWidth: 1, strokeDasharray: '3 3' }}
                       content={({ active, payload, label }) => {
                         if (active && payload && payload.length && (payload[0].value as number) > 0) {
                           return (
                             <div className="bg-ink-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg font-serif-num">
                               <div className="text-white/60 text-[10px] mb-0.5">{label}</div>
                               <div>${(payload[0].value as number).toLocaleString()}</div>
                             </div>
                           );
                         }
                         return null;
                       }}
                     />
                     <XAxis dataKey="key" hide />
                     <Area type="monotone" dataKey="value" stroke="#C8A4A4" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" dot={false} />
                     {peakPoint && peakPoint.value > 0 && (
                       <ReferenceDot x={peakPoint.key} y={peakPoint.value} r={4} fill="#C8A4A4" stroke="#fff" strokeWidth={2} />
                     )}
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>
           );
         })()}

         {/* Budget Summary */}
         {budgets.length > 0 && (
           <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
             <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
               <h3 className="text-xs font-bold font-serif text-ink-400">本月預算</h3>
               <button
                 onClick={() => navigate('/budget-settings')}
                 className="text-[10px] text-morandi-blue font-serif hover:underline"
               >
                 前往設定
               </button>
             </div>
             <div className="divide-y divide-stone-50">
               {budgets.map(b => {
                 const spent = monthlyExpenseByCategory[b.category] || 0;
                 const pct = Math.min((spent / b.amount) * 100, 100);
                 const over = spent > b.amount;
                 const warn = pct >= 90;
                 const barColor = over ? 'bg-morandi-rose' : warn ? 'bg-amber-400' : 'bg-morandi-green';
                 return (
                   <div key={b.category} className="px-4 py-3 group">
                     <div className="flex justify-between items-center mb-1.5">
                       <span className="text-xs font-bold text-ink-700 font-serif">{b.category}</span>
                       <div className="flex items-center gap-2">
                         <span className={`text-xs font-serif-num font-bold ${over ? 'text-morandi-rose' : 'text-ink-500'}`}>
                           ${spent.toFixed(0)} <span className="text-ink-300 font-normal">/ ${b.amount.toLocaleString()}</span>
                         </span>
                         <button
                           onClick={() => handleRemoveBudget(b.category)}
                           className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-morandi-rose transition-all"
                         >
                           <X size={12} />
                         </button>
                       </div>
                     </div>
                     <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                       <div
                         className={`h-full rounded-full transition-all ${barColor}`}
                         style={{ width: `${pct}%` }}
                       />
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
         )}

         {budgets.length === 0 && (
           <button
             onClick={() => navigate('/budget-settings')}
             className="w-full py-3 rounded-2xl border border-dashed border-stone-200 text-xs text-ink-300 font-serif hover:border-morandi-blue hover:text-morandi-blue transition-colors"
           >
             + 設定月預算
           </button>
         )}

         {/* Transaction List */}
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
      </div>

      {/* Floating Add Button - Now primary action on mobile */}
      <button
         onClick={() => openModal()}
         className="fixed bottom-24 right-4 md:right-8 md:bottom-10 w-14 h-14 bg-morandi-blue text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30 ring-4 ring-paper hover:bg-ink-900"
      >
         <Plus size={24} />
      </button>

      {/* === Add/Edit Modal === */}
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

    </div>
  );
};

export default Ledger;
