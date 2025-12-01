/**
 * useAssets Hook - 資產管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { getAssets, type Asset } from '../services';

/**
 * 資產管理 Hook
 * 提供資產列表、載入狀態和重新整理功能
 */
export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAssets();
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assets');
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const refresh = useCallback(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    loading,
    error,
    refresh,
  };
}
