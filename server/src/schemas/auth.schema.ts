import { z } from 'zod';

export const lineLoginSchema = z.object({
  idToken: z.string().min(1),
  lineUserId: z.string().min(1),
  displayName: z.string().optional(),
  pictureUrl: z.string().optional(),
});

export const guestLoginSchema = z.object({
  mockUserId: z.string().regex(/^U[0-9a-f]{32}$/, 'Invalid mockUserId format'),
  displayName: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
