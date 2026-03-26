/**
 * Budget Service - 預算設定相關 API
 */

import { get, put, del } from './core/http';
import { getUserId } from './user.service';

export interface Budget {
  id: string;
  category: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export async function getBudgets(): Promise<Budget[]> {
  const userId = getUserId();
  const result = await get<Budget[]>(`/api/budgets/${userId}`);
  return result ?? [];
}

export async function setBudget(category: string, amount: number): Promise<Budget | null> {
  const userId = getUserId();
  return put<Budget>(`/api/budgets/${userId}`, { category, amount });
}

export async function removeBudget(category: string): Promise<boolean> {
  const userId = getUserId();
  return del(`/api/budgets/${userId}/${encodeURIComponent(category)}`);
}
