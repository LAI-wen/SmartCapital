
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { MOCK_TRANSACTIONS, TRANSACTION_CATEGORIES, COLORS } from '../constants';
import * as api from '../services/api';
import { Plus, DollarSign, Calendar, Tag, FileText, Trash2, X, Coffee, ShoppingBag, Home, Bus, HeartPulse, Briefcase, TrendingUp, Gift, ChevronLeft, ChevronRight, BarChart2, ChevronDown, ChevronUp, CalendarDays, PenTool, ReceiptText, Info } from 'lucide-react';
import { 
  format, isSameDay, isSameWeek, isSameMonth, isSameYear, parseISO, 
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, getDate
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface LedgerProps {
  isPrivacyMode: boolean;
  transactions: Transaction[];
}

type ViewMode = 'day' | 'week' | 'month' | 'year' | 'calendar';

const Ledger: React.FC<LedgerProps> = ({ isPrivacyMode, transactions: userTransactions }) => {
  // 使用真實資料，如果沒有則回退到 Mock 資料（Demo 模式）
  const [transactions, setTransactions] = useState<Transaction[]>(
    userTransactions.length > 0 ? userTransactions : MOCK_TRANSACTIONS
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showStats, setShowStats] = useState(true);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Scroll & Header State
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);

  // Form State
  const [newType, setNewType] = useState<TransactionType>('expense');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState(TRANSACTION_CATEGORIES.expense[0]);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNote, setNewNote] = useState('');
  
  // 快速記帳狀態
  const [quickAmount, setQuickAmount] = useState('');
  
  // 最近使用的分類（從交易記錄中提取）
  const recentCategories = useMemo(() => {
    const categoryCount = new Map<string, number>();
    transactions.slice(0, 20).forEach(t => {
      categoryCount.set(t.category, (categoryCount.get(t.category) || 0) + 1);
    });
    return Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);
  }, [transactions]);

  // 只在初始化時同步真實交易資料，之後由本地狀態管理
  useEffect(() => {
    if (userTransactions.length > 0) {
      setTransactions(userTransactions);
    }
  }, []); // 移除 userTransactions 依賴，避免覆蓋本地操作

  // --- SCROLL DETECTION ---
  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (!scrollContainer) return;
    
    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      // 只有在頂部(<50px)時展開，否則收合
      if (currentScrollY < 50) {
        setIsHeaderExpanded(true);
      } else {
        setIsHeaderExpanded(false);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // --- NAVIGATION HELPERS ---
  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate(d => subDays(d, 1));
    if (viewMode === 'week') setCurrentDate(d => subWeeks(d, 1));
    if (viewMode === 'month' || viewMode === 'calendar') setCurrentDate(d => subMonths(d, 1));
    if (viewMode === 'year') setCurrentDate(d => subMonths(d, 12));
  };

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(d => addDays(d, 1));
    if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1));
    if (viewMode === 'month' || viewMode === 'calendar') setCurrentDate(d => addMonths(d, 1));
    if (viewMode === 'year') setCurrentDate(d => addMonths(d, 12));
  };

  const dateRangeLabel = useMemo(() => {
    if (viewMode === 'day') return format(currentDate, 'yyyy年 MM月 dd日 (eee)', { locale: zhTW });
    if (viewMode === 'month' || viewMode === 'calendar') return format(currentDate, 'yyyy年 MM月', { locale: zhTW });
    if (viewMode === 'year') return format(currentDate, 'yyyy年', { locale: zhTW });
    
    // Week
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(start, 'MM/dd')} - ${format(end, 'MM/dd')}`;
  }, [currentDate, viewMode]);

  // --- DATA PROCESSING ---

  // 1. Filter Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const tDate = parseISO(t.date);
        
        // Time Filter (Same logic for list views)
        let isTimeMatch = false;
        if (viewMode === 'day') isTimeMatch = isSameDay(tDate, currentDate);
        else if (viewMode === 'week') isTimeMatch = isSameWeek(tDate, currentDate, { weekStartsOn: 1 });
        else if (viewMode === 'month' || viewMode === 'calendar') isTimeMatch = isSameMonth(tDate, currentDate);
        else if (viewMode === 'year') isTimeMatch = isSameYear(tDate, currentDate);
        
        if (!isTimeMatch) return false;

        // Category Filter
        if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentDate, viewMode, selectedCategory]);

  // 2. Group by Date for List
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
        // 只取日期部分 YYYY-MM-DD，移除時間戳
        const dateKey = t.date.split('T')[0];
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // 3. Summary Stats
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  // 4. Chart Data
  const chartData = useMemo(() => {
    if (viewMode === 'day' || viewMode === 'calendar') return [];
    
    let start, end, intervalFn, formatLabel;
    
    if (viewMode === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
      intervalFn = eachDayOfInterval;
      formatLabel = (d: Date) => format(d, 'EEE', { locale: zhTW }); 
    } else if (viewMode === 'month') {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
      intervalFn = eachDayOfInterval;
      formatLabel = (d: Date) => format(d, 'dd'); 
    } else { // year
      start = new Date(currentDate.getFullYear(), 0, 1);
      end = new Date(currentDate.getFullYear(), 11, 31);
      intervalFn = eachMonthOfInterval;
      formatLabel = (d: Date) => format(d, 'MMM'); 
    }

    const intervals = intervalFn({ start, end });
    
    return intervals.map(date => {
      let income = 0;
      let expense = 0;

      transactions.forEach(t => {
        const tDate = parseISO(t.date);
        let match = false;
        if (viewMode === 'year') {
           match = isSameMonth(date, tDate);
        } else {
           match = isSameDay(date, tDate);
        }
        
        if (match) {
           if (t.type === 'income') income += t.amount;
           else expense += t.amount;
        }
      });

      return {
        name: formatLabel(date),
        income,
        expense
      };
    });
  }, [transactions, currentDate, viewMode]);

  // --- ACTIONS ---
  const handleAddTransaction = async () => {
    if (!newAmount) return;
    
    // 樂觀更新：先建立臨時交易
    const tempTransaction: Transaction = {
      id: `temp-${Date.now()}`,
      type: newType,
      amount: parseFloat(newAmount),
      category: newCategory,
      date: newDate,
      note: newNote
    };
    
    setTransactions(prev => [tempTransaction, ...prev]);
    setIsModalOpen(false);
    setNewAmount('');
    setNewNote('');
    
    // 調用後端 API 新增交易記錄
    const createdTransaction = await api.createTransaction(
      newType,
      parseFloat(newAmount),
      newCategory,
      newDate,
      newNote
    );
    
    if (createdTransaction) {
      // 用真實 ID 替換臨時交易
      setTransactions(prev => prev.map(t => 
        t.id === tempTransaction.id ? createdTransaction : t
      ));
    } else {
      console.error('新增失敗，但保留本地顯示');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setNewType(transaction.type);
    setNewAmount(transaction.amount.toString());
    setNewCategory(transaction.category);
    setNewDate(transaction.date.split('T')[0]);
    setNewNote(transaction.note || '');
    setIsModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!newAmount || !editingTransaction) return;
    
    const updatedTransaction: Transaction = {
      ...editingTransaction,
      type: newType,
      amount: parseFloat(newAmount),
      category: newCategory,
      date: newDate,
      note: newNote
    };
    
    // 樂觀更新 UI
    setTransactions(prev => prev.map(t => 
      t.id === editingTransaction.id ? updatedTransaction : t
    ));
    
    setIsModalOpen(false);
    setEditingTransaction(null);
    setNewAmount('');
    setNewNote('');
    
    // TODO: 實作後端編輯 API
    // const success = await api.updateTransaction(updatedTransaction.id, updatedTransaction);
    console.log('編輯功能：等待後端 API 實作');
  };

  const handleDelete = async (id: string) => {
    if (confirm('確定要撕掉這頁紀錄嗎？')) {
      // 先樂觀更新 UI
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      // 調用後端 API 刪除交易記錄
      const success = await api.deleteTransaction(id);
      
      if (!success) {
        // API 失敗時，重新獲取資料恢復正確狀態
        console.error('刪除失敗，請重新整理頁面');
        // 可選：顯示錯誤提示給用戶
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setNewAmount('');
    setNewNote('');
  };
  
  // 快速記帳：按 Enter 直接記錄（使用最近分類）
  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAmount) {
      const amount = parseFloat(quickAmount);
      if (isNaN(amount) || amount <= 0) return;
      
      // 使用最近最常用的分類，或預設分類
      const defaultCategory = recentCategories[0] || TRANSACTION_CATEGORIES.expense[0];
      
      // 樂觀更新
      const tempTransaction: Transaction = {
        id: `temp-${Date.now()}`,
        type: 'expense',
        amount,
        category: defaultCategory,
        date: new Date().toISOString(),
        note: ''
      };
      
      setTransactions(prev => [tempTransaction, ...prev]);
      setQuickAmount('');
      
      // 調用 API
      const createdTransaction = await api.createTransaction(
        'expense',
        amount,
        defaultCategory,
        new Date().toISOString().split('T')[0],
        ''
      );
      
      if (createdTransaction) {
        setTransactions(prev => prev.map(t => 
          t.id === tempTransaction.id ? createdTransaction : t
        ));
      }
    }
  };
  
  // 快速記帳使用指定分類
  const handleQuickAddWithCategory = async (category: string) => {
    if (!quickAmount) return;
    
    const amount = parseFloat(quickAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    const tempTransaction: Transaction = {
      id: `temp-${Date.now()}`,
      type: 'expense',
      amount,
      category,
      date: new Date().toISOString(),
      note: ''
    };
    
    setTransactions(prev => [tempTransaction, ...prev]);
    setQuickAmount('');
    
    const createdTransaction = await api.createTransaction(
      'expense',
      amount,
      category,
      new Date().toISOString().split('T')[0],
      ''
    );
    
    if (createdTransaction) {
      setTransactions(prev => prev.map(t => 
        t.id === tempTransaction.id ? createdTransaction : t
      ));
    }
  };

  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '••••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('飲食')) return <Coffee size={18} />;
    if (category.includes('購物')) return <ShoppingBag size={18} />;
    if (category.includes('房') || category.includes('居住')) return <Home size={18} />;
    if (category.includes('交通')) return <Bus size={18} />;
    if (category.includes('醫')) return <HeartPulse size={18} />;
    if (category.includes('薪') || category.includes('兼職')) return <Briefcase size={18} />;
    if (category.includes('資')) return <TrendingUp size={18} />;
    if (category.includes('娛樂')) return <Gift size={18} />;
    return <Tag size={18} />;
  };

  const allCategories = ['All', ...TRANSACTION_CATEGORIES.expense, ...TRANSACTION_CATEGORIES.income];

  // --- CALENDAR RENDERER ---
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white rounded-2xl shadow-paper border border-stone-100 p-2 animate-fade-in">
        {/* Week Headers */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] text-ink-400 font-serif font-bold uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            
            // Calculate stats for this day
            let dayIncome = 0;
            let dayExpense = 0;
            transactions.forEach(t => {
              if (isSameDay(parseISO(t.date), day)) {
                if (t.type === 'income') dayIncome += t.amount;
                else dayExpense += t.amount;
              }
            });

            return (
              <div 
                key={day.toString()}
                onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                className={`
                  aspect-[4/5] md:aspect-square rounded-xl p-1 md:p-2 border transition-all cursor-pointer relative flex flex-col justify-between
                  ${isCurrentMonth ? 'bg-white hover:border-morandi-blue/50' : 'bg-stone-50/50 text-ink-300 border-transparent'}
                  ${isToday ? 'ring-1 ring-morandi-blue ring-offset-2' : 'border-stone-50'}
                `}
              >
                <div className={`text-xs font-serif-num font-bold text-center ${isToday ? 'text-morandi-blue' : isCurrentMonth ? 'text-ink-900' : 'text-ink-300'}`}>
                  {getDate(day)}
                </div>
                
                {/* Dots / Indicators */}
                <div className="flex flex-col gap-0.5 items-center justify-end h-full pb-1">
                  {dayIncome > 0 && (
                     <div className="flex items-center gap-0.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-morandi-sage"></div>
                       <span className="text-[8px] font-serif-num text-morandi-sage hidden md:block">+{dayIncome >= 1000 ? (dayIncome/1000).toFixed(1) + 'k' : dayIncome}</span>
                     </div>
                  )}
                  {dayExpense > 0 && (
                     <div className="flex items-center gap-0.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-morandi-rose"></div>
                       <span className="text-[8px] font-serif-num text-morandi-rose hidden md:block">-{dayExpense >= 1000 ? (dayExpense/1000).toFixed(1) + 'k' : dayExpense}</span>
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in relative pb-24 max-w-4xl mx-auto">
      
      {/* --- QUICK ADD INPUT --- */}
      <div className="sticky top-0 z-30 bg-white shadow-md rounded-b-2xl border-b border-stone-200 overflow-hidden">
        <div className="p-4">
          <div className="relative">
            <input 
              type="number"
              value={quickAmount}
              onChange={(e) => setQuickAmount(e.target.value)}
              onKeyPress={handleQuickAdd}
              placeholder="快速記帳：輸入金額按 Enter ⏎"
              className="w-full text-2xl md:text-3xl font-serif-num py-3 px-4 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-morandi-blue transition-colors bg-paper placeholder:text-ink-300"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-300">
              <DollarSign size={28} />
            </div>
          </div>
          
          {/* 常用分類快捷按鈕 */}
          {recentCategories.length > 0 && (
            <div className="flex gap-2 mt-3">
              <span className="text-xs text-ink-400 self-center mr-1">常用：</span>
              {recentCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleQuickAddWithCategory(cat)}
                  disabled={!quickAmount}
                  className="px-3 py-1.5 rounded-full bg-morandi-blueLight text-morandi-blue text-xs font-medium hover:bg-morandi-blue hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 rounded-full bg-paper border border-stone-200 text-ink-600 text-xs font-medium hover:bg-stone-100 transition-all ml-auto"
              >
                更多選項 +
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* --- STICKY HEADER --- */}
      <div className={`sticky top-[120px] z-20 bg-paper/95 backdrop-blur-sm transition-all duration-300 border-stone-200/50 ${isHeaderExpanded ? 'pt-2 pb-2' : 'pt-0 pb-0 border-b shadow-sm'}`}>
        
        {/* Collapsible Section 1: View Switcher */}
        <div className={`overflow-hidden transition-all duration-300 ${isHeaderExpanded ? 'max-h-16 opacity-100 mb-3' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="flex bg-paper p-1 rounded-xl justify-center shadow-inner border border-stone-100">
             {(['day', 'week', 'month', 'year'] as const).map(mode => (
               <button
                 key={mode}
                 onClick={() => { setViewMode(mode); setCurrentDate(new Date()); }}
                 className={`flex-1 px-3 py-2 rounded-lg text-xs font-serif transition-all ${
                   viewMode === mode 
                     ? 'bg-white text-morandi-blue shadow-sm font-bold border border-stone-100' 
                     : 'text-ink-400 hover:text-ink-800'
                 }`}
               >
                 {mode === 'day' ? '日' : mode === 'week' ? '週' : mode === 'month' ? '月' : '年'}
               </button>
             ))}
             {/* Calendar Mode Button */}
             <button
                 onClick={() => { setViewMode('calendar'); setCurrentDate(new Date()); }}
                 className={`flex-1 px-3 py-2 rounded-lg text-xs font-serif transition-all flex items-center justify-center gap-1 ${
                   viewMode === 'calendar' 
                     ? 'bg-white text-morandi-blue shadow-sm font-bold border border-stone-100' 
                     : 'text-ink-400 hover:text-ink-800'
                 }`}
               >
                 <CalendarDays size={14} /> 月曆
             </button>
          </div>
        </div>

        {/* Persistent Section: Date Nav & Actions */}
        <div className="bg-white rounded-2xl p-2 px-3 shadow-soft border border-stone-100 flex justify-between items-center gap-2">
          
          {/* Date Nav */}
          <div className="flex items-center gap-1">
             <button onClick={handlePrev} className="p-2 hover:bg-paper rounded-lg text-ink-400 hover:text-morandi-blue transition-colors">
                <ChevronLeft size={20} />
             </button>
             <span className="font-serif font-bold text-ink-900 text-sm md:text-lg min-w-[100px] text-center px-2 truncate">
               {dateRangeLabel}
             </span>
             <button onClick={handleNext} className="p-2 hover:bg-paper rounded-lg text-ink-400 hover:text-morandi-blue transition-colors">
                <ChevronRight size={20} />
             </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={() => setShowStats(!showStats)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                showStats 
                  ? 'bg-ink-100 text-morandi-blue border-ink-200' 
                  : 'bg-white text-ink-400 border-stone-100 hover:bg-paper'
              }`}
            >
               <BarChart2 size={18} />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-morandi-blue hover:bg-ink-900 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-colors border border-transparent"
            >
               <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Collapsible Section 2: Category Filters */}
        <div className={`overflow-hidden transition-all duration-300 ${isHeaderExpanded ? 'max-h-16 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}`}>
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
        </div>
      </div>

      {/* --- COLLAPSIBLE STATS SECTION (Hidden in Calendar Mode by default or user toggle) --- */}
      {viewMode !== 'calendar' && (
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showStats ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          
          {/* Summary Cards */}
          <div className="md:col-span-3 grid grid-cols-3 gap-4">
             <div className="bg-white p-3 md:p-4 rounded-2xl shadow-paper border border-stone-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-12 h-12 bg-morandi-sageLight rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                   <div className="text-[10px] md:text-xs font-serif text-ink-400 mb-1 flex items-center gap-1"><TrendingUp size={10}/> 收入</div>
                   <div className="text-base md:text-xl font-serif-num font-bold text-morandi-sage truncate">{formatCurrency(summary.income)}</div>
                </div>
             </div>
             
             <div className="bg-white p-3 md:p-4 rounded-2xl shadow-paper border border-stone-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-12 h-12 bg-morandi-roseLight rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                   <div className="text-[10px] md:text-xs font-serif text-ink-400 mb-1 flex items-center gap-1"><TrendingUp size={10} className="rotate-180"/> 支出</div>
                   <div className="text-base md:text-xl font-serif-num font-bold text-morandi-rose truncate">{formatCurrency(summary.expense)}</div>
                </div>
             </div>

             <div className="bg-white p-3 md:p-4 rounded-2xl shadow-paper border border-stone-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-12 h-12 bg-morandi-blueLight rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                   <div className="text-[10px] md:text-xs font-serif text-ink-400 mb-1 flex items-center gap-1"><DollarSign size={10}/> 結餘</div>
                   <div className={`text-base md:text-xl font-serif-num font-bold truncate ${summary.balance >= 0 ? 'text-morandi-blue' : 'text-morandi-rose'}`}>
                      {formatCurrency(summary.balance)}
                   </div>
                </div>
             </div>
          </div>

          {/* Trend Chart (Only for Week/Month/Year) */}
          {viewMode !== 'day' && (
             <div className="md:col-span-3 bg-white p-5 rounded-2xl shadow-paper border border-stone-100 h-64">
                <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-4 font-serif">收支趨勢 (Income vs Expense)</h4>
                <ResponsiveContainer width="100%" height="85%">
                   <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#78716C', fontSize: 10, fontFamily: 'Lora'}} 
                        dy={10}
                      />
                      <YAxis 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{fill: '#78716C', fontSize: 10, fontFamily: 'Lora'}} 
                         tickFormatter={(val) => `${val/1000}k`}
                      />
                      <Tooltip 
                         cursor={{ fill: '#F9F7F2' }}
                         contentStyle={{ backgroundColor: '#fff', borderColor: '#E6E2D6', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'Lora', fontSize: '12px' }}
                         formatter={(value: number) => isPrivacyMode ? '••••' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
                      />
                      <Bar dataKey="income" name="收入" fill={COLORS.profit} radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="expense" name="支出" fill={COLORS.loss} radius={[4, 4, 0, 0]} maxBarSize={40} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          )}
        </div>
        
        {/* Toggle Hint */}
        <div className="flex justify-center -mt-2 mb-4">
           <button onClick={() => setShowStats(false)} className="text-ink-300 hover:text-ink-500 transition-colors">
              <ChevronUp size={16} />
           </button>
        </div>
      </div>
      )}
      
      {/* Show Hint when hidden */}
      {!showStats && viewMode !== 'calendar' && (
        <div className="flex justify-center -mt-4 mb-4">
           <button 
             onClick={() => setShowStats(true)} 
             className="flex items-center gap-1 text-xs text-ink-400 hover:text-morandi-blue transition-colors bg-white px-3 py-1 rounded-full border border-stone-100 shadow-sm"
           >
              顯示統計圖表 <ChevronDown size={14} />
           </button>
        </div>
      )}

      {/* --- CONTENT AREA: CALENDAR OR LIST --- */}
      {viewMode === 'calendar' ? (
        renderCalendar()
      ) : (
        /* --- LEDGER LIST (GROUPED BY DATE) --- */
        <div className="relative min-h-[400px]">
          {/* Timeline Line */}
          <div className="absolute left-6 top-4 bottom-0 w-px border-l border-dashed border-stone-200 hidden md:block"></div>
          
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-12 pb-20">
                {/* 空狀態插圖 */}
                <div className="w-32 h-32 bg-gradient-to-br from-morandi-blueLight to-morandi-sandLight rounded-full flex items-center justify-center mb-6 shadow-soft">
                  <ReceiptText size={48} className="text-morandi-blue" />
                </div>
                
                {/* 標題和描述 */}
                <h3 className="text-2xl font-serif font-bold text-ink-900 mb-2">
                  還沒有記帳紀錄
                </h3>
                <p className="text-ink-400 text-center mb-8 max-w-sm">
                  開始記錄你的每一筆收入與支出<br/>
                  掌握財務，從現在開始
                </p>
                
                {/* 行動按鈕 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-morandi-blue text-white px-6 py-3 rounded-xl hover:bg-ink-900 transition-colors shadow-md font-medium"
                  >
                    <Plus size={20} />
                    開始記帳
                  </button>
                  <button 
                    onClick={() => {
                      setQuickAmount('100');
                      document.querySelector<HTMLInputElement>('input[type="number"]')?.focus();
                    }}
                    className="flex items-center gap-2 bg-white text-ink-700 px-6 py-3 rounded-xl hover:bg-paper transition-colors border border-stone-200 font-medium"
                  >
                    <DollarSign size={20} />
                    快速記帳
                  </button>
                </div>
                
                {/* 教學提示 */}
                <div className="mt-12 p-6 bg-paper rounded-2xl border border-stone-100 max-w-md">
                  <h4 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2">
                    <Info size={16} className="text-morandi-blue" />
                    快速上手
                  </h4>
                  <ul className="space-y-2 text-xs text-ink-600">
                    <li className="flex items-start gap-2">
                      <span className="text-morandi-blue mt-0.5">•</span>
                      <span><strong>頂部輸入框：</strong>輸入金額按 Enter，使用常用分類快速記帳</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-morandi-blue mt-0.5">•</span>
                      <span><strong>+ 按鈕：</strong>打開完整表單，填寫詳細資訊</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-morandi-blue mt-0.5">•</span>
                      <span><strong>LINE Bot：</strong>直接傳送金額即可記帳（例如：120）</span>
                    </li>
                  </ul>
                </div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.keys(groupedTransactions).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateKey => (
                <div key={dateKey} className="relative">
                  {/* Date Header */}
                  <div className="flex items-center gap-4 mb-4 sticky top-[200px] z-10 md:static">
                      <div className="w-12 text-center hidden md:block bg-paper pt-2 pb-2">
                        <div className="text-[10px] font-serif font-bold text-ink-400 uppercase tracking-widest">{format(parseISO(dateKey), 'MMM')}</div>
                        <div className="text-xl font-serif-num font-bold text-ink-900 leading-none">{format(parseISO(dateKey), 'dd')}</div>
                      </div>
                      
                      {/* Mobile Date Sticky Header */}
                      <div className="md:hidden flex items-center gap-2 bg-paper/90 backdrop-blur-sm px-3 py-1 rounded-r-full shadow-sm border border-l-0 border-stone-100">
                        <div className="w-2 h-2 rounded-full bg-morandi-blue"></div>
                        <span className="font-serif font-bold text-ink-800 text-sm">
                            {format(parseISO(dateKey), 'MM/dd (eee)', { locale: zhTW })}
                        </span>
                      </div>

                      <div className="h-px bg-stone-100 flex-1 ml-2 hidden md:block"></div>
                  </div>
                  
                  {/* Transactions for this date */}
                  <div className="space-y-3 pl-0 md:pl-16">
                      {groupedTransactions[dateKey].map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex items-center justify-between group hover:shadow-soft hover:border-morandi-blue/20 transition-all cursor-default">
                          <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                  t.type === 'income' ? 'bg-morandi-sageLight text-morandi-sage' : 'bg-morandi-roseLight text-morandi-rose'
                              }`}>
                                {getCategoryIcon(t.category)}
                              </div>
                              <div>
                                <div className="font-bold text-ink-900 text-sm font-serif">{t.category}</div>
                                {t.note && <div className="text-xs text-ink-400 font-serif mt-0.5">{t.note}</div>}
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className={`font-serif-num font-bold ${t.type === 'income' ? 'text-morandi-sage' : 'text-ink-900'}`}>
                                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => handleEdit(t)} 
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-stone-300 hover:text-morandi-blue hover:bg-morandi-blueLight transition-all"
                                    title="編輯"
                                  >
                                      <PenTool size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(t.id)} 
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-stone-300 hover:text-morandi-rose hover:bg-morandi-roseLight transition-all"
                                    title="刪除"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/20 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
              <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-paper">
                 <h3 className="font-bold text-ink-900 text-lg font-serif">
                   {editingTransaction ? '編輯記錄' : '寫入手帳'}
                 </h3>
                 <button onClick={handleCloseModal} className="text-ink-400 hover:text-ink-900">
                   <X size={20} />
                 </button>
              </div>
              <div className="p-6 space-y-5">
                 {/* Type Toggle */}
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { setNewType('expense'); setNewCategory(TRANSACTION_CATEGORIES.expense[0]); }}
                      className={`py-3 rounded-xl font-bold font-serif text-sm transition-all border ${
                        newType === 'expense' 
                          ? 'bg-morandi-rose text-white border-morandi-rose shadow-md' 
                          : 'bg-white text-ink-400 border-stone-200 hover:border-morandi-rose/50'
                      }`}
                    >
                      支出 (Expense)
                    </button>
                    <button 
                      onClick={() => { setNewType('income'); setNewCategory(TRANSACTION_CATEGORIES.income[0]); }}
                      className={`py-3 rounded-xl font-bold font-serif text-sm transition-all border ${
                        newType === 'income' 
                          ? 'bg-morandi-sage text-white border-morandi-sage shadow-md' 
                          : 'bg-white text-ink-400 border-stone-200 hover:border-morandi-sage/50'
                      }`}
                    >
                      收入 (Income)
                    </button>
                 </div>

                 {/* Amount */}
                 <div>
                    <label className="block text-xs font-serif text-ink-500 mb-1.5 uppercase tracking-wider">金額 Amount</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
                      <input 
                        type="number" 
                        value={newAmount} 
                        onChange={e => setNewAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-paper border border-stone-200 rounded-xl py-3.5 pl-11 text-ink-900 focus:outline-none focus:border-morandi-blue font-serif-num text-xl"
                        autoFocus
                      />
                    </div>
                 </div>

                 {/* Category */}
                 <div>
                    <label className="block text-xs font-serif text-ink-500 mb-1.5 uppercase tracking-wider">類別 Category</label>
                    <div className="relative">
                       <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
                       <select 
                         value={newCategory}
                         onChange={e => setNewCategory(e.target.value)}
                         className="w-full bg-paper border border-stone-200 rounded-xl py-3.5 pl-11 text-ink-900 focus:outline-none focus:border-morandi-blue appearance-none font-serif"
                       >
                         {TRANSACTION_CATEGORIES[newType].map(cat => (
                           <option key={cat} value={cat}>{cat}</option>
                         ))}
                       </select>
                    </div>
                 </div>

                 {/* Date */}
                 <div>
                    <label className="block text-xs font-serif text-ink-500 mb-1.5 uppercase tracking-wider">日期 Date</label>
                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
                       <input 
                         type="date"
                         value={newDate}
                         onChange={e => setNewDate(e.target.value)}
                         className="w-full bg-paper border border-stone-200 rounded-xl py-3.5 pl-11 text-ink-900 focus:outline-none focus:border-morandi-blue font-serif-num"
                       />
                    </div>
                 </div>

                 {/* Note */}
                 <div>
                    <label className="block text-xs font-serif text-ink-500 mb-1.5 uppercase tracking-wider">備註 Note</label>
                    <div className="relative">
                       <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
                       <input 
                         type="text"
                         value={newNote}
                         onChange={e => setNewNote(e.target.value)}
                         placeholder="例如：午餐、停車費"
                         className="w-full bg-paper border border-stone-200 rounded-xl py-3.5 pl-11 text-ink-900 focus:outline-none focus:border-morandi-blue font-serif"
                       />
                    </div>
                 </div>

                 <button 
                   onClick={editingTransaction ? handleSaveEdit : handleAddTransaction}
                   className="w-full bg-ink-900 hover:bg-ink-800 text-white font-bold py-4 rounded-xl mt-2 transition-colors font-serif shadow-lg"
                 >
                   {editingTransaction ? '確認修改' : '確認寫入'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
