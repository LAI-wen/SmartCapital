import { useState, useEffect } from 'react';
import { useLiff } from '../contexts/LiffContext';
import { Asset, Transaction } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Portfolio {
  assets: Asset[];
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
}

interface UserData {
  portfolio: Portfolio | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useUserData = (): UserData => {
  const { lineUserId, isLoggedIn, isLiffReady } = useLiff();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!lineUserId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 獲取投資組合
      const portfolioRes = await fetch(`${API_BASE_URL}/api/portfolio/${lineUserId}`);
      const portfolioData = await portfolioRes.json();

      if (portfolioData.success) {
        setPortfolio(portfolioData.data);
      }

      // 獲取交易記錄
      const transactionsRes = await fetch(`${API_BASE_URL}/api/transactions/${lineUserId}?limit=50`);
      const transactionsData = await transactionsRes.json();

      if (transactionsData.success) {
        setTransactions(transactionsData.data);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setError(err instanceof Error ? err.message : '無法載入資料');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLiffReady && isLoggedIn && lineUserId) {
      fetchData();
    } else if (isLiffReady && !isLoggedIn) {
      // LIFF 已就緒但未登入，使用 Mock 資料
      setIsLoading(false);
    }
  }, [lineUserId, isLoggedIn, isLiffReady]);

  return {
    portfolio,
    transactions,
    isLoading,
    error,
    refetch: fetchData,
  };
};
