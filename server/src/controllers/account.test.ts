import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createNewTransfer } from './apiController.js';
import { getOrCreateUser, createTransfer, prisma } from '../services/databaseService.js';

vi.mock('../services/databaseService.js', () => ({
  getOrCreateUser: vi.fn(),
  createTransfer: vi.fn(),
  prisma: {
    transaction: { findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
    priceAlert: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const LINE_USER_ID = 'U' + 'd'.repeat(32);
const FROM_ACCOUNT_ID = 'acct-from';
const TO_ACCOUNT_ID = 'acct-to';
const mockTransfer = {
  id: 'transfer-1',
  fromAccountId: FROM_ACCOUNT_ID,
  toAccountId: TO_ACCOUNT_ID,
  amount: 1000,
  exchangeRate: null,
  fee: null,
  note: null,
  date: new Date(),
};

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

function makeAuthReq(body: Record<string, unknown>, params: Record<string, string> = {}): Request {
  return { body, params, query: {}, user: { lineUserId: LINE_USER_ID } } as unknown as Request;
}

describe('createNewTransfer', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
    vi.mocked(getOrCreateUser).mockResolvedValue({ id: 'user-1', lineUserId: LINE_USER_ID } as never);
    vi.mocked(createTransfer).mockResolvedValue(mockTransfer as never);
  });

  it('rejects missing fromAccountId with 400', async () => {
    const req = makeAuthReq(
      { toAccountId: TO_ACCOUNT_ID, amount: 500 },
      { lineUserId: LINE_USER_ID },
    );
    await createNewTransfer(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: false,
      error: expect.stringContaining('Missing'),
    });
  });

  it('rejects missing toAccountId with 400', async () => {
    const req = makeAuthReq(
      { fromAccountId: FROM_ACCOUNT_ID, amount: 500 },
      { lineUserId: LINE_USER_ID },
    );
    await createNewTransfer(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
  });

  it('rejects negative amount with 400', async () => {
    const req = makeAuthReq(
      { fromAccountId: FROM_ACCOUNT_ID, toAccountId: TO_ACCOUNT_ID, amount: -100 },
      { lineUserId: LINE_USER_ID },
    );
    await createNewTransfer(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: false,
      error: expect.stringContaining('positive'),
    });
  });

  it('returns 400 when service throws insufficient balance error', async () => {
    vi.mocked(createTransfer).mockRejectedValue(
      new Error('轉出帳戶餘額不足 (需要 1500，僅有 500)'),
    );
    const req = makeAuthReq(
      { fromAccountId: FROM_ACCOUNT_ID, toAccountId: TO_ACCOUNT_ID, amount: 1500 },
      { lineUserId: LINE_USER_ID },
    );
    await createNewTransfer(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(400);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: false,
      error: expect.stringContaining('餘額不足'),
    });
  });

  it('creates transfer and returns data on success', async () => {
    const req = makeAuthReq(
      { fromAccountId: FROM_ACCOUNT_ID, toAccountId: TO_ACCOUNT_ID, amount: 1000, note: '零用錢' },
      { lineUserId: LINE_USER_ID },
    );
    await createNewTransfer(req, res);
    expect(createTransfer).toHaveBeenCalledOnce();
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: true,
      data: expect.objectContaining({
        fromAccountId: FROM_ACCOUNT_ID,
        toAccountId: TO_ACCOUNT_ID,
        amount: 1000,
      }),
    });
  });
});
