import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import {
  createTransaction,
  deleteTransaction,
  batchDeleteTransactions,
} from './apiController.js';
import { getOrCreateUser, createTransaction as dbCreate, prisma } from '../services/databaseService.js';

vi.mock('../services/databaseService.js', () => ({
  getOrCreateUser: vi.fn(),
  createTransaction: vi.fn(),
  prisma: {
    transaction: { findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
    priceAlert: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const LINE_USER_ID = 'U' + 'c'.repeat(32);
const mockAccount = { id: 'acct-1', balance: 5000 };

const mockTx = {
  account: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  transaction: { delete: vi.fn() },
};

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

function makeAuthReq(
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): Request {
  return { body, params, query, user: { lineUserId: LINE_USER_ID } } as unknown as Request;
}

// ─── createTransaction ─────────────────────────────────────────────────────

describe('createTransaction', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
    vi.mocked(getOrCreateUser).mockResolvedValue({ id: 'user-1', lineUserId: LINE_USER_ID } as never);
    vi.mocked(dbCreate).mockResolvedValue({
      id: 'txn-1', accountId: 'acct-1', date: new Date(),
      type: 'expense', amount: 100, category: '餐飲', note: '',
    } as never);
  });

  it('creates transaction and returns data on success', async () => {
    const req = makeAuthReq(
      { type: 'expense', amount: 100, category: '餐飲', accountId: 'acct-1' },
      { lineUserId: LINE_USER_ID },
    );
    await createTransaction(req, res);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: true,
      data: expect.objectContaining({ id: 'txn-1', type: 'expense' }),
    });
  });
});

// ─── deleteTransaction ─────────────────────────────────────────────────────

describe('deleteTransaction', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
    mockTx.account.findUnique.mockResolvedValue(mockAccount);
    mockTx.account.update.mockResolvedValue(mockAccount);
    mockTx.transaction.delete.mockResolvedValue({});
    vi.mocked(prisma.$transaction).mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );
  });

  it('returns 401 when not authenticated', async () => {
    const req = {
      params: { transactionId: 'txn-1' },
      query: { lineUserId: LINE_USER_ID },
      body: {},
      user: undefined,
    } as unknown as Request;
    await deleteTransaction(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(401);
  });

  it('returns 404 when transaction not found', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(null);
    const req = makeAuthReq({}, { transactionId: 'missing' }, { lineUserId: LINE_USER_ID });
    await deleteTransaction(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(404);
  });

  it('returns 403 when deleting another user\'s transaction', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      id: 'txn-1', accountId: 'acct-1', type: 'expense', amount: 100,
      user: { lineUserId: 'U' + 'z'.repeat(32) },
    } as never);
    const req = makeAuthReq({}, { transactionId: 'txn-1' }, { lineUserId: LINE_USER_ID });
    await deleteTransaction(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(403);
  });

  it('rolls back balance when deleting an expense (balance increases)', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      id: 'txn-1', accountId: 'acct-1', type: 'expense', amount: 200,
      user: { lineUserId: LINE_USER_ID },
    } as never);
    const req = makeAuthReq({}, { transactionId: 'txn-1' }, { lineUserId: LINE_USER_ID });
    await deleteTransaction(req, res);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(mockTx.account.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { balance: 5200 } }),
    );
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ success: true });
  });

  it('rolls back balance when deleting an income (balance decreases)', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      id: 'txn-2', accountId: 'acct-1', type: 'income', amount: 300,
      user: { lineUserId: LINE_USER_ID },
    } as never);
    const req = makeAuthReq({}, { transactionId: 'txn-2' }, { lineUserId: LINE_USER_ID });
    await deleteTransaction(req, res);
    expect(mockTx.account.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { balance: 4700 } }),
    );
  });

  it('skips balance rollback when skipBalanceUpdate=true', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      id: 'txn-1', accountId: 'acct-1', type: 'expense', amount: 100,
      user: { lineUserId: LINE_USER_ID },
    } as never);
    vi.mocked(prisma.transaction.delete).mockResolvedValue({} as never);
    const req = makeAuthReq(
      {},
      { transactionId: 'txn-1' },
      { lineUserId: LINE_USER_ID, skipBalanceUpdate: 'true' },
    );
    await deleteTransaction(req, res);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.transaction.delete).toHaveBeenCalledOnce();
  });
});

// ─── batchDeleteTransactions ───────────────────────────────────────────────

describe('batchDeleteTransactions', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
    mockTx.account.findUnique.mockResolvedValue(mockAccount);
    mockTx.account.update.mockResolvedValue(mockAccount);
    mockTx.transaction.delete.mockResolvedValue({});
    vi.mocked(prisma.$transaction).mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );
  });

  it('returns 404 when no transactions found', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
    const req = makeAuthReq({ transactionIds: ['missing'], lineUserId: LINE_USER_ID });
    await batchDeleteTransactions(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(404);
  });

  it('returns 403 when any transaction belongs to another user', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      { id: 'txn-1', accountId: null, type: 'expense', amount: 100,
        user: { lineUserId: 'U' + 'z'.repeat(32) } },
    ] as never);
    const req = makeAuthReq({ transactionIds: ['txn-1'], lineUserId: LINE_USER_ID });
    await batchDeleteTransactions(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(403);
  });

  it('deletes transactions with balance rollback and reports count', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      { id: 'txn-1', accountId: 'acct-1', type: 'expense', amount: 100, user: { lineUserId: LINE_USER_ID } },
      { id: 'txn-2', accountId: 'acct-1', type: 'income', amount: 200, user: { lineUserId: LINE_USER_ID } },
    ] as never);
    const req = makeAuthReq({ transactionIds: ['txn-1', 'txn-2'], lineUserId: LINE_USER_ID });
    await batchDeleteTransactions(req, res);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: true,
      data: { deletedCount: 2 },
    });
  });

  it('skips balance rollback when skipBalanceUpdate=true', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      { id: 'txn-1', accountId: 'acct-1', type: 'expense', amount: 100, user: { lineUserId: LINE_USER_ID } },
    ] as never);
    vi.mocked(prisma.transaction.delete).mockResolvedValue({} as never);
    const req = makeAuthReq({
      transactionIds: ['txn-1'],
      lineUserId: LINE_USER_ID,
      skipBalanceUpdate: true,
    });
    await batchDeleteTransactions(req, res);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.transaction.delete).toHaveBeenCalledOnce();
  });
});
