/**
 * User Service - 用戶相關 API
 */

import { get } from './core/http';

// Mock LINE User ID（開發用）
const MOCK_LINE_USER_ID = 'Ucb528757211bf9eef17f7f0a391dd56e';

export interface User {
  id: string;
  displayName: string;
  bankroll: number;
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

// 當前用戶 ID
let currentUserId = MOCK_LINE_USER_ID;

/**
 * 設定當前用戶 ID（用於 LINE Login 整合）
 */
export function setUserId(userId: string): void {
  currentUserId = userId;
}

/**
 * 取得當前用戶 ID
 * 優先級：localStorage > URL 參數 > Mock ID
 */
export function getUserId(): string {
  // 優先從 localStorage 讀取（LIFF 登入後會儲存）
  const storedUserId = localStorage.getItem('lineUserId');
  if (storedUserId) {
    console.log('🔍 [getUserId] 從 localStorage 取得:', storedUserId);
    return storedUserId;
  }

  // 檢查 URL 參數（開發模式）
  const params = new URLSearchParams(window.location.search);
  const userIdFromUrl = params.get('userId');
  if (userIdFromUrl) {
    console.log('🔍 [getUserId] 從 URL 參數取得:', userIdFromUrl);
    return userIdFromUrl;
  }

  // 最後才用 mock ID（本地測試）
  console.log('🔍 [getUserId] 使用 Mock ID:', currentUserId);
  return currentUserId;
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
