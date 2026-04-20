import { z } from 'zod';

export const setBudgetSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
});
