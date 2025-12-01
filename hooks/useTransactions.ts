/**
 * useTransactions Hook - 交易記錄管理 Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTransactions, type Transaction } from '../services';
import { isSameMonth, isSameYear, parseISO } from 'date-fns';

/**
 * 交易記錄管理 Hook
 * 提供交易列表、統計數據和過濾功能
 */
export function useTransactions(limit = 50) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTransactions(limit);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // 計算當月收入
  const monthlyIncome = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(
        (tx) =>
          tx.type === 'income' && isSameMonth(parseISO(tx.date), now)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // 計算當月支出
  const monthlyExpense = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(
        (tx) =>
          tx.type === 'expense' && isSameMonth(parseISO(tx.date), now)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // 計算當月結餘
  const monthlyBalance = useMemo(() => {
    return monthlyIncome - monthlyExpense;
  }, [monthlyIncome, monthlyExpense]);

  // 計算年度收入
  const yearlyIncome = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(
        (tx) =>
          tx.type === 'income' && isSameYear(parseISO(tx.date), now)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // 計算年度支出
  const yearlyExpense = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(
        (tx) =>
          tx.type === 'expense' && isSameYear(parseISO(tx.date), now)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // 依類型過濾交易
  const getTransactionsByType = useCallback(
    (type: 'income' | 'expense') => {
      return transactions.filter((tx) => tx.type === type);
    },
    [transactions]
  );

  // 依分類過濾交易
  const getTransactionsByCategory = useCallback(
    (category: string) => {
      return transactions.filter((tx) => tx.category === category);
    },
    [transactions]
  );

  const refresh = useCallback(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refresh,
    monthlyIncome,
    monthlyExpense,
    monthlyBalance,
    yearlyIncome,
    yearlyExpense,
    getTransactionsByType,
    getTransactionsByCategory,
  };
}
