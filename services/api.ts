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
  accountId: string;
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

interface Notification {
  id: string;
  type: 'info' | 'alert' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

/**
 * 取得用戶資料
 */
export async function getUser(): Promise<User | null> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/user/${userId}`);
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
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/assets/${userId}`);
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
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/transactions/${userId}?limit=${limit}`);
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
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/portfolio/${userId}`);
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
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/settings/${userId}`);
    const result: ApiResponse<Settings> = await response.json();
    return result.success ? result.data || null : null;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return null;
  }
}

/**
 * 取得通知列表
 */
export async function getNotifications(limit = 20): Promise<Notification[]> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/notifications/${userId}?limit=${limit}`);
    const result: ApiResponse<Notification[]> = await response.json();
    return result.success ? result.data || [] : [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}

/**
 * 標記通知為已讀
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const result: ApiResponse<void> = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

/**
 * 標記所有通知為已讀
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${userId}/read-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const result: ApiResponse<void> = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return false;
  }
}

/**
 * 新增交易記錄（更新版：支援 accountId）
 */
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
  try {
    const userId = getUserId();
    console.log('📊 Upserting asset for user:', userId, symbol, quantity, '@', avgPrice);

    const response = await fetch(`${API_BASE_URL}/api/assets/${userId}/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol, name, type, quantity, avgPrice, currency }),
    });

    const result: ApiResponse<Asset> = await response.json();

    if (!result.success) {
      console.error('❌ Upsert asset failed:', result.error);
      return null;
    }

    console.log('✅ Asset upserted:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Upsert asset error:', error);
    return null;
  }
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
  try {
    const userId = getUserId();
    console.log('📦 Importing existing asset for user:', userId, symbol, quantity, '@', avgPrice);

    const response = await fetch(`${API_BASE_URL}/api/assets/${userId}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol, name, type, quantity, avgPrice, currency }),
    });

    const result: ApiResponse<Asset> = await response.json();

    if (!result.success) {
      console.error('❌ Import asset failed:', result.error);
      return null;
    }

    console.log('✅ Asset imported (no account deduction):', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Import asset error:', error);
    return null;
  }
}

/**
 * 減少資產持倉（賣出股票）
 */
export async function reduceAsset(
  symbol: string,
  quantity: number
): Promise<Asset | null> {
  try {
    const userId = getUserId();
    console.log('📉 Reducing asset for user:', userId, symbol, quantity);

    const response = await fetch(`${API_BASE_URL}/api/assets/${userId}/reduce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol, quantity }),
    });

    const result: ApiResponse<Asset> = await response.json();

    if (!result.success) {
      console.error('❌ Reduce asset failed:', result.error);
      return null;
    }

    console.log('✅ Asset reduced:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Reduce asset error:', error);
    return null;
  }
}

export async function createTransaction(
  type: 'income' | 'expense',
  amount: number,
  category: string,
  date: string,
  note?: string,
  accountId?: string
): Promise<Transaction | null> {
  try {
    const userId = getUserId();
    console.log('📝 Creating transaction for user:', userId, 'with accountId:', accountId);

    const response = await fetch(`${API_BASE_URL}/api/transactions/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, amount, category, date, note, accountId }),
    });
    const result: ApiResponse<Transaction> = await response.json();

    if (result.success && result.data) {
      console.log('✅ Transaction created:', result.data);
    }

    return result.success ? result.data || null : null;
  } catch (error) {
    console.error('Failed to create transaction:', error);
    return null;
  }
}

/**
 * 刪除交易記錄
 */
export async function deleteTransaction(transactionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}`, {
      method: 'DELETE',
    });
    const result: ApiResponse<void> = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return false;
  }
}

/**
 * ============================================================
 * Account Management APIs
 * ============================================================
 */

interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'BROKERAGE' | 'EXCHANGE';
  currency: 'TWD' | 'USD';
  balance: number;
  isDefault: boolean;
  isSub: boolean;
  createdAt: string;
}

interface Transfer {
  id: string;
  fromAccount: { name: string; currency: string };
  toAccount: { name: string; currency: string };
  amount: number;
  exchangeRate?: number;
  fee?: number;
  note?: string;
  date: string;
}

/**
 * 取得用戶所有帳戶
 */
export async function getAccounts(): Promise<Account[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/accounts/${currentUserId}`);
    const result: ApiResponse<Account[]> = await response.json();
    return result.success ? result.data || [] : [];
  } catch (error) {
    console.error('Failed to fetch accounts:', error);
    return [];
  }
}

/**
 * 創建新帳戶
 */
export async function createAccount(accountData: {
  name: string;
  type: 'CASH' | 'BANK' | 'BROKERAGE' | 'EXCHANGE';
  currency: 'TWD' | 'USD';
  balance?: number;
  isDefault?: boolean;
  isSub?: boolean;
}): Promise<Account | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/accounts/${currentUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(accountData),
    });
    const result: ApiResponse<Account> = await response.json();
    return result.success ? result.data || null : null;
  } catch (error) {
    console.error('Failed to create account:', error);
    return null;
  }
}

/**
 * 更新帳戶資訊
 */
export async function updateAccount(
  accountId: string,
  data: { name?: string; isDefault?: boolean }
): Promise<Account | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/accounts/${accountId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result: ApiResponse<Account> = await response.json();
    return result.success ? result.data || null : null;
  } catch (error) {
    console.error('Failed to update account:', error);
    return null;
  }
}

/**
 * 更新帳戶餘額
 */
export async function updateAccountBalance(
  accountId: string,
  amount: number,
  operation: 'add' | 'subtract'
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/accounts/${accountId}/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, operation }),
    });
    const result: ApiResponse<{ id: string; balance: number }> = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to update account balance:', error);
    return false;
  }
}

/**
 * 刪除帳戶
 */
export async function deleteAccount(accountId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/accounts/${accountId}`, {
      method: 'DELETE',
    });
    const result: ApiResponse<void> = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to delete account:', error);
    return false;
  }
}

/**
 * 創建轉帳記錄
 */
export async function createTransfer(transferData: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  exchangeRate?: number;
  fee?: number;
  note?: string;
}): Promise<Transfer | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transfers/${currentUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferData),
    });
    const result: ApiResponse<Transfer> = await response.json();
    return result.success ? result.data || null : null;
  } catch (error) {
    console.error('Failed to create transfer:', error);
    return null;
  }
}

/**
 * 取得轉帳記錄
 */
export async function getTransfers(limit = 20): Promise<Transfer[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transfers/${currentUserId}?limit=${limit}`);
    const result: ApiResponse<Transfer[]> = await response.json();
    return result.success ? result.data || [] : [];
  } catch (error) {
    console.error('Failed to fetch transfers:', error);
    return [];
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
 * ============================================================
 * Stock Search API
 * ============================================================
 */

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
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/api/stocks/search?q=${encodeURIComponent(query)}`);
    const result: ApiResponse<StockSearchResult[]> = await response.json();
    return result.success ? result.data || [] : [];
  } catch (error) {
    console.error('Failed to search stocks:', error);
    return [];
  }
}

/**
 * ============================================================
 * Price Alert API
 * ============================================================
 */

export type AlertType = 'DAILY_CHANGE' | 'PROFIT_LOSS' | 'STOP_PROFIT' | 'STOP_LOSS' | 'TARGET_PRICE';
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
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/price-alerts/${userId}`);
    const result: ApiResponse<PriceAlert[]> = await response.json();
    return result.success ? result.data || [] : [];
  } catch (error) {
    console.error('Failed to fetch price alerts:', error);
    return [];
  }
}

/**
 * 建立價格警示
 */
export async function createPriceAlert(input: CreatePriceAlertInput): Promise<PriceAlert | null> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/price-alerts/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    const result: ApiResponse<PriceAlert> = await response.json();
    return result.success ? result.data || null : null;
  } catch (error) {
    console.error('Failed to create price alert:', error);
    return null;
  }
}

/**
 * 更新價格警示狀態
 */
export async function updatePriceAlert(alertId: string, isActive: boolean): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/price-alerts/${alertId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
    });
    const result: ApiResponse<PriceAlert> = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to update price alert:', error);
    return false;
  }
}

/**
 * 刪除價格警示
 */
export async function deletePriceAlert(alertId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/price-alerts/${alertId}`, {
      method: 'DELETE',
    });
    const result: ApiResponse<void> = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to delete price alert:', error);
    return false;
  }
}

/**
 * 為所有持倉建立預設警示
 */
export async function createDefaultAlerts(
  dailyChangeThreshold = 5,
  profitThreshold = 10,
  lossThreshold = 10
): Promise<boolean> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/price-alerts/${userId}/create-defaults`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dailyChangeThreshold, profitThreshold, lossThreshold }),
    });
    const result: ApiResponse<PriceAlert[]> = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to create default alerts:', error);
    return false;
  }
}
