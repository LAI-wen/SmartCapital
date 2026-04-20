import { useMemo } from 'react';
import { Transaction, Account, Asset, InvestmentScope } from '../types';
import {
  parseISO, isSameDay, isSameWeek, isSameMonth, isSameYear,
  startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear,
  format, subDays, subWeeks, subMonths, subYears,
} from 'date-fns';

type ViewMode = 'day' | 'week' | 'month' | 'year' | 'calendar';

interface Options {
  transactions: Transaction[];
  accounts: Account[];
  assets: Asset[];
  investmentScope: InvestmentScope;
  viewMode: ViewMode;
  currentDate: Date;
  selectedCategory: string;
  selectedDay: string | null;
}

export const useAnalyticsData = ({
  transactions, accounts, assets, investmentScope,
  viewMode, currentDate, selectedCategory, selectedDay,
}: Options) => {
  const scopeFilteredAssets = useMemo(() =>
    assets.filter(asset => {
      const isTW = asset.currency === 'TWD';
      const isCrypto = asset.type === 'Crypto';
      const isUS = !isTW && !isCrypto;
      if (isTW && !investmentScope.tw) return false;
      if (isUS && !investmentScope.us) return false;
      if (isCrypto && !investmentScope.crypto) return false;
      return true;
    }), [assets, investmentScope]);

  const filteredTransactions = useMemo(() =>
    transactions.filter(t => {
      const tDate = parseISO(t.date);
      let isTimeMatch = false;
      if (viewMode === 'day') isTimeMatch = isSameDay(tDate, currentDate);
      else if (viewMode === 'week') isTimeMatch = isSameWeek(tDate, currentDate, { weekStartsOn: 1 });
      else if (viewMode === 'month') isTimeMatch = isSameMonth(tDate, currentDate);
      else if (viewMode === 'year') isTimeMatch = isSameYear(tDate, currentDate);
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      return isTimeMatch;
    }), [transactions, currentDate, viewMode, selectedCategory]);

  const allCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return ['All', ...Array.from(cats)];
  }, [transactions]);

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

  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthName = monthDate.toLocaleDateString('zh-TW', { month: 'short' });
      const monthTxs = transactions.filter(tx => {
        const [y, m] = tx.date.split('T')[0].split('-').map(Number);
        return y === monthDate.getFullYear() && m === monthDate.getMonth() + 1;
      });
      const income = monthTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
      const expense = monthTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
      return { month: monthName, income, expense };
    });
  }, [transactions]);

  const totalNetWorth = useMemo(() => {
    const accountBalance = accounts.reduce((s, acc) => s + acc.balance, 0);
    const assetValue = scopeFilteredAssets.reduce((s, a) => s + a.avgPrice * a.quantity, 0);
    return accountBalance + assetValue;
  }, [accounts, scopeFilteredAssets]);

  const assetTrendData = useMemo(() => {
    const now = new Date();
    const currentTotal = totalNetWorth;
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthName = monthDate.toLocaleDateString('zh-TW', { month: 'short' });
      const monthEndStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 2).padStart(2, '0')}-01`;
      const cashFlowAfter = transactions
        .filter(tx => tx.date.split('T')[0] >= monthEndStr)
        .reduce((s, tx) => tx.type === 'income' ? s + tx.amount : tx.type === 'expense' ? s - tx.amount : s, 0);
      return { month: monthName, netWorth: Math.max(0, currentTotal - cashFlowAfter) };
    });
  }, [transactions, totalNetWorth]);

  const expenseCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.filter(tx => tx.type === 'expense').forEach(tx => {
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const totalExpense = useMemo(() =>
    expenseCategoryData.reduce((s, c) => s + c.value, 0), [expenseCategoryData]);

  const getPrevRange = (): [Date, Date] => {
    if (viewMode === 'day') return [subDays(currentDate, 1), subDays(currentDate, 1)];
    if (viewMode === 'week') {
      const p = subWeeks(currentDate, 1);
      return [startOfWeek(p, { weekStartsOn: 1 }), endOfWeek(p, { weekStartsOn: 1 })];
    }
    if (viewMode === 'month') {
      const p = subMonths(currentDate, 1);
      return [startOfMonth(p), endOfMonth(p)];
    }
    const p = subYears(currentDate, 1);
    return [startOfYear(p), endOfYear(p)];
  };

  const currentPeriodStats = useMemo(() => {
    const [prevStart, prevEnd] = getPrevRange();
    const prevTxs = transactions.filter(tx => { const d = parseISO(tx.date); return d >= prevStart && d <= prevEnd; });
    const currentIncome = filteredTransactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const currentExpense = filteredTransactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    const lastIncome = prevTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const lastExpense = prevTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    return {
      currentIncome, currentExpense,
      incomeChange: lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0,
      expenseChange: lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTransactions, transactions, currentDate, viewMode]);

  const prevPeriodCategoryMap = useMemo(() => {
    const [prevStart, prevEnd] = getPrevRange();
    const map: Record<string, number> = {};
    transactions.filter(tx => { const d = parseISO(tx.date); return tx.type === 'expense' && d >= prevStart && d <= prevEnd; })
      .forEach(tx => { map[tx.category] = (map[tx.category] || 0) + tx.amount; });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, currentDate, viewMode]);

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDay) return [];
    return transactions.filter(t => t.date.split('T')[0] === selectedDay);
  }, [transactions, selectedDay]);

  const dailyAvgExpense = useMemo(() => {
    const days = viewMode === 'day' ? 1 : viewMode === 'week' ? 7
      : viewMode === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() : 365;
    return currentPeriodStats.currentExpense / days;
  }, [currentPeriodStats, viewMode, currentDate]);

  const savingsRate = useMemo(() => {
    if (currentPeriodStats.currentIncome === 0) return null;
    return ((currentPeriodStats.currentIncome - currentPeriodStats.currentExpense) / currentPeriodStats.currentIncome) * 100;
  }, [currentPeriodStats]);

  const peakSpendDay = useMemo(() => {
    const dayMap: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      const key = t.date.split('T')[0];
      dayMap[key] = (dayMap[key] || 0) + t.amount;
    });
    const entries = Object.entries(dayMap);
    if (entries.length === 0) return null;
    const [date] = entries.sort(([, a], [, b]) => b - a)[0];
    return { date: date.slice(5) };
  }, [filteredTransactions]);

  return {
    filteredTransactions, allCategories, dateRangeLabel,
    monthlyData, totalNetWorth, assetTrendData,
    expenseCategoryData, totalExpense, currentPeriodStats,
    prevPeriodCategoryMap, selectedDayTransactions,
    dailyAvgExpense, savingsRate, peakSpendDay,
  };
};
