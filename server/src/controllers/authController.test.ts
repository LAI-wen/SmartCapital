import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { guestLogin, lineLogin, refreshToken } from './authController.js';
import { prisma } from '../services/databaseService.js';
import {
  generateGuestTokens,
  generateAuthTokens,
  verifyLineIdToken,
  verifyToken,
  refreshAccessToken,
} from '../services/authService.js';

vi.mock('../services/databaseService.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../services/authService.js', () => ({
  generateGuestTokens: vi.fn(),
  generateAuthTokens: vi.fn(),
  verifyLineIdToken: vi.fn(),
  verifyToken: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

const LINE_USER_ID = 'U' + 'a'.repeat(32);
const mockTokens = { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', expiresIn: 604800 };
const mockUser = { lineUserId: LINE_USER_ID, displayName: '測試用戶', bankroll: 10000 };

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

// ─── guestLogin ────────────────────────────────────────────────────────────

describe('guestLogin', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never);
    vi.mocked(generateGuestTokens).mockReturnValue(mockTokens);
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

  it('accepts valid mock guest ID and returns tokens', async () => {
    const validId = 'U' + 'a1b2c3d4'.repeat(4);
    const req = { body: { mockUserId: validId, displayName: '訪客' } } as Request;
    await guestLogin(req, res);
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ success: true });
  });
});

// ─── lineLogin ─────────────────────────────────────────────────────────────

describe('lineLogin', () => {
  let res: Response;
  const LINE_B = 'U' + 'b'.repeat(32);
  const lineUser = { lineUserId: LINE_B, displayName: '測試', bankroll: 10000 };

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
    vi.mocked(verifyLineIdToken).mockResolvedValue({ userId: LINE_B, displayName: '測試', pictureUrl: '' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(lineUser as never);
    vi.mocked(generateAuthTokens).mockReturnValue(mockTokens);
  });

  it('rejects missing idToken with 400', async () => {
    const req = { body: { lineUserId: LINE_B } } as Request;
    await lineLogin(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
  });

  it('rejects missing lineUserId with 400', async () => {
    const req = { body: { idToken: 'token' } } as Request;
    await lineLogin(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
  });

  it('rejects invalid LINE ID Token with 401', async () => {
    vi.mocked(verifyLineIdToken).mockResolvedValue(null);
    const req = { body: { idToken: 'bad', lineUserId: LINE_B } } as Request;
    await lineLogin(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(401);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: false,
      error: expect.stringContaining('Invalid'),
    });
  });

  it('rejects lineUserId mismatch with 401', async () => {
    vi.mocked(verifyLineIdToken).mockResolvedValue({
      userId: 'U' + 'z'.repeat(32),
      displayName: '他人',
      pictureUrl: '',
    });
    const req = { body: { idToken: 'token', lineUserId: LINE_B } } as Request;
    await lineLogin(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(401);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: false,
      error: expect.stringContaining('mismatch'),
    });
  });

  it('creates new user on first login', async () => {
    const req = { body: { idToken: 'token', lineUserId: LINE_B, displayName: '新用戶' } } as Request;
    await lineLogin(req, res);
    expect(prisma.user.create).toHaveBeenCalledOnce();
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: true,
      data: expect.objectContaining({ accessToken: 'mock-access-token' }),
    });
  });

  it('updates existing user on subsequent login', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(lineUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue(lineUser as never);
    const req = { body: { idToken: 'token', lineUserId: LINE_B } } as Request;
    await lineLogin(req, res);
    expect(prisma.user.update).toHaveBeenCalledOnce();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ success: true });
  });
});

// ─── refreshToken ──────────────────────────────────────────────────────────

describe('refreshToken', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
  });

  it('rejects missing refreshToken with 400', async () => {
    const req = { body: {} } as Request;
    await refreshToken(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
  });

  it('rejects invalid token with 401', async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const req = { body: { refreshToken: 'bad' } } as Request;
    await refreshToken(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(401);
  });

  it('rejects non-refresh token type with 401', async () => {
    vi.mocked(verifyToken).mockReturnValue({ lineUserId: LINE_USER_ID, type: 'access' } as never);
    const req = { body: { refreshToken: 'access-token' } } as Request;
    await refreshToken(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(401);
  });

  it('rejects when refreshAccessToken returns null with 401', async () => {
    vi.mocked(verifyToken).mockReturnValue({ lineUserId: LINE_USER_ID, type: 'refresh' } as never);
    vi.mocked(refreshAccessToken).mockReturnValue(null);
    const req = { body: { refreshToken: 'valid' } } as Request;
    await refreshToken(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(401);
  });

  it('returns new accessToken on success', async () => {
    vi.mocked(verifyToken).mockReturnValue({ lineUserId: LINE_USER_ID, type: 'refresh' } as never);
    vi.mocked(refreshAccessToken).mockReturnValue('new-access-token');
    const req = { body: { refreshToken: 'valid' } } as Request;
    await refreshToken(req, res);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: true,
      data: { accessToken: 'new-access-token' },
    });
  });
});
