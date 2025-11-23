
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { MOCK_TRANSACTIONS, TRANSACTION_CATEGORIES, COLORS } from '../constants';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Tag, FileText, Trash2, X, Coffee, ShoppingBag, Home, Bus, HeartPulse, Briefcase, Zap, Gift, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { 
  format, isSameDay, isSameWeek, isSameMonth, isSameYear, parseISO, 
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval,
  getYear
} from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface LedgerProps {
  isPrivacyMode: boolean;
}

type ViewMode = 'day' | 'week' | 'month' | 'year';

const Ledger: React.FC<LedgerProps> = ({ isPrivacyMode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Form State
  const [newType, setNewType] = useState<TransactionType>('expense');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState(TRANSACTION_CATEGORIES.expense[0]);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNote, setNewNote] = useState('');

  // --- NAVIGATION HELPERS ---
  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate(d => subDays(d, 1));
    if (viewMode === 'week') setCurrentDate(d => subWeeks(d, 1));
    if (viewMode === 'month') setCurrentDate(d => subMonths(d, 1));
    if (viewMode === 'year') setCurrentDate(d => subMonths(d, 12));
  };

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(d => addDays(d, 1));
    if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1));
    if (viewMode === 'month') setCurrentDate(d => addMonths(d, 1));
    if (viewMode === 'year') setCurrentDate(d => addMonths(d, 12));
  };

  const dateRangeLabel = useMemo(() => {
    if (viewMode === 'day') return format(currentDate, 'yyyy年 MM月 dd日 (eee)', { locale: zhTW });
    if (viewMode === 'month') return format(currentDate, 'yyyy年 MM月', { locale: zhTW });
    if (viewMode === 'year') return format(currentDate, 'yyyy年', { locale: zhTW });
    
    // Week
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(start, 'MM/dd')} - ${format(end, 'MM/dd')}`;
  }, [currentDate, viewMode]);

  // --- FILTERING LOGIC ---
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const tDate = parseISO(t.date);
        
        // 1. Time Filter
        let isTimeMatch = false;
        if (viewMode === 'day') isTimeMatch = isSameDay(tDate, currentDate);
        else if (viewMode === 'week') isTimeMatch = isSameWeek(tDate, currentDate, { weekStartsOn: 1 });
        else if (viewMode === 'month') isTimeMatch = isSameMonth(tDate, currentDate);
        else if (viewMode === 'year') isTimeMatch = isSameYear(tDate, currentDate);
        
        if (!isTimeMatch) return false;

        // 2. Category Filter
        if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentDate, viewMode, selectedCategory]);

  // Group by Date for Display
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
        // Just date string YYYY-MM-DD
        const dateKey = t.date; 
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // Calculations
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  // --- ACTIONS ---
  const handleAddTransaction = () => {
    if (!newAmount) return;
    
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: newType,
      amount: parseFloat(newAmount),
      category: newCategory,
      date: newDate,
      note: newNote
    };

    setTransactions([newTransaction, ...transactions]);
    setIsModalOpen(false);
    setNewAmount('');
    setNewNote('');
  };

  const handleDelete = (id: string) => {
    if (confirm('確定要撕掉這頁紀錄嗎？')) {
      setTransactions(transactions.filter(t => t.id !== id));
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

  return (
    <div className="space-y-6 animate-fade-in relative pb-24 max-w-4xl mx-auto">
      
      {/* --- STICKY HEADER (Date & Filters) --- */}
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-sm pb-4 pt-1 transition-all space-y-4">
        
        {/* Row 1: Date Navigation */}
        <div className="bg-white rounded-2xl p-4 shadow-paper border border-stone-100 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* View Mode Switcher */}
          <div className="flex bg-paper p-1 rounded-xl">
             {(['day', 'week', 'month', 'year'] as const).map(mode => (
               <button
                 key={mode}
                 onClick={() => { setViewMode(mode); setCurrentDate(new Date()); }}
                 className={`px-4 py-1.5 rounded-lg text-sm font-serif transition-all ${
                   viewMode === mode 
                     ? 'bg-white text-morandi-blue shadow-sm font-bold' 
                     : 'text-ink-400 hover:text-ink-800'
                 }`}
               >
                 {mode === 'day' ? '日' : mode === 'week' ? '週' : mode === 'month' ? '月' : '年'}
               </button>
             ))}
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-4">
             <button onClick={handlePrev} className="p-2 hover:bg-paper rounded-full text-ink-400 hover:text-morandi-blue transition-colors">
                <ChevronLeft size={20} />
             </button>
             <span className="font-serif font-bold text-ink-900 text-lg min-w-[140px] text-center">
               {dateRangeLabel}
             </span>
             <button onClick={handleNext} className="p-2 hover:bg-paper rounded-full text-ink-400 hover:text-morandi-blue transition-colors">
                <ChevronRight size={20} />
             </button>
          </div>

          {/* Add Button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-morandi-blue hover:bg-ink-900 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors"
          >
             <Plus size={20} />
          </button>
        </div>

        {/* Row 2: Category Chips (Sticky along with header) */}
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
               {cat === 'All' ? '全部標籤' : cat}
             </button>
           ))}
        </div>
      </div>

      {/* --- SUMMARY CARDS --- */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white p-4 rounded-xl shadow-paper border border-stone-100 flex flex-col justify-center items-center text-center">
           <span className="text-xs font-serif text-ink-400 mb-1">總收入</span>
           <span className="text-lg md:text-xl font-serif-num font-bold text-morandi-sage">{formatCurrency(summary.income)}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-paper border border-stone-100 flex flex-col justify-center items-center text-center">
           <span className="text-xs font-serif text-ink-400 mb-1">總支出</span>
           <span className="text-lg md:text-xl font-serif-num font-bold text-morandi-rose">{formatCurrency(summary.expense)}</span>
        </div>
        <div className="bg-morandi-blue/10 p-4 rounded-xl border border-morandi-blue/20 flex flex-col justify-center items-center text-center">
           <span className="text-xs font-serif text-morandi-blue mb-1">結餘</span>
           <span className="text-lg md:text-xl font-serif-num font-bold text-morandi-blue">{formatCurrency(summary.balance)}</span>
        </div>
      </div>

      {/* --- LEDGER LIST (GROUPED BY DATE) --- */}
      <div className="relative min-h-[400px]">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-px border-l border-dashed border-stone-300 hidden md:block"></div>
        
        {Object.keys(groupedTransactions).length === 0 ? (
           <div className="flex flex-col items-center justify-center pt-20 text-ink-300 gap-3">
              <FileText size={48} className="opacity-20" />
              <p className="font-serif italic">這一頁是空白的，去喝杯咖啡吧...</p>
           </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedTransactions).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateKey => (
              <div key={dateKey} className="relative">
                 {/* Date Header */}
                 <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 text-center hidden md:block">
                       <div className="text-xs font-serif font-bold text-ink-400 uppercase">{format(parseISO(dateKey), 'MMM')}</div>
                       <div className="text-lg font-serif-num font-bold text-ink-900">{format(parseISO(dateKey), 'dd')}</div>
                    </div>
                    <div className="md:hidden bg-paper px-3 py-1 rounded-lg text-sm font-bold font-serif text-ink-500 border border-stone-200">
                       {format(parseISO(dateKey), 'MM/dd (eee)', { locale: zhTW })}
                    </div>
                    <div className="h-px bg-stone-200 flex-1"></div>
                 </div>
                 
                 {/* Transactions for this date */}
                 <div className="space-y-3 pl-0 md:pl-16">
                    {groupedTransactions[dateKey].map(t => (
                      <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                         <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                t.type === 'income' ? 'bg-morandi-sageLight text-morandi-sage' : 'bg-morandi-roseLight text-morandi-rose'
                            }`}>
                               {getCategoryIcon(t.category)}
                            </div>
                            <div>
                               <div className="font-bold text-ink-900 text-sm font-serif">{t.category}</div>
                               {t.note && <div className="text-xs text-ink-400 font-serif">{t.note}</div>}
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                             <div className={`font-serif-num font-bold ${t.type === 'income' ? 'text-morandi-sage' : 'text-ink-900'}`}>
                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                             </div>
                             <button onClick={() => handleDelete(t.id)} className="text-stone-300 hover:text-morandi-rose opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                             </button>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/20 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
              <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-paper">
                 <h3 className="font-bold text-ink-900 text-lg font-serif">寫入手帳</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-ink-400 hover:text-ink-900">
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
                   onClick={handleAddTransaction}
                   className="w-full bg-ink-900 hover:bg-ink-800 text-white font-bold py-4 rounded-xl mt-2 transition-colors font-serif shadow-lg"
                 >
                   確認寫入
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
