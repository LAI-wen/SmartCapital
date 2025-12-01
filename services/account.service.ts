/**
 * Account Service - 帳戶管理相關 API
 */

import { get, post, patch, delWithQuery, postBoolean } from './core/http';
import { getUserId } from './user.service';

export interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'BROKERAGE' | 'EXCHANGE';
  currency: 'TWD' | 'USD';
  balance: number;
  isDefault: boolean;
  isSub: boolean;
  createdAt: string;
}

export interface Transfer {
  id: string;
  fromAccount: { name: string; currency: string };
  toAccount: { name: string; currency: string };
  amount: number;
  exchangeRate?: number;
  fee?: number;
  note?: string;
  date: string;
}

export interface CreateAccountInput {
  name: string;
  type: 'CASH' | 'BANK' | 'BROKERAGE' | 'EXCHANGE';
  currency: 'TWD' | 'USD';
  balance?: number;
  isDefault?: boolean;
  isSub?: boolean;
}

export interface UpdateAccountInput {
  name?: string;
  isDefault?: boolean;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  exchangeRate?: number;
  fee?: number;
  note?: string;
}

/**
 * 取得用戶所有帳戶
 */
export async function getAccounts(): Promise<Account[]> {
  const userId = getUserId();
  const result = await get<Account[]>(`/api/accounts/${userId}`);
  return result ?? [];
}

/**
 * 創建新帳戶
 */
export async function createAccount(accountData: CreateAccountInput): Promise<Account | null> {
  const userId = getUserId();
  return post<Account>(`/api/accounts/${userId}`, accountData);
}

/**
 * 更新帳戶資訊
 * 🔒 現在需要傳遞 lineUserId 進行授權驗證
 */
export async function updateAccount(
  accountId: string,
  data: UpdateAccountInput
): Promise<Account | null> {
  const lineUserId = getUserId();
  return patch<Account>(`/api/accounts/${accountId}`, {
    ...data,
    lineUserId,
  });
}

/**
 * 更新帳戶餘額
 * 🔒 現在需要傳遞 lineUserId 進行授權驗證
 */
export async function updateAccountBalance(
  accountId: string,
  amount: number,
  operation: 'add' | 'subtract'
): Promise<boolean> {
  const lineUserId = getUserId();
  return postBoolean(`/api/accounts/${accountId}/balance`, {
    amount,
    operation,
    lineUserId,
  });
}

/**
 * 刪除帳戶
 * 🔒 現在需要傳遞 lineUserId 進行授權驗證
 */
export async function deleteAccount(accountId: string): Promise<boolean> {
  const lineUserId = getUserId();
  return delWithQuery(`/api/accounts/${accountId}`, { lineUserId });
}

/**
 * 創建轉帳記錄
 */
export async function createTransfer(transferData: CreateTransferInput): Promise<Transfer | null> {
  const userId = getUserId();
  return post<Transfer>(`/api/transfers/${userId}`, transferData);
}

/**
 * 取得轉帳記錄
 */
export async function getTransfers(limit = 20): Promise<Transfer[]> {
  const userId = getUserId();
  const result = await get<Transfer[]>(`/api/transfers/${userId}?limit=${limit}`);
  return result ?? [];
}
