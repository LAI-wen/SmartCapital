import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'category is required'),
  note: z.string().optional(),
  accountId: z.string().optional(),
  originalCurrency: z.string().optional(),
  exchangeRate: z.number().optional(),
  date: z.string().optional(),
});

export const batchDeleteTransactionsSchema = z.object({
  transactionIds: z.array(z.string()).min(1, 'transactionIds must be a non-empty array'),
  lineUserId: z.string().min(1, 'lineUserId is required'),
  skipBalanceUpdate: z.boolean().optional(),
});
