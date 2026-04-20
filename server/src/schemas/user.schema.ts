import { z } from 'zod';

export const updateUserSettingsSchema = z.object({
  enableTWStock: z.boolean().optional(),
  enableUSStock: z.boolean().optional(),
  enableCrypto: z.boolean().optional(),
});

export const upsertAssetSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  quantity: z.number().positive(),
  avgPrice: z.number().positive(),
  currency: z.string().optional(),
});

export const reduceAssetSchema = z.object({
  symbol: z.string().min(1),
  quantity: z.number().positive('Quantity must be > 0'),
});

export const importAssetSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  quantity: z.number().positive(),
  avgPrice: z.number().positive(),
  currency: z.string().min(1),
});
