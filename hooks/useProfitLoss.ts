/**
 * useProfitLoss Hook - 損益計算 Hook
 */

import { useMemo } from 'react';
import {
  calculateProfitLoss,
  getProfitLossStatus,
  getProfitLossColor,
  getProfitLossBgColor,
  type ProfitLossResult,
} from '../utils/profitLoss';

interface Asset {
  avgPrice: number;
  quantity: number;
  currentPrice: number;
}

/**
 * 損益計算 Hook
 * 自動計算資產的損益並提供樣式類別
 */
export function useProfitLoss(asset: Asset | null) {
  const result = useMemo<ProfitLossResult | null>(() => {
    if (!asset) return null;

    return calculateProfitLoss(
      asset.avgPrice,
      asset.quantity,
      asset.currentPrice
    );
  }, [asset]);

  const status = useMemo(() => {
    if (!result) return 'neutral';
    return getProfitLossStatus(result.profitPercent);
  }, [result]);

  const textColor = useMemo(() => {
    if (!result) return 'text-ink-600';
    return getProfitLossColor(result.profitPercent);
  }, [result]);

  const bgColor = useMemo(() => {
    if (!result) return 'bg-stone-100';
    return getProfitLossBgColor(result.profitPercent);
  }, [result]);

  return {
    ...result,
    status,
    textColor,
    bgColor,
  };
}
