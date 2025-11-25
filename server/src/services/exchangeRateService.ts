/**
 * Exchange Rate Service - 匯率查詢服務
 * 使用 Exchange Rate API 取得即時匯率資料
 * 實現 1 小時快取機制以減少 API 呼叫次數
 */

import axios from 'axios';

// 匯率快取結構
interface ExchangeRateCache {
  rates: { [key: string]: number };
  timestamp: number;
}

// 快取時間：1 小時（毫秒）
const CACHE_DURATION = 60 * 60 * 1000;

// 全域快取物件
let rateCache: ExchangeRateCache | null = null;

/**
 * 取得即時匯率
 * 使用 exchangerate-api.com（免費 API，無需註冊）
 * @param baseCurrency 基準幣別（預設 USD）
 * @returns 匯率物件（例如：{ TWD: 31.5, JPY: 150.2 }）
 */
export async function getExchangeRates(baseCurrency: string = 'USD'): Promise<{ [key: string]: number }> {
  // 檢查快取是否有效
  const now = Date.now();
  if (rateCache && (now - rateCache.timestamp) < CACHE_DURATION) {
    console.log('💰 Using cached exchange rates');
    return rateCache.rates;
  }

  try {
    // 免費 API：https://www.exchangerate-api.com/
    const url = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;

    console.log(`💱 Fetching fresh exchange rates (base: ${baseCurrency})`);
    const response = await axios.get(url, {
      timeout: 10000 // 10 秒超時
    });

    if (!response.data || !response.data.rates) {
      throw new Error('Invalid response from exchange rate API');
    }

    const rates = response.data.rates;

    // 更新快取
    rateCache = {
      rates,
      timestamp: now
    };

    console.log('✅ Exchange rates updated:', {
      base: baseCurrency,
      'USD→TWD': rates.TWD,
      'USD→JPY': rates.JPY,
      'USD→EUR': rates.EUR,
      cachedAt: new Date(now).toISOString()
    });

    return rates;
  } catch (error) {
    console.error('❌ Failed to fetch exchange rates:', error);

    // 如果有舊快取，即使過期也使用（降級處理）
    if (rateCache) {
      console.warn('⚠️ Using stale cache due to API error');
      return rateCache.rates;
    }

    // 如果完全沒有快取，使用預設值
    console.warn('⚠️ Using default exchange rates as fallback');
    return getDefaultRates();
  }
}

/**
 * 轉換幣別
 * @param amount 金額
 * @param fromCurrency 來源幣別
 * @param toCurrency 目標幣別
 * @returns 轉換後的金額
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates('USD');

  // 轉換邏輯：from → USD → to
  // 例如：TWD 1000 → USD (1000 / 31.5) → JPY (31.75 * 150.2)
  const amountInUSD = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency];
  const amountInTarget = toCurrency === 'USD' ? amountInUSD : amountInUSD * rates[toCurrency];

  return parseFloat(amountInTarget.toFixed(2));
}

/**
 * 取得特定匯率
 * @param fromCurrency 來源幣別
 * @param toCurrency 目標幣別
 * @returns 匯率（例如：1 USD = 31.5 TWD）
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  const rates = await getExchangeRates('USD');

  // 計算匯率
  if (fromCurrency === 'USD') {
    return rates[toCurrency];
  } else if (toCurrency === 'USD') {
    return 1 / rates[fromCurrency];
  } else {
    // 透過 USD 間接計算
    return rates[toCurrency] / rates[fromCurrency];
  }
}

/**
 * 清除快取（測試或手動重新整理用）
 */
export function clearCache() {
  rateCache = null;
  console.log('🗑️ Exchange rate cache cleared');
}

/**
 * 取得預設匯率（當 API 失敗時使用）
 */
function getDefaultRates(): { [key: string]: number } {
  return {
    TWD: 31.5,  // 1 USD = 31.5 TWD
    JPY: 150.0, // 1 USD = 150 JPY
    EUR: 0.92,  // 1 USD = 0.92 EUR
    GBP: 0.79,  // 1 USD = 0.79 GBP
    CNY: 7.25,  // 1 USD = 7.25 CNY
    KRW: 1320,  // 1 USD = 1320 KRW
    HKD: 7.83,  // 1 USD = 7.83 HKD
    SGD: 1.35,  // 1 USD = 1.35 SGD
    AUD: 1.53,  // 1 USD = 1.53 AUD
    CAD: 1.36,  // 1 USD = 1.36 CAD
    USD: 1.0    // 1 USD = 1 USD
  };
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
