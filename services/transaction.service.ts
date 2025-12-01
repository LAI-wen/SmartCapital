/**
 * Transaction Service - 交易記錄相關 API
 */

import { get, post, delWithQuery } from './core/http';
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

export interface BatchDeleteResult {
  deletedCount: number;
  totalRequested: number;
  errors?: string[];
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
 * 🔒 現在需要傳遞 lineUserId 進行授權驗證
 */
export async function deleteTransaction(transactionId: string): Promise<boolean> {
  const lineUserId = getUserId();
  return delWithQuery(`/api/transactions/${transactionId}`, { lineUserId });
}

/**
 * 批次刪除交易記錄
 * 🔒 需要傳遞 lineUserId 進行授權驗證
 */
export async function batchDeleteTransactions(transactionIds: string[]): Promise<BatchDeleteResult | null> {
  const lineUserId = getUserId();

  const result = await post<BatchDeleteResult>('/api/transactions/batch-delete', {
    lineUserId,
    transactionIds,
  });

  if (result) {
    console.log(`✅ 批次刪除成功: ${result.deletedCount}/${result.totalRequested} 筆`);
    if (result.errors && result.errors.length > 0) {
      console.warn('⚠️ 部分刪除失敗:', result.errors);
    }
  }

  return result;
}
