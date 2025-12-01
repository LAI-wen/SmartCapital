/**
 * Transaction Service - 交易記錄相關 API
 */

import { get, post, del } from './core/http';
import { getUserId } from './user.service';

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  accountId: string;
}

/**
 * 取得交易記錄
 */
export async function getTransactions(limit = 50): Promise<Transaction[]> {
  const userId = getUserId();
  const result = await get<Transaction[]>(`/api/transactions/${userId}?limit=${limit}`);
  return result ?? [];
}

/**
 * 新增交易記錄
 */
export async function createTransaction(
  type: 'income' | 'expense',
  amount: number,
  category: string,
  date: string,
  note?: string,
  accountId?: string
): Promise<Transaction | null> {
  const userId = getUserId();
  console.log('📝 Creating transaction for user:', userId, 'with accountId:', accountId);

  const result = await post<Transaction>(`/api/transactions/${userId}`, {
    type,
    amount,
    category,
    date,
    note,
    accountId,
  });

  if (result) {
    console.log('✅ Transaction created:', result);
  }

  return result;
}

/**
 * 刪除交易記錄
 */
export async function deleteTransaction(transactionId: string): Promise<boolean> {
  return del(`/api/transactions/${transactionId}`);
}
