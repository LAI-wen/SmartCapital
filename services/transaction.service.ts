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
  subcategory?: string;
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
 * @param transactionId - 交易記錄 ID
 * @param skipBalanceUpdate - 是否跳過資金池更新（預設 false，即會連動資金池）
 */
export async function deleteTransaction(transactionId: string, skipBalanceUpdate: boolean = false): Promise<boolean> {
  return delWithQuery(`/api/transactions/${transactionId}`, {
    skipBalanceUpdate: skipBalanceUpdate ? 'true' : 'false'
  });
}

/**
 * 批次刪除交易記錄
 * @param transactionIds - 交易記錄 ID 陣列
 * @param skipBalanceUpdate - 是否跳過資金池更新（預設 false，即會連動資金池）
 */
export async function batchDeleteTransactions(transactionIds: string[], skipBalanceUpdate: boolean = false): Promise<BatchDeleteResult | null> {
  const result = await post<BatchDeleteResult>('/api/transactions/batch-delete', {
    transactionIds,
    skipBalanceUpdate,
  });

  if (result) {
    console.log(`✅ 批次刪除成功: ${result.deletedCount}/${result.totalRequested} 筆`);
    if (result.errors && result.errors.length > 0) {
      console.warn('⚠️ 部分刪除失敗:', result.errors);
    }
  }

  return result;
}
