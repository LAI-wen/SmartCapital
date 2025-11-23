/**
 * API Service - 前端與 LINE Bot 後端的橋接
 * 提供 React 前端使用的 API 呼叫函數
 */

// 後端 API 基礎 URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 你的真實 LINE User ID
// 在真實環境中，你會使用 LINE Login 或 LIFF 來取得真實的 User ID
const MOCK_LINE_USER_ID = 'Ucb528757211bf9eef17f7f0a391dd56e';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface User {
  id: string;
  displayName: string;
  bankroll: number;
  createdAt: string;
}

interface Asset {
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

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
}

interface Portfolio {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  assets: Asset[];
}

interface Settings {
  kellyWinProbability: number;
  kellyOdds: number;
  martingaleMultiplier: number;
}

/**
 * 取得用戶資料
 */
export async function getUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/${MOCK_LINE_USER_ID}`);
    const result: ApiResponse<User> = await response.json();
    return result.success ? result.data || null : null;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

/**
 * 取得資產列表（含即時價格）
 */
export async function getAssets(): Promise<Asset[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/assets/${MOCK_LINE_USER_ID}`);
    const result: ApiResponse<Asset[]> = await response.json();
    return result.success ? result.data || [] : [];
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    return [];
  }
}

/**
 * 取得交易記錄
 */
export async function getTransactions(limit = 50): Promise<Transaction[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transactions/${MOCK_LINE_USER_ID}?limit=${limit}`);
    const result: ApiResponse<Transaction[]> = await response.json();
    return result.success ? result.data || [] : [];
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return [];
  }
}

/**
 * 取得投資組合摘要
 */
export async function getPortfolio(): Promise<Portfolio | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolio/${MOCK_LINE_USER_ID}`);
    const result: ApiResponse<Portfolio> = await response.json();
    return result.success ? result.data || null : null;
  } catch (error) {
    console.error('Failed to fetch portfolio:', error);
    return null;
  }
}

/**
 * 取得策略設定
 */
export async function getSettings(): Promise<Settings | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings/${MOCK_LINE_USER_ID}`);
    const result: ApiResponse<Settings> = await response.json();
    return result.success ? result.data || null : null;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return null;
  }
}

/**
 * 設定當前用戶 ID（用於 LINE Login 整合）
 */
let currentUserId = MOCK_LINE_USER_ID;

export function setUserId(userId: string) {
  currentUserId = userId;
}

export function getUserId(): string {
  return currentUserId;
}
