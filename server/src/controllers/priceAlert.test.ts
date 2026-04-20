import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import {
  createPriceAlertAPI,
  updatePriceAlertAPI,
  deletePriceAlertAPI,
} from './apiController.js';
import { getOrCreateUser, prisma } from '../services/databaseService.js';
import { createPriceAlert, updateAlertStatus, deleteAlert } from '../services/priceAlertService.js';

vi.mock('../services/databaseService.js', () => ({
  getOrCreateUser: vi.fn(),
  prisma: {
    priceAlert: { findUnique: vi.fn() },
    transaction: { findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../services/priceAlertService.js', () => ({
  getUserAlerts: vi.fn(),
  createPriceAlert: vi.fn(),
  updateAlertStatus: vi.fn(),
  deleteAlert: vi.fn(),
}));

const LINE_USER_ID = 'U' + 'e'.repeat(32);
const ALERT_ID = 'alert-1';
const mockAlert = {
  id: ALERT_ID,
  symbol: '2330',
  name: 'TSMC',
  alertType: 'PRICE_ABOVE',
  threshold: null,
  targetPrice: 900,
  direction: null,
  referencePrice: 850,
  isActive: true,
  user: { lineUserId: LINE_USER_ID },
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

// ─── createPriceAlertAPI ───────────────────────────────────────────────────

describe('createPriceAlertAPI', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
    vi.mocked(getOrCreateUser).mockResolvedValue({ id: 'user-1', lineUserId: LINE_USER_ID } as never);
    vi.mocked(createPriceAlert).mockResolvedValue(mockAlert as never);
  });

  it('creates alert and returns data on success', async () => {
    const req = makeAuthReq(
      { symbol: '2330', name: 'TSMC', alertType: 'PRICE_ABOVE', targetPrice: 900 },
      { lineUserId: LINE_USER_ID },
    );
    await createPriceAlertAPI(req, res);
    expect(createPriceAlert).toHaveBeenCalledOnce();
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: true,
      data: expect.objectContaining({ symbol: '2330' }),
    });
  });
});

// ─── updatePriceAlertAPI ───────────────────────────────────────────────────

describe('updatePriceAlertAPI', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
    vi.mocked(prisma.priceAlert.findUnique).mockResolvedValue(mockAlert as never);
    vi.mocked(updateAlertStatus).mockResolvedValue({ ...mockAlert, isActive: false } as never);
  });

  it('returns 404 when alert not found', async () => {
    vi.mocked(prisma.priceAlert.findUnique).mockResolvedValue(null);
    const req = makeAuthReq(
      { isActive: false, lineUserId: LINE_USER_ID },
      { alertId: 'missing' },
    );
    await updatePriceAlertAPI(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(404);
  });

  it('returns 403 when updating another user\'s alert', async () => {
    vi.mocked(prisma.priceAlert.findUnique).mockResolvedValue({
      ...mockAlert,
      user: { lineUserId: 'U' + 'z'.repeat(32) },
    } as never);
    const req = makeAuthReq(
      { isActive: false, lineUserId: LINE_USER_ID },
      { alertId: ALERT_ID },
    );
    await updatePriceAlertAPI(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(403);
  });

  it('updates status and returns updated alert', async () => {
    const req = makeAuthReq(
      { isActive: false, lineUserId: LINE_USER_ID },
      { alertId: ALERT_ID },
    );
    await updatePriceAlertAPI(req, res);
    expect(updateAlertStatus).toHaveBeenCalledWith(ALERT_ID, false);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      success: true,
      data: expect.objectContaining({ isActive: false }),
    });
  });
});

// ─── deletePriceAlertAPI ───────────────────────────────────────────────────

describe('deletePriceAlertAPI', () => {
  let res: Response;

  beforeEach(() => {
    res = makeRes();
    vi.clearAllMocks();
    vi.mocked(prisma.priceAlert.findUnique).mockResolvedValue(mockAlert as never);
    vi.mocked(deleteAlert).mockResolvedValue(undefined);
  });

  it('returns 404 when alert not found', async () => {
    vi.mocked(prisma.priceAlert.findUnique).mockResolvedValue(null);
    const req = makeAuthReq({}, { alertId: 'missing' }, { lineUserId: LINE_USER_ID });
    await deletePriceAlertAPI(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(404);
  });

  it('returns 403 when deleting another user\'s alert', async () => {
    vi.mocked(prisma.priceAlert.findUnique).mockResolvedValue({
      ...mockAlert,
      user: { lineUserId: 'U' + 'z'.repeat(32) },
    } as never);
    const req = makeAuthReq({}, { alertId: ALERT_ID }, { lineUserId: LINE_USER_ID });
    await deletePriceAlertAPI(req, res);
    expect((res.status as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(403);
  });

  it('deletes alert and returns success', async () => {
    const req = makeAuthReq({}, { alertId: ALERT_ID }, { lineUserId: LINE_USER_ID });
    await deletePriceAlertAPI(req, res);
    expect(deleteAlert).toHaveBeenCalledWith(ALERT_ID);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ success: true });
  });
});
