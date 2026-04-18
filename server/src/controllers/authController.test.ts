import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { guestLogin } from './authController.js';

vi.mock('../services/databaseService.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        lineUserId: 'U' + 'a'.repeat(32),
        displayName: '訪客用戶',
        bankroll: 10000,
      }),
    },
  },
}));

vi.mock('../services/authService.js', () => ({
  generateGuestTokens: vi.fn().mockReturnValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }),
}));

function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

describe('guestLogin', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
  });

  it('rejects missing mockUserId with 400', async () => {
    const req = { body: {} } as Request;
    await guestLogin(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: false,
      error: expect.stringContaining('mockUserId'),
    });
  });

  it('rejects mockUserId that is too short', async () => {
    const req = { body: { mockUserId: 'Uabc123' } } as Request;
    await guestLogin(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: false,
      error: expect.stringContaining('format'),
    });
  });

  it('rejects mockUserId with uppercase hex (must be lowercase)', async () => {
    const req = { body: { mockUserId: 'U' + 'A'.repeat(32) } } as Request;
    await guestLogin(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
  });

  it('rejects mockUserId without leading U', async () => {
    const req = { body: { mockUserId: 'a'.repeat(33) } } as Request;
    await guestLogin(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
  });

  it('accepts valid mock guest ID (U + 32 lowercase hex)', async () => {
    const validId = 'U' + 'a1b2c3d4'.repeat(4);
    const req = { body: { mockUserId: validId, displayName: '訪客' } } as Request;
    await guestLogin(req, res);
    expect(res.status as ReturnType<typeof vi.fn>).not.toHaveBeenCalledWith(400);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: true,
    });
  });
});
