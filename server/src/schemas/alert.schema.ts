import { z } from 'zod';

export const createPriceAlertSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().optional(),
  alertType: z.string().min(1),
  threshold: z.number().optional(),
  targetPrice: z.number().optional(),
  direction: z.string().optional(),
  referencePrice: z.number().optional(),
});

export const updatePriceAlertSchema = z.object({
  isActive: z.boolean(),
  lineUserId: z.string().min(1),
});
