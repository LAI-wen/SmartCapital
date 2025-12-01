/**
 * useAccounts Hook - 帳戶管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { getAccounts, type Account } from '../services';

/**
 * 帳戶管理 Hook
 * 提供帳戶列表、載入狀態和常用過濾功能
 */
export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // 取得預設帳戶
  const defaultAccount = useCallback(() => {
    return accounts.find((acc) => acc.isDefault) || accounts[0] || null;
  }, [accounts]);

  // 依貨幣過濾帳戶
  const getAccountsByCurrency = useCallback(
    (currency: 'TWD' | 'USD') => {
      return accounts.filter((acc) => acc.currency === currency);
    },
    [accounts]
  );

  // 依類型過濾帳戶
  const getAccountsByType = useCallback(
    (type: Account['type']) => {
      return accounts.filter((acc) => acc.type === type);
    },
    [accounts]
  );

  // 取得證券帳戶（含子帳戶）
  const getBrokerageAccounts = useCallback(() => {
    return accounts.filter((acc) => acc.type === 'BROKERAGE');
  }, [accounts]);

  // 取得現金帳戶
  const getCashAccounts = useCallback(() => {
    return accounts.filter(
      (acc) => acc.type === 'CASH' || acc.type === 'BANK'
    );
  }, [accounts]);

  const refresh = useCallback(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    refresh,
    defaultAccount,
    getAccountsByCurrency,
    getAccountsByType,
    getBrokerageAccounts,
    getCashAccounts,
  };
}
