
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { COLORS } from '../constants';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ChevronLeft, ChevronRight, CalendarDays, X as XIcon, ArrowRight } from 'lucide-react';
import { getTransactions, getAccounts, getAssets } from '../services';
import { Transaction, Account, Asset, InvestmentScope } from '../types';
import {
  parseISO,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  format,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  eachDayOfInterval,
  getDate
} from 'date-fns';

interface AnalyticsPageProps {
  isPrivacyMode: boolean;
  investmentScope: InvestmentScope;
}

type ViewMode = 'day' | 'week' | 'month' | 'year' | 'calendar';

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ isPrivacyMode, investmentScope }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'income_expense' | 'asset'>('income_expense');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter Assets based on Investment Scope
  const scopeFilteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const isTW = asset.currency === 'TWD';
      const isCrypto = asset.type === 'Crypto';
      const isUS = !isTW && !isCrypto;

      if (isTW && !investmentScope.tw) return false;
      if (isUS && !investmentScope.us) return false;
      if (isCrypto && !investmentScope.crypto) return false;
      return true;
    });
  }, [assets, investmentScope]);

  // Filter states
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Date picker modal state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [txs, accs, assts] = await Promise.all([
          getTransactions(365), // 取得最近一年的交易
          getAccounts(),
          getAssets()
        ]);
        setTransactions(txs);
        setAccounts(accs);
        setAssets(assts);
      } catch (error) {
        console.error('❌ Analytics: 載入數據失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter navigation handlers
  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === 'month' || viewMode === 'calendar') {
      setCurrentDate(subMonths(currentDate, 1));
      if (viewMode === 'calendar') setSelectedDay(null);
    }
    else if (viewMode === 'year') setCurrentDate(subYears(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === 'month' || viewMode === 'calendar') {
      setCurrentDate(addMonths(currentDate, 1));
      if (viewMode === 'calendar') setSelectedDay(null);
    }
    else if (viewMode === 'year') setCurrentDate(addYears(currentDate, 1));
  };

  // Open date picker and initialize with current date
  const handleOpenDatePicker = () => {
    setPickerYear(currentDate.getFullYear());
    setPickerMonth(currentDate.getMonth() + 1);
    setIsDatePickerOpen(true);
  };

  // Apply selected date from picker
  const handleApplyDatePicker = () => {
    const newDate = new Date(pickerYear, pickerMonth - 1, 1);
    setCurrentDate(newDate);
    if (viewMode === 'calendar') setSelectedDay(null);
    setIsDatePickerOpen(false);
  };

  // Date range label
  const dateRangeLabel = useMemo(() => {
    if (viewMode === 'day') return format(currentDate, 'yyyy-MM-dd');
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'MM/dd')} - ${format(end, 'MM/dd')}`;
    }
    if (viewMode === 'month' || viewMode === 'calendar') return format(currentDate, 'yyyy-MM');
    return format(currentDate, 'yyyy');
  }, [currentDate, viewMode]);

  // Filter transactions by time range and category
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      let isTimeMatch = false;

      if (viewMode === 'day') isTimeMatch = isSameDay(tDate, currentDate);
      else if (viewMode === 'week') isTimeMatch = isSameWeek(tDate, currentDate, { weekStartsOn: 1 });
      else if (viewMode === 'month') isTimeMatch = isSameMonth(tDate, currentDate);
      else if (viewMode === 'year') isTimeMatch = isSameYear(tDate, currentDate);

      // Category filtering
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;

      return isTimeMatch;
    });
  }, [transactions, currentDate, viewMode, selectedCategory]);

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDay) return [];

    const targetDay = parseISO(selectedDay);
    return transactions.filter(t => isSameDay(parseISO(t.date), targetDay));
  }, [transactions, selectedDay]);

  // Available categories from transactions
  const allCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return ['All', ...Array.from(cats)];
  }, [transactions]);

  // 計算近6個月的收支數據
  const monthlyData = React.useMemo(() => {
    const now = new Date();
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('zh-TW', { month: 'short' });
      const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthTxs = transactions.filter(tx => {
        const [y, m] = tx.date.split('T')[0].split('-').map(Number);
        return y === monthDate.getFullYear() && m === monthDate.getMonth() + 1;
      });

      const income = monthTxs
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const expense = monthTxs
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

      data.push({ month: monthName, income, expense });
    }

    return data;
  }, [transactions]);

  // 計算資產趨勢：從當前總資產反推，扣除/加回各月後的現金流
  const assetTrendData = React.useMemo(() => {
    const now = new Date();
    const currentAccountBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const currentAssetValue = scopeFilteredAssets.reduce((sum, asset) => sum + asset.avgPrice * asset.quantity, 0);
    const currentTotal = currentAccountBalance + currentAssetValue;

    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('zh-TW', { month: 'short' });
      const monthEndStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 2).padStart(2, '0')}-01`;

      // 該月結束後發生的現金流（正=收入，負=支出）
      const cashFlowAfter = transactions
        .filter(tx => tx.date.split('T')[0] >= monthEndStr)
        .reduce((sum, tx) => {
          if (tx.type === 'income') return sum + tx.amount;
          if (tx.type === 'expense') return sum - tx.amount;
          return sum;
        }, 0);

      // 當月底的估算淨資產 = 當前總資產 - 之後的現金流
      const netWorth = Math.max(0, currentTotal - cashFlowAfter);
      data.push({ month: monthName, netWorth });
    }
    return data;
  }, [transactions, accounts, scopeFilteredAssets]);

  // 計算當前時段支出分類數據（基於 filteredTransactions）
  const expenseCategoryData = useMemo(() => {
    const expenseTxs = filteredTransactions.filter(tx => tx.type === 'expense');

    const categoryMap: Record<string, number> = {};
    expenseTxs.forEach(tx => {
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    });

    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // 計算當前時段的收入和支出（基於 filteredTransactions）
  const currentPeriodStats = useMemo(() => {
    // 計算前一時段的交易
    let prevStart: Date, prevEnd: Date;
    if (viewMode === 'day') {
      prevStart = subDays(currentDate, 1);
      prevEnd = subDays(currentDate, 1);
    } else if (viewMode === 'week') {
      const prevWeekDate = subWeeks(currentDate, 1);
      prevStart = startOfWeek(prevWeekDate, { weekStartsOn: 1 });
      prevEnd = endOfWeek(prevWeekDate, { weekStartsOn: 1 });
    } else if (viewMode === 'month') {
      const prevMonthDate = subMonths(currentDate, 1);
      prevStart = startOfMonth(prevMonthDate);
      prevEnd = endOfMonth(prevMonthDate);
    } else {
      const prevYearDate = subYears(currentDate, 1);
      prevStart = startOfYear(prevYearDate);
      prevEnd = endOfYear(prevYearDate);
    }

    const prevPeriodTxs = transactions.filter(tx => {
      const tDate = parseISO(tx.date);
      return tDate >= prevStart && tDate <= prevEnd;
    });

    const currentIncome = filteredTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const currentExpense = filteredTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const lastIncome = prevPeriodTxs
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const lastExpense = prevPeriodTxs
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
    const expenseChange = lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0;

    return {
      currentIncome,
      currentExpense,
      incomeChange,
      expenseChange
    };
  }, [filteredTransactions, transactions, currentDate, viewMode]);

  // 計算總資產（根據投資範圍篩選）
  const totalNetWorth = React.useMemo(() => {
    const accountBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const assetValue = scopeFilteredAssets.reduce((sum, asset) => sum + asset.avgPrice * asset.quantity, 0);
    return accountBalance + assetValue;
  }, [accounts, scopeFilteredAssets]);

  // 計算總支出（用於圓餅圖）
  const totalExpense = React.useMemo(() => {
    return expenseCategoryData.reduce((sum, cat) => sum + cat.value, 0);
  }, [expenseCategoryData]);

  // 上期支出分類 map（用於環比）
  const prevPeriodCategoryMap = useMemo(() => {
    let prevStart: Date, prevEnd: Date;
    if (viewMode === 'day') { prevStart = subDays(currentDate, 1); prevEnd = subDays(currentDate, 1); }
    else if (viewMode === 'week') {
      const p = subWeeks(currentDate, 1);
      prevStart = startOfWeek(p, { weekStartsOn: 1 }); prevEnd = endOfWeek(p, { weekStartsOn: 1 });
    } else if (viewMode === 'month') {
      const p = subMonths(currentDate, 1);
      prevStart = startOfMonth(p); prevEnd = endOfMonth(p);
    } else {
      const p = subYears(currentDate, 1);
      prevStart = startOfYear(p); prevEnd = endOfYear(p);
    }
    const map: Record<string, number> = {};
    transactions.filter(tx => {
      const d = parseISO(tx.date);
      return tx.type === 'expense' && d >= prevStart && d <= prevEnd;
    }).forEach(tx => { map[tx.category] = (map[tx.category] || 0) + tx.amount; });
    return map;
  }, [transactions, currentDate, viewMode]);

  // 日均支出
  const dailyAvgExpense = useMemo(() => {
    const daysInPeriod = viewMode === 'day' ? 1
      : viewMode === 'week' ? 7
      : viewMode === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      : 365;
    return currentPeriodStats.currentExpense / daysInPeriod;
  }, [currentPeriodStats, viewMode, currentDate]);

  // 儲蓄率
  const savingsRate = useMemo(() => {
    if (currentPeriodStats.currentIncome === 0) return null;
    return ((currentPeriodStats.currentIncome - currentPeriodStats.currentExpense) / currentPeriodStats.currentIncome) * 100;
  }, [currentPeriodStats]);

  // 最高消費日
  const peakSpendDay = useMemo(() => {
    const dayMap: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      const key = t.date.split('T')[0];
      dayMap[key] = (dayMap[key] || 0) + t.amount;
    });
    const entries = Object.entries(dayMap);
    if (entries.length === 0) return null;
    const [date, amount] = entries.sort(([, a], [, b]) => b - a)[0];
    return { date: date.slice(5), amount }; // MM-DD
  }, [filteredTransactions]);

  const monthParam = format(currentDate, 'yyyy-MM');

  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '••••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // Calendar renderer
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
            const isSelected = format(day, 'yyyy-MM-dd') === selectedDay;

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
                onClick={() => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  setSelectedDay(prev => prev === dayStr ? null : dayStr);
                }}
                className={`
                  aspect-[4/5] md:aspect-square rounded-xl p-1 md:p-2 border transition-all cursor-pointer relative flex flex-col justify-between
                  ${isCurrentMonth ? 'bg-white hover:border-morandi-blue/50' : 'bg-stone-50/50 text-ink-300 border-transparent'}
                  ${isSelected ? 'ring-2 ring-morandi-blue bg-morandi-blue/5' : isToday ? 'ring-1 ring-morandi-blue ring-offset-2' : 'border-stone-50'}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 animate-fade-in">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-morandi-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-ink-400 font-serif">載入分析數據中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20 space-y-6">

      {/* Tab Switcher */}
      <div className="flex p-1 bg-stone-100 rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('income_expense')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-serif transition-all ${activeTab === 'income_expense' ? 'bg-white shadow text-ink-900' : 'text-ink-400'}`}
        >
          收支分析
        </button>
        <button
          onClick={() => setActiveTab('asset')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-serif transition-all ${activeTab === 'asset' ? 'bg-white shadow text-ink-900' : 'text-ink-400'}`}
        >
          資產成長
        </button>
      </div>

      {/* Filter Controls */}
      <div className="space-y-3">
        {/* View Mode Switcher */}
        <div className="flex bg-paper p-1 rounded-xl justify-center shadow-inner border border-stone-100">
          {(['day', 'week', 'month', 'year'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setCurrentDate(new Date()); setSelectedDay(null); }}
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
            onClick={() => { setViewMode('calendar'); setCurrentDate(new Date()); setSelectedCategory('All'); setSelectedDay(null); }}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-serif transition-all flex items-center justify-center gap-1 ${
              viewMode === 'calendar'
                ? 'bg-white text-morandi-blue shadow-sm font-bold border border-stone-100'
                : 'text-ink-400 hover:text-ink-800'
            }`}
          >
            <CalendarDays size={14} /> 月曆
          </button>
        </div>

        {/* Date Navigation */}
        <div className="bg-white rounded-2xl p-2 px-3 shadow-soft border border-stone-100 flex justify-between items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} className="p-2 hover:bg-paper rounded-lg text-ink-400 hover:text-morandi-blue transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleOpenDatePicker}
              className="font-serif font-bold text-ink-900 text-sm md:text-lg min-w-[100px] text-center px-2 truncate hover:bg-paper rounded-lg transition-colors cursor-pointer"
            >
              {dateRangeLabel}
            </button>
            <button onClick={handleNext} className="p-2 hover:bg-paper rounded-lg text-ink-400 hover:text-morandi-blue transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

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
      </div>

      {activeTab === 'income_expense' && (
        <div className="space-y-6 animate-slide-up">
          {/* Calendar View */}
          {viewMode === 'calendar' ? (
            <>
              {renderCalendar()}
              {selectedDay && (
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
                  {selectedDayTransactions.length === 0 ? (
                    <p className="text-sm text-ink-400 font-serif text-center py-4">這天沒有記錄</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayTransactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shrink-0 ${t.type === 'income' ? 'bg-morandi-sage' : t.type === 'expense' ? 'bg-morandi-rose' : 'bg-stone-400'}`}>
                              {t.category.slice(0, 1)}
                            </div>
                            <div>
                              <div className="text-sm font-serif text-ink-900">{t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}</div>
                              <div className="text-xs text-ink-400 font-serif">{t.note || '無備註'}{t.date.length > 10 ? ` · ${t.date.slice(11, 16)}` : ''}</div>
                            </div>
                          </div>
                          <div className={`font-serif-num font-bold text-sm ${t.type === 'income' ? 'text-morandi-sage' : t.type === 'expense' ? 'text-morandi-rose' : 'text-ink-400'}`}>
                            {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{isPrivacyMode ? '••••' : `$${t.amount.toLocaleString()}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Top Metrics Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  {viewMode === 'day' ? (
                    <>
                      <div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">今日交易</div>
                      <div className="text-sm font-serif-num font-bold text-ink-900">
                        {isPrivacyMode ? '••' : filteredTransactions.length} 筆
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
                <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  <div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">儲蓄率</div>
                  <div className={`text-sm font-serif-num font-bold ${savingsRate === null ? 'text-ink-400' : savingsRate >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                    {isPrivacyMode ? '••' : savingsRate === null ? '--' : `${savingsRate.toFixed(0)}%`}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  <div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">最高消費日</div>
                  <div className="text-sm font-serif-num font-bold text-ink-900">
                    {isPrivacyMode ? '••••' : peakSpendDay ? peakSpendDay.date : '--'}
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-morandi-sageLight/40 p-5 rounded-2xl border border-morandi-sage/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-morandi-sage text-white rounded-lg"><TrendingUp size={16} /></div>
                    <span className="text-xs font-bold font-serif text-morandi-sage">
                      {viewMode === 'day' ? '本日' : viewMode === 'week' ? '本週' : viewMode === 'month' ? '本月' : viewMode === 'year' ? '本年' : '本月'}收入
                    </span>
                  </div>
                  <div className="text-2xl font-serif-num font-bold text-ink-900">{formatCurrency(currentPeriodStats.currentIncome)}</div>
                  <div className="text-xs text-ink-400 mt-1 font-serif">
                    較上期 {currentPeriodStats.incomeChange >= 0 ? '+' : ''}{currentPeriodStats.incomeChange.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-morandi-roseLight/40 p-5 rounded-2xl border border-morandi-rose/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-morandi-rose text-white rounded-lg"><TrendingDown size={16} /></div>
                    <span className="text-xs font-bold font-serif text-morandi-rose">
                      {viewMode === 'day' ? '本日' : viewMode === 'week' ? '本週' : viewMode === 'month' ? '本月' : viewMode === 'year' ? '本年' : '本月'}支出
                    </span>
                  </div>
                  <div className="text-2xl font-serif-num font-bold text-ink-900">{formatCurrency(currentPeriodStats.currentExpense)}</div>
                  <div className="text-xs text-ink-400 mt-1 font-serif">
                    較上期 {currentPeriodStats.expenseChange >= 0 ? '+' : ''}{currentPeriodStats.expenseChange.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-ink-900 font-serif">近半年收支趨勢</h3>
                  <button className="text-xs text-ink-400 border border-stone-200 px-2 py-1 rounded font-serif">最近 6 個月</button>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D6" />
                      <XAxis dataKey="month" stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                      <Tooltip
                        cursor={{ fill: '#F5F5F4' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null;
                          const income = payload.find(p => p.dataKey === 'income')?.value as number ?? 0;
                          const expense = payload.find(p => p.dataKey === 'expense')?.value as number ?? 0;
                          return (
                            <div className="bg-white rounded-xl shadow-lg border border-stone-100 p-3 text-xs font-serif min-w-[120px]">
                              <div className="font-bold text-ink-900 mb-2">{label}</div>
                              <div className="flex justify-between gap-4 text-morandi-sage mb-1">
                                <span>收入</span><span className="font-serif-num font-bold">${income.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-morandi-rose">
                                <span>支出</span><span className="font-serif-num font-bold">${expense.toLocaleString()}</span>
                              </div>
                              {income - expense !== 0 && (
                                <div className={`flex justify-between gap-4 mt-2 pt-2 border-t border-stone-100 font-bold ${income >= expense ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                                  <span>結餘</span><span className="font-serif-num">${Math.abs(income - expense).toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="income" fill={COLORS.profit} radius={[4, 4, 0, 0]} name="收入" />
                      <Bar dataKey="expense" fill={COLORS.loss} radius={[4, 4, 0, 0]} name="支出" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Pie */}
              <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
                <h3 className="font-bold text-ink-900 font-serif mb-6">
                  {viewMode === 'day' ? '本日' : viewMode === 'week' ? '本週' : viewMode === 'month' ? '本月' : viewMode === 'year' ? '本年' : '本月'}支出類別
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-48 h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expenseCategoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {expenseCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} stroke="none" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-ink-400 font-serif">總支出</span>
                      <span className="text-lg font-bold font-serif-num text-ink-900">{formatCurrency(totalExpense)}</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    {expenseCategoryData.length === 0 ? (
                      <div className="text-center text-sm text-ink-400 font-serif py-4">
                        {viewMode === 'day' ? '本日' : viewMode === 'week' ? '本週' : viewMode === 'month' ? '本月' : viewMode === 'year' ? '本年' : '本月'}尚無支出記錄
                      </div>
                    ) : (
                      expenseCategoryData.sort((a, b) => b.value - a.value).map((item, idx) => {
                        const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
                        const prev = prevPeriodCategoryMap[item.name] || 0;
                        const change = prev > 0 ? ((item.value - prev) / prev) * 100 : null;
                        const color = COLORS.chart[idx % COLORS.chart.length];
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
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'asset' && (
        <div className="space-y-6 animate-slide-up">
           {/* Net Worth Card */}
           <div className="bg-gradient-to-br from-morandi-blue to-ink-800 p-6 rounded-2xl text-white shadow-soft relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
               <h3 className="text-sm font-serif opacity-80 mb-1">目前淨資產</h3>
               <div className="text-4xl font-serif-num font-bold tracking-tight mb-4">
                 {formatCurrency(totalNetWorth)}
               </div>
               <div className="flex items-center gap-4 text-sm">
                  <div className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                     <TrendingUp size={14} />
                     {assetTrendData.length >= 2 && assetTrendData[0].netWorth > 0
                       ? `${(((assetTrendData[assetTrendData.length - 1].netWorth - assetTrendData[0].netWorth) / assetTrendData[0].netWorth) * 100).toFixed(1)}%`
                       : '0%'}
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                     <Calendar size={14} /> {new Date().getFullYear()}年
                  </div>
               </div>
           </div>

           {/* Trend Area Chart */}
           <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-ink-900 font-serif">資產累積趨勢</h3>
             </div>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={assetTrendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.brand} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.brand} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D6" />
                    <XAxis dataKey="month" stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/10000}w`} domain={['dataMin - 100000', 'auto']} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const val = payload[0].value as number;
                        return (
                          <div className="bg-white rounded-xl shadow-lg border border-stone-100 p-3 text-xs font-serif">
                            <div className="font-bold text-ink-900 mb-1">{label}</div>
                            <div className="text-morandi-blue font-serif-num font-bold text-sm">${val.toLocaleString()}</div>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="netWorth" stroke={COLORS.brand} strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" name="淨資產" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 animate-slide-up">
            <div className="p-6">
              <h3 className="text-xl font-bold text-ink-900 font-serif mb-6 text-center">選擇月份</h3>

              {/* Year Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">年份</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPickerYear(pickerYear - 1)}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} className="text-ink-600" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold font-serif-num text-ink-900">{pickerYear}</span>
                  </div>
                  <button
                    onClick={() => setPickerYear(pickerYear + 1)}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <ChevronRight size={20} className="text-ink-600" />
                  </button>
                </div>
              </div>

              {/* Month Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">月份</label>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <button
                      key={month}
                      onClick={() => setPickerMonth(month)}
                      className={`py-3 rounded-xl text-sm font-bold font-serif transition-all ${
                        pickerMonth === month
                          ? 'bg-morandi-blue text-white shadow-md'
                          : 'bg-stone-50 text-ink-600 hover:bg-stone-100'
                      }`}
                    >
                      {month}月
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDatePickerOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-ink-600 font-bold hover:bg-stone-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleApplyDatePicker}
                  className="flex-1 py-3 rounded-xl bg-morandi-blue text-white font-bold hover:bg-opacity-90 transition-all shadow-md"
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AnalyticsPage;
