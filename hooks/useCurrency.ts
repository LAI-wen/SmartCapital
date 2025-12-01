/**
 * useCurrency Hook - 貨幣格式化 Hook
 */

import { useCallback } from 'react';
import { formatCurrency, formatPercent, type Currency } from '../utils/currency';

interface UseCurrencyOptions {
  defaultCurrency?: Currency;
}

/**
 * 貨幣格式化 Hook
 * 提供格式化函數和當前貨幣設定
 */
export function useCurrency(options?: UseCurrencyOptions) {
  const { defaultCurrency = 'TWD' } = options || {};

  const format = useCallback(
    (
      value: number,
      currency: Currency = defaultCurrency,
      formatOptions?: {
        compact?: boolean;
        showSymbol?: boolean;
        decimals?: number;
      }
    ) => {
      return formatCurrency(value, currency, formatOptions);
    },
    [defaultCurrency]
  );

  const formatCompact = useCallback(
    (value: number, currency: Currency = defaultCurrency) => {
      return formatCurrency(value, currency, { compact: true });
    },
    [defaultCurrency]
  );

  const formatWithoutSymbol = useCallback(
    (value: number, currency: Currency = defaultCurrency) => {
      return formatCurrency(value, currency, { showSymbol: false });
    },
    [defaultCurrency]
  );

  const percent = useCallback((value: number, decimals = 2) => {
    return formatPercent(value, { decimals });
  }, []);

  return {
    format,
    formatCompact,
    formatWithoutSymbol,
    percent,
    currency: defaultCurrency,
  };
}
