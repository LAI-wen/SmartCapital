/**
 * Price Alert Service - 價格警示相關 API
 */

import { get, post, patch, del } from './core/http';
import { getUserId } from './user.service';

export type AlertType =
  | 'DAILY_CHANGE'
  | 'PROFIT_LOSS'
  | 'STOP_PROFIT'
  | 'STOP_LOSS'
  | 'TARGET_PRICE';
export type AlertDirection = 'UP' | 'DOWN' | 'BOTH';

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  name?: string;
  alertType: AlertType;
  threshold?: number;
  targetPrice?: number;
  direction?: AlertDirection;
  referencePrice?: number;
  isActive: boolean;
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceAlertInput {
  symbol: string;
  name?: string;
  alertType: AlertType;
  threshold?: number;
  targetPrice?: number;
  direction?: AlertDirection;
  referencePrice?: number;
}

/**
 * 取得用戶所有價格警示
 */
export async function getPriceAlerts(): Promise<PriceAlert[]> {
  const userId = getUserId();
  const result = await get<PriceAlert[]>(`/api/price-alerts/${userId}`);
  return result ?? [];
}

/**
 * 建立價格警示
 */
export async function createPriceAlert(input: CreatePriceAlertInput): Promise<PriceAlert | null> {
  const userId = getUserId();
  return post<PriceAlert>(`/api/price-alerts/${userId}`, input);
}

/**
 * 更新價格警示狀態
 */
export async function updatePriceAlert(alertId: string, isActive: boolean): Promise<boolean> {
  const result = await patch<PriceAlert>(`/api/price-alerts/${alertId}`, { isActive });
  return result !== null;
}

/**
 * 刪除價格警示
 */
export async function deletePriceAlert(alertId: string): Promise<boolean> {
  return del(`/api/price-alerts/${alertId}`);
}

/**
 * 為所有持倉建立預設警示
 */
export async function createDefaultAlerts(
  dailyChangeThreshold = 5,
  profitThreshold = 10,
  lossThreshold = 10
): Promise<boolean> {
  const userId = getUserId();
  const result = await post<PriceAlert[]>(`/api/price-alerts/${userId}/create-defaults`, {
    dailyChangeThreshold,
    profitThreshold,
    lossThreshold,
  });
  return result !== null;
}
