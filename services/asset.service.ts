/**
 * Asset Service - 資產相關 API
 */

import { get, post } from './core/http';
import { getUserId } from './user.service';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  cost: number;
  profit: number;
  profitPercent: number;
  change24h: number;
}

/**
 * 取得資產列表（含即時價格）
 */
export async function getAssets(): Promise<Asset[]> {
  const userId = getUserId();
  const result = await get<Asset[]>(`/api/assets/${userId}`);
  return result ?? [];
}

/**
 * 新增或更新資產持倉（買入股票）
 */
export async function upsertAsset(
  symbol: string,
  name: string,
  type: string,
  quantity: number,
  avgPrice: number,
  currency?: string
): Promise<Asset | null> {
  const userId = getUserId();

  const result = await post<Asset>(`/api/assets/${userId}/upsert`, {
    symbol,
    name,
    type,
    quantity,
    avgPrice,
    currency,
  });

  if (!result) {
    console.error('❌ Upsert asset failed');
    return null;
  }

  return result;
}

/**
 * 導入既有資產持倉（不影響帳戶餘額）
 * 用於使用者記錄他們已經持有的股票成本
 */
export async function importAsset(
  symbol: string,
  name: string,
  type: string,
  quantity: number,
  avgPrice: number,
  currency: string
): Promise<Asset | null> {
  const userId = getUserId();

  const result = await post<Asset>(`/api/assets/${userId}/import`, {
    symbol,
    name,
    type,
    quantity,
    avgPrice,
    currency,
  });

  if (!result) {
    console.error('❌ Import asset failed');
    return null;
  }

  return result;
}

/**
 * 減少資產持倉（賣出股票）
 */
export async function reduceAsset(symbol: string, quantity: number): Promise<Asset | null> {
  const userId = getUserId();

  const result = await post<Asset>(`/api/assets/${userId}/reduce`, {
    symbol,
    quantity,
  });

  if (!result) {
    console.error('❌ Reduce asset failed');
    return null;
  }

  return result;
}
