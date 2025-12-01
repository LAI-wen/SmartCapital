/**
 * Stock Service - 股票搜尋相關 API
 */

import { get } from './core/http';

export interface StockSearchResult {
  symbol: string;
  name: string;
  price: number;
  currency: 'TWD' | 'USD';
  change: number;
  changePercent: number;
}

/**
 * 搜尋股票
 */
export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const result = await get<StockSearchResult[]>(
    `/api/stocks/search?q=${encodeURIComponent(query)}`
  );
  return result ?? [];
}
