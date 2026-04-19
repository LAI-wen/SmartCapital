/**
 * User Service - 用戶相關 API
 */

import { get, patch } from './core/http';

export interface User {
  id: string;
  displayName: string;
  bankroll: number;
  enableTWStock: boolean;
  enableUSStock: boolean;
  enableCrypto: boolean;
  createdAt: string;
}

export interface Settings {
  kellyWinProbability: number;
  kellyOdds: number;
  martingaleMultiplier: number;
}

export interface Portfolio {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  assets: unknown[];
}

/**
 * 生成隨機的 Mock User ID
 * 格式：U + 32位隨機16進制字符
 */
function generateMockUserId(): string {
  const randomHex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `U${randomHex}`;
}

/**
 * 設定當前用戶 ID（用於 LINE Login 整合）
 */
export function setUserId(userId: string): void {
  localStorage.setItem('lineUserId', userId);
}

/**
 * 取得當前用戶 ID
 * 優先級：localStorage > 生成新的 Mock ID
 * ⚠️ 已移除 URL 參數功能（安全風險）
 */
export function getUserId(): string {
  // 優先從 localStorage 讀取（LIFF 登入後會儲存）
  const storedUserId = localStorage.getItem('lineUserId');
  if (storedUserId) {
    return storedUserId;
  }

  // 生成新的訪客 Mock ID 並儲存
  const newMockId = generateMockUserId();
  localStorage.setItem('lineUserId', newMockId);
  localStorage.setItem('displayName', '訪客用戶');
  return newMockId;
}

/**
 * 取得用戶資料
 */
export async function getUser(): Promise<User | null> {
  const userId = getUserId();
  return get<User>(`/api/user/${userId}`);
}

/**
 * 取得投資組合摘要
 */
export async function getPortfolio(): Promise<Portfolio | null> {
  const userId = getUserId();
  return get<Portfolio>(`/api/portfolio/${userId}`);
}

/**
 * 取得策略設定
 */
export async function getSettings(): Promise<Settings | null> {
  const userId = getUserId();
  return get<Settings>(`/api/settings/${userId}`);
}

/**
 * 更新用戶投資範圍設定
 */
export async function updateInvestmentScope(
  enableTWStock: boolean,
  enableUSStock: boolean,
  enableCrypto: boolean
): Promise<User | null> {
  const userId = getUserId();
  return patch<User>(`/api/user/${userId}`, {
    enableTWStock,
    enableUSStock,
    enableCrypto
  });
}
