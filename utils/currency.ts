/**
 * Currency Utilities - 貨幣格式化工具
 */

export type Currency = 'TWD' | 'USD';

/**
 * 格式化貨幣顯示
 * @param value - 金額
 * @param currency - 貨幣類型
 * @param options - 格式化選項
 */
export function formatCurrency(
  value: number,
  currency: Currency = 'TWD',
  options?: {
    compact?: boolean;      // 是否使用縮寫格式（例如 1.2M）
    showSymbol?: boolean;   // 是否顯示貨幣符號
    decimals?: number;      // 小數位數
  }
): string {
  const { compact = false, showSymbol = true, decimals } = options || {};

  // 縮寫格式
  if (compact) {
    return formatCompactCurrency(value, currency, showSymbol);
  }

  // 確定小數位數
  const fractionDigits = decimals ?? (currency === 'TWD' ? 0 : 2);

  // 格式化數字
  const formatter = new Intl.NumberFormat('zh-TW', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return formatter.format(value);
}

/**
 * 格式化為縮寫貨幣（例如 1.2M, 3.5K）
 */
function formatCompactCurrency(
  value: number,
  currency: Currency,
  showSymbol: boolean
): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const symbol = showSymbol ? getCurrencySymbol(currency) : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${symbol}${(absValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${symbol}${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}${symbol}${(absValue / 1_000).toFixed(1)}K`;
  }

  const decimals = currency === 'TWD' ? 0 : 2;
  return `${sign}${symbol}${absValue.toFixed(decimals)}`;
}

/**
 * 取得貨幣符號
 */
export function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case 'TWD':
      return 'NT$';
    case 'USD':
      return '$';
    default:
      return '';
  }
}

/**
 * 格式化百分比
 */
export function formatPercent(
  value: number,
  options?: {
    decimals?: number;
    showSign?: boolean;
  }
): string {
  const { decimals = 2, showSign = true } = options || {};
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * 格式化數字（千分位）
 */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
