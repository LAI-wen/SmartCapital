/**
 * Exchange Rate Service - 前端匯率服務
 * 提供匯率查詢和轉換功能
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ExchangeRatesResponse {
  success: boolean;
  data?: {
    base: string;
    rates: { [key: string]: number };
    timestamp: string;
  };
  error?: string;
}

interface ConvertCurrencyResponse {
  success: boolean;
  data?: {
    from: string;
    to: string;
    originalAmount: number;
    convertedAmount: number;
    rate: number;
  };
  error?: string;
}

/**
 * 取得即時匯率
 * @param baseCurrency 基準幣別（預設 USD）
 */
export async function getExchangeRates(baseCurrency: string = 'USD'): Promise<{ [key: string]: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/exchange-rates?base=${baseCurrency}`);
    const result: ExchangeRatesResponse = await response.json();

    if (result.success && result.data) {
      return result.data.rates;
    }

    console.error('Failed to fetch exchange rates:', result.error);
    return getDefaultRates();
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return getDefaultRates();
  }
}

/**
 * 轉換幣別
 * @param amount 金額
 * @param from 來源幣別
 * @param to 目標幣別
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<number> {
  if (from === to) {
    return amount;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exchange-rates/convert?from=${from}&to=${to}&amount=${amount}`
    );
    const result: ConvertCurrencyResponse = await response.json();

    if (result.success && result.data) {
      return result.data.convertedAmount;
    }

    console.error('Failed to convert currency:', result.error);
    return amount; // 降級處理：返回原金額
  } catch (error) {
    console.error('Error converting currency:', error);
    return amount;
  }
}

/**
 * 取得特定匯率
 * @param from 來源幣別
 * @param to 目標幣別
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) {
    return 1.0;
  }

  try {
    const rates = await getExchangeRates('USD');

    if (from === 'USD') {
      return rates[to] || 1.0;
    } else if (to === 'USD') {
      return 1 / (rates[from] || 1.0);
    } else {
      // 透過 USD 間接計算
      return (rates[to] || 1.0) / (rates[from] || 1.0);
    }
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return 1.0;
  }
}

/**
 * 格式化幣別符號
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
    TWD: 'NT$',
    USD: '$',
    JPY: '¥',
    EUR: '€',
    GBP: '£',
    CNY: '¥',
    KRW: '₩',
    HKD: 'HK$',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$'
  };
  return symbols[currency] || currency;
}

/**
 * 格式化金額顯示（帶幣別符號）
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
}

/**
 * 預設匯率（當 API 失敗時使用）
 */
function getDefaultRates(): { [key: string]: number } {
  return {
    TWD: 31.5,
    JPY: 150.0,
    EUR: 0.92,
    GBP: 0.79,
    CNY: 7.25,
    KRW: 1320,
    HKD: 7.83,
    SGD: 1.35,
    AUD: 1.53,
    CAD: 1.36,
    USD: 1.0
  };
}

/**
 * React Hook: 使用匯率
 */
import { useState, useEffect } from 'react';

export function useExchangeRates(baseCurrency: string = 'USD') {
  const [rates, setRates] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchRates = async () => {
      setLoading(true);
      const fetchedRates = await getExchangeRates(baseCurrency);
      if (mounted) {
        setRates(fetchedRates);
        setLoading(false);
      }
    };

    fetchRates();

    // 每 5 分鐘更新一次（後端有 1 小時快取，這裡可以更頻繁）
    const interval = setInterval(fetchRates, 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [baseCurrency]);

  return { rates, loading };
}

/**
 * React Hook: 轉換幣別
 */
export function useConvertCurrency(amount: number, from: string, to: string) {
  const [convertedAmount, setConvertedAmount] = useState<number>(amount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const convert = async () => {
      if (from === to) {
        setConvertedAmount(amount);
        return;
      }

      setLoading(true);
      const result = await convertCurrency(amount, from, to);
      if (mounted) {
        setConvertedAmount(result);
        setLoading(false);
      }
    };

    convert();

    return () => {
      mounted = false;
    };
  }, [amount, from, to]);

  return { convertedAmount, loading };
}
