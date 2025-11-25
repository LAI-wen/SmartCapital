/**
 * CurrencyAmount Component
 * 顯示多幣別金額，支援即時匯率轉換
 */

import React from 'react';
import { getCurrencySymbol, useConvertCurrency } from '../services/exchangeRateService';

interface CurrencyAmountProps {
  amount: number;
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  displayCurrency?: string; // 使用者偏好的顯示幣別
  showOriginal?: boolean;   // 是否顯示原始幣別
  className?: string;
}

const CurrencyAmount: React.FC<CurrencyAmountProps> = ({
  amount,
  currency,
  originalCurrency,
  originalAmount,
  exchangeRate,
  displayCurrency,
  showOriginal = true,
  className = ''
}) => {
  // 如果沒有原始幣別資訊，直接顯示金額
  if (!originalCurrency || originalCurrency === currency) {
    const symbol = getCurrencySymbol(currency);
    return (
      <span className={className}>
        {symbol}{amount.toLocaleString()}
      </span>
    );
  }

  // 有原始幣別資訊，顯示轉換前後
  const originalSymbol = getCurrencySymbol(originalCurrency);
  const currentSymbol = getCurrencySymbol(currency);

  // 使用快取的匯率或即時匯率
  const displayAmount = originalAmount || amount;

  return (
    <span className={className}>
      {showOriginal ? (
        <>
          <span className="text-ink-600">
            {originalSymbol}{displayAmount.toLocaleString()}
          </span>
          <span className="text-ink-400 mx-1">→</span>
          <span className="font-bold">
            {currentSymbol}{amount.toLocaleString()}
          </span>
          {exchangeRate && (
            <span className="text-xs text-ink-400 ml-1">
              (@{exchangeRate.toFixed(2)})
            </span>
          )}
        </>
      ) : (
        <span className="font-bold">
          {currentSymbol}{amount.toLocaleString()}
        </span>
      )}
    </span>
  );
};

export default CurrencyAmount;

/**
 * CurrencyConverter Component
 * 即時幣別轉換顯示
 */
interface CurrencyConverterProps {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  className?: string;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  amount,
  fromCurrency,
  toCurrency,
  className = ''
}) => {
  const { convertedAmount, loading } = useConvertCurrency(amount, fromCurrency, toCurrency);

  const fromSymbol = getCurrencySymbol(fromCurrency);
  const toSymbol = getCurrencySymbol(toCurrency);

  if (loading) {
    return (
      <span className={`${className} text-ink-400`}>
        計算中...
      </span>
    );
  }

  if (fromCurrency === toCurrency) {
    return (
      <span className={className}>
        {fromSymbol}{amount.toLocaleString()}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="text-ink-600">
        {fromSymbol}{amount.toLocaleString()}
      </span>
      <span className="text-ink-400 mx-1">≈</span>
      <span className="font-bold">
        {toSymbol}{convertedAmount.toLocaleString()}
      </span>
    </span>
  );
};

/**
 * MultiCurrencyTotal Component
 * 多幣別總計顯示（自動轉換為統一幣別）
 */
interface MultiCurrencyTotalProps {
  amounts: Array<{ amount: number; currency: string }>;
  displayCurrency?: string;
  className?: string;
}

export const MultiCurrencyTotal: React.FC<MultiCurrencyTotalProps> = ({
  amounts,
  displayCurrency = 'TWD',
  className = ''
}) => {
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const calculateTotal = async () => {
      setLoading(true);

      // 使用動態 import 以避免循環依賴
      const { convertCurrency } = await import('../services/exchangeRateService');

      let sum = 0;
      for (const { amount, currency } of amounts) {
        const converted = await convertCurrency(amount, currency, displayCurrency);
        sum += converted;
      }

      setTotal(sum);
      setLoading(false);
    };

    calculateTotal();
  }, [amounts, displayCurrency]);

  const symbol = getCurrencySymbol(displayCurrency);

  if (loading) {
    return (
      <span className={`${className} text-ink-400`}>
        計算中...
      </span>
    );
  }

  return (
    <span className={className}>
      {symbol}{total.toLocaleString()}
    </span>
  );
};
