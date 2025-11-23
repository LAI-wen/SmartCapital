

import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Account } from '../types';
import { MOCK_TRANSACTIONS, TRANSACTION_CATEGORIES } from '../constants';
import { 
  Plus, Coffee, ShoppingBag, Home, Bus, HeartPulse, Briefcase, 
  TrendingUp, Gift, ChevronLeft, ChevronRight, 
  Tag, Trash2, X, Zap, Calendar as CalendarIcon, Check,
  ArrowUpRight, ArrowDownRight, Wallet
} from 'lucide-react';
import { 
  format, isSameMonth, isSameYear, addMonths, subMonths, 
  addYears, subYears, endOfMonth, eachDayOfInterval
} from 'date-fns';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface LedgerProps {
  isPrivacyMode: boolean;
  accounts: Account[]; // New Prop
}

type ViewMode = 'month' | 'year';

const getChineseWeekDay = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return days[date.getDay()];
};

const Ledger: React.FC<LedgerProps> = ({ isPrivacyMode, accounts }) => {
  // --- STATE ---
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
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

  // --- DATA COMPUTATION ---

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      if (viewMode === 'month') {
        return isSameMonth(tDate, currentDate);
      } else {
        return isSameYear(tDate, currentDate);
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentDate, viewMode]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    if (viewMode === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start, end });
      const dataMap = new Map(days.map(d => [format(d, 'yyyy-MM-dd'), 0]));
      
      filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
          const current = dataMap.get(t.date) || 0;
          dataMap.set(t.date, current + t.amount);
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
      const dateKey = t.date; 
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

  const handleQuickAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAmount) {
      const amount = parseFloat(quickAmount);
      if (isNaN(amount) || amount <= 0) return;
      
      const newTx: Transaction = {
        id: Date.now().toString(),
        type: 'expense',
        amount,
        category: '其他', // Default category
        date: new Date().toISOString().split('T')[0],
        note: '快速記帳',
        accountId: accounts[0]?.id || 'acc_1'
      };
      
      setTransactions([newTx, ...transactions]);
      setQuickAmount('');
    }
  };

  const openModal = (tx?: Transaction) => {
    if (tx) {
      setEditingId(tx.id);
      setFormType(tx.type);
      setFormAmount(tx.amount.toString());
      setFormCategory(tx.category);
      setFormDate(tx.date);
      setFormNote(tx.note);
      setFormAccountId(tx.accountId);
    } else {
      setEditingId(null);
      setFormType('expense');
      setFormAmount('');
      setFormCategory(TRANSACTION_CATEGORIES.expense[0]);
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormNote('');
      setFormAccountId(accounts[0]?.id || '');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formAmount) return;
    const amountVal = parseFloat(formAmount);
    
    if (editingId) {
      setTransactions(prev => prev.map(t => t.id === editingId ? {
        ...t,
        type: formType,
        amount: amountVal,
        category: formCategory,
        date: formDate,
        note: formNote,
        accountId: formAccountId
      } : t));
    } else {
      const newTx: Transaction = {
        id: Date.now().toString(),
        type: formType,
        amount: amountVal,
        category: formCategory,
        date: formDate,
        note: formNote,
        accountId: formAccountId
      };
      setTransactions([newTx, ...transactions]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (editingId && confirm('確定要刪除此紀錄？')) {
      setTransactions(prev => prev.filter(t => t.id !== editingId));
      setIsModalOpen(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
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
      </div>

      {/* === Content Area === */}
      <div className="px-4 py-6 space-y-6">
         
         {/* Summary Cards */}
         <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center">
               <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-1">收入</span>
               <span className="text-ink-900 font-bold font-serif-num text-lg">{formatCurrency(summary.income)}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center">
               <span className="text-[10px] font-bold text-morandi-rose uppercase tracking-widest mb-1">支出</span>
               <span className="text-morandi-rose font-bold font-serif-num text-lg">{formatCurrency(summary.expense)}</span>
            </div>
            <div className="bg-morandi-blueLight/20 p-4 rounded-2xl border border-morandi-blue/20 flex flex-col items-center justify-center">
               <span className="text-[10px] font-bold text-morandi-blue uppercase tracking-widest mb-1">結餘</span>
               <span className="text-morandi-blue font-bold font-serif-num text-lg">{formatCurrency(summary.balance)}</span>
            </div>
         </div>

         {/* Mini Trend Chart */}
         <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
            <div className="flex justify-between items-center mb-2 px-2">
               <h3 className="text-xs font-bold font-serif text-ink-400">支出趨勢</h3>
               <span className="text-[10px] text-ink-300 font-serif">
                 {viewMode === 'month' ? '每日' : '每月'}累計
               </span>
            </div>
            <div className="h-[100px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8A4A4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#C8A4A4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                     cursor={{ stroke: '#C8A4A4', strokeWidth: 1, strokeDasharray: '3 3' }}
                     content={({ active, payload }) => {
                       if (active && payload && payload.length) {
                         return (
                           <div className="bg-ink-900 text-white text-xs px-2 py-1 rounded shadow-lg font-serif-num">
                             ${payload[0].value}
                           </div>
                         );
                       }
                       return null;
                     }}
                  />
                  <XAxis dataKey="key" hide />
                  <Area type="monotone" dataKey="value" stroke="#C8A4A4" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Transaction List */}
         <div className="space-y-4">
            {Object.keys(groupedTransactions).length === 0 ? (
               <div className="text-center py-10 opacity-40">
                  <div className="w-16 h-16 bg-stone-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                     <CalendarIcon className="text-stone-400" />
                  </div>
                  <p className="font-serif text-sm">本期間無交易紀錄</p>
               </div>
            ) : (
               Object.keys(groupedTransactions).map(dateKey => (
                 <div key={dateKey} className="animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-2 px-1">
                       <span className="text-sm font-bold font-serif text-ink-900">
                          {format(new Date(dateKey), 'dd')} 日
                       </span>
                       <span className="text-xs text-ink-400 font-serif">
                          週{getChineseWeekDay(dateKey)}
                       </span>
                       <div className="h-px bg-stone-100 flex-1 ml-2"></div>
                    </div>
                    
                    <div className="space-y-2">
                       {groupedTransactions[dateKey].map(t => (
                         <div 
                           key={t.id}
                           onClick={() => openModal(t)}
                           className="group bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer hover:border-morandi-blue/30"
                         >
                            <div className="flex items-center gap-4">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm transition-transform group-hover:scale-105 ${t.type === 'income' ? 'bg-ink-800' : 'bg-morandi-rose'}`}>
                                  {getCategoryIcon(t.category)}
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-sm font-bold text-ink-900 font-serif">{t.category}</span>
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
               ))
            )}
         </div>
      </div>

      {/* Mobile Quick Input (Fixed Bottom) */}
      <QuickInput mobile />

      {/* Floating Add Button (Secondary) */}
      <button 
         onClick={() => openModal()}
         className="fixed bottom-24 right-4 md:right-8 md:bottom-10 w-14 h-14 bg-ink-900 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30 ring-4 ring-paper"
      >
         <Plus size={24} />
      </button>

      {/* === Add/Edit Modal === */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink-900/60 backdrop-blur-sm animate-fade-in p-0 md:p-4">
           <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-white shrink-0">
                 <h3 className="font-bold text-ink-900 text-lg font-serif">
                   {editingId ? '編輯紀錄' : '新增紀錄'}
                 </h3>
                 <div className="flex gap-2">
                   {editingId && (
                     <button onClick={handleDelete} className="p-2 text-morandi-rose hover:bg-morandi-roseLight rounded-full transition-colors">
                       <Trash2 size={20} />
                     </button>
                   )}
                   <button onClick={() => setIsModalOpen(false)} className="p-2 text-ink-400 hover:bg-stone-100 rounded-full transition-colors">
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

                 {/* Amount Input */}
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

                 {/* Account Selection */}
                 <div className="mb-6">
                    <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">帳戶 (Account)</label>
                    <div className="relative">
                       <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink-400 pointer-events-none">
                         <Wallet size={18} />
                       </div>
                       <select 
                         value={formAccountId}
                         onChange={e => setFormAccountId(e.target.value)}
                         className="w-full bg-white border border-stone-200 pl-10 pr-4 py-3 rounded-xl text-sm font-bold text-ink-900 focus:outline-none focus:border-morandi-blue appearance-none"
                       >
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
                            <div className={`${formCategory === c ? 'text-ink-900' : 'text-ink-300'}`}>{getCategoryIcon(c)}</div>
                            <span className="text-[10px] font-medium">{c}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Extra Details */}
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

                 <button onClick={handleSave} className="w-full mt-8 py-4 bg-ink-900 text-white rounded-2xl font-bold shadow-lg shadow-ink-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <Check size={20} /> {editingId ? '儲存變更' : '完成記帳'}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Ledger;