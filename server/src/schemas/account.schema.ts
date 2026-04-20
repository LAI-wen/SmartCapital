import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CASH', 'BANK', 'BROKERAGE', 'EXCHANGE']),
  currency: z.enum(['TWD', 'USD']),
  balance: z.number().optional().default(0),
  isDefault: z.boolean().optional().default(false),
  isSub: z.boolean().optional().default(false),
});

export const updateAccountInfoSchema = z.object({
  name: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  lineUserId: z.string().min(1),
});

export const updateBalanceSchema = z.object({
  amount: z.number(),
  operation: z.enum(['add', 'subtract']),
  lineUserId: z.string().min(1),
});

export const createTransferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  exchangeRate: z.number().optional(),
  fee: z.number().optional(),
  note: z.string().optional(),
});
