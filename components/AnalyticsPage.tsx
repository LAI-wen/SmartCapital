import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { getTransactions, getAccounts, getAssets } from '../services';
import { Transaction, Account, Asset, InvestmentScope } from '../types';
import { format } from 'date-fns';
import AnalyticsSummaryBar from './analytics/AnalyticsSummaryBar';
import CalendarView from './analytics/CalendarView';
import MonthlyBarChart from './analytics/MonthlyBarChart';
import CategoryBreakdown from './analytics/CategoryBreakdown';
import AssetGrowthTab from './analytics/AssetGrowthTab';
import DatePickerModal from './analytics/DatePickerModal';
import { useAnalyticsData } from '../hooks/useAnalyticsData';

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
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [txs, accs, assts] = await Promise.all([getTransactions(365), getAccounts(), getAssets()]);
        setTransactions(txs); setAccounts(accs); setAssets(assts);
      } catch (error) {
        console.error('❌ Analytics: 載入數據失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const {
    filteredTransactions, allCategories, dateRangeLabel,
    monthlyData, totalNetWorth, assetTrendData,
    expenseCategoryData, totalExpense, currentPeriodStats,
    prevPeriodCategoryMap, selectedDayTransactions,
    dailyAvgExpense, savingsRate, peakSpendDay, dayTotalsMap,
  } = useAnalyticsData({ transactions, accounts, assets, investmentScope, viewMode, currentDate, selectedCategory, selectedDay });

  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate((d: Date) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
    else if (viewMode === 'week') setCurrentDate((d: Date) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
    else if (viewMode === 'month' || viewMode === 'calendar') { setCurrentDate((d: Date) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; }); if (viewMode === 'calendar') setSelectedDay(null); }
    else if (viewMode === 'year') setCurrentDate((d: Date) => { const n = new Date(d); n.setFullYear(n.getFullYear() - 1); return n; });
  };

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate((d: Date) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
    else if (viewMode === 'week') setCurrentDate((d: Date) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
    else if (viewMode === 'month' || viewMode === 'calendar') { setCurrentDate((d: Date) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; }); if (viewMode === 'calendar') setSelectedDay(null); }
    else if (viewMode === 'year') setCurrentDate((d: Date) => { const n = new Date(d); n.setFullYear(n.getFullYear() + 1); return n; });
  };

  const handleOpenDatePicker = () => { setPickerYear(currentDate.getFullYear()); setPickerMonth(currentDate.getMonth() + 1); setIsDatePickerOpen(true); };
  const handleApplyDatePicker = () => { setCurrentDate(new Date(pickerYear, pickerMonth - 1, 1)); if (viewMode === 'calendar') setSelectedDay(null); setIsDatePickerOpen(false); };

  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '••••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const monthParam = format(currentDate, 'yyyy-MM');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 animate-fade-in">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-morandi-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-ink-400 font-serif">載入分析數據中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20 space-y-6">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-stone-100 rounded-xl mb-4">
        <button onClick={() => setActiveTab('income_expense')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-serif transition-all ${activeTab === 'income_expense' ? 'bg-white shadow text-ink-900' : 'text-ink-400'}`}>收支分析</button>
        <button onClick={() => setActiveTab('asset')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-serif transition-all ${activeTab === 'asset' ? 'bg-white shadow text-ink-900' : 'text-ink-400'}`}>資產成長</button>
      </div>

      {/* Filter Controls */}
      <div className="space-y-3">
        <div className="flex bg-paper p-1 rounded-xl justify-center shadow-inner border border-stone-100">
          {(['day', 'week', 'month', 'year'] as const).map(mode => (
            <button key={mode} onClick={() => { setViewMode(mode); setCurrentDate(new Date()); setSelectedDay(null); }}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-serif transition-all ${viewMode === mode ? 'bg-white text-morandi-blue shadow-sm font-bold border border-stone-100' : 'text-ink-400 hover:text-ink-800'}`}>
              {mode === 'day' ? '日' : mode === 'week' ? '週' : mode === 'month' ? '月' : '年'}
            </button>
          ))}
          <button onClick={() => { setViewMode('calendar'); setCurrentDate(new Date()); setSelectedCategory('All'); setSelectedDay(null); }}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-serif transition-all flex items-center justify-center gap-1 ${viewMode === 'calendar' ? 'bg-white text-morandi-blue shadow-sm font-bold border border-stone-100' : 'text-ink-400 hover:text-ink-800'}`}>
            <CalendarDays size={14} /> 月曆
          </button>
        </div>

        <div className="bg-white rounded-2xl p-2 px-3 shadow-soft border border-stone-100 flex justify-between items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} className="p-2 hover:bg-paper rounded-lg text-ink-400 hover:text-morandi-blue transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={handleOpenDatePicker} className="font-serif font-bold text-ink-900 text-sm md:text-lg min-w-[100px] text-center px-2 truncate hover:bg-paper rounded-lg transition-colors cursor-pointer">{dateRangeLabel}</button>
            <button onClick={handleNext} className="p-2 hover:bg-paper rounded-lg text-ink-400 hover:text-morandi-blue transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>

        {viewMode !== 'calendar' && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-1">
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-serif whitespace-nowrap border transition-all ${selectedCategory === cat ? 'bg-ink-800 text-white border-ink-800 shadow-sm' : 'bg-white text-ink-400 border-stone-200 hover:border-ink-400'}`}>
                {cat === 'All' ? '全部' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'income_expense' && (
        <div className="space-y-6 animate-slide-up">
          {viewMode === 'calendar' ? (
            <CalendarView currentDate={currentDate} dayTotalsMap={dayTotalsMap} selectedDay={selectedDay} selectedDayTransactions={selectedDayTransactions} isPrivacyMode={isPrivacyMode} formatCurrency={formatCurrency} onSelectDay={setSelectedDay} onNavigateToLedger={(category, month) => navigate(`/ledger?category=${category}&month=${month}`)} />
          ) : (
            <>
              {/* Top Metrics Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  {viewMode === 'day' ? (<><div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">今日交易</div><div className="text-sm font-serif-num font-bold text-ink-900">{isPrivacyMode ? '••' : filteredTransactions.length} 筆</div></>) : (<><div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">日均支出</div><div className="text-sm font-serif-num font-bold text-ink-900">{isPrivacyMode ? '••••' : dailyAvgExpense > 0 ? `$${Math.round(dailyAvgExpense).toLocaleString()}` : '--'}</div></>)}
                </div>
                <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  <div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">儲蓄率</div>
                  <div className={`text-sm font-serif-num font-bold ${savingsRate === null ? 'text-ink-400' : savingsRate >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'}`}>{isPrivacyMode ? '••' : savingsRate === null ? '--' : `${savingsRate.toFixed(0)}%`}</div>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  <div className="text-[10px] text-ink-400 font-serif mb-1 tracking-wide">最高消費日</div>
                  <div className="text-sm font-serif-num font-bold text-ink-900">{isPrivacyMode ? '••••' : peakSpendDay ? peakSpendDay.date : '--'}</div>
                </div>
              </div>
              <AnalyticsSummaryBar income={currentPeriodStats.currentIncome} expense={currentPeriodStats.currentExpense} incomeChange={currentPeriodStats.incomeChange} expenseChange={currentPeriodStats.expenseChange} viewMode={viewMode} formatCurrency={formatCurrency} />
              <MonthlyBarChart monthlyData={monthlyData} />
              <CategoryBreakdown viewMode={viewMode} expenseCategoryData={expenseCategoryData} totalExpense={totalExpense} prevPeriodCategoryMap={prevPeriodCategoryMap} formatCurrency={formatCurrency} monthParam={monthParam} onNavigateToCategory={(category: string, month: string) => navigate(`/ledger?category=${encodeURIComponent(category)}&month=${month}`)} />
            </>
          )}
        </div>
      )}

      {activeTab === 'asset' && (
        <AssetGrowthTab totalNetWorth={totalNetWorth} assetTrendData={assetTrendData} formatCurrency={formatCurrency} />
      )}

      {isDatePickerOpen && (
        <DatePickerModal pickerYear={pickerYear} pickerMonth={pickerMonth} onYearChange={setPickerYear} onMonthChange={setPickerMonth} onCancel={() => setIsDatePickerOpen(false)} onApply={handleApplyDatePicker} />
      )}
    </div>
  );
};

export default AnalyticsPage;
