import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./core/http', () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  patch: vi.fn(),
  postBoolean: vi.fn(),
}));

vi.mock('./user.service', () => ({
  getUserId: vi.fn(() => 'user123'),
}));

import { get, post, del, patch, postBoolean } from './core/http';
import { getAccounts, createAccount, deleteAccount, createTransfer, updateAccount, updateAccountBalance, getTransfers } from './account.service';

beforeEach(() => vi.resetAllMocks());

describe('getAccounts', () => {
  it('returns accounts array', async () => {
    const mockAccounts = [{ id: 'acc1', name: '現金', balance: 1000 }];
    vi.mocked(get).mockResolvedValue(mockAccounts);
    const result = await getAccounts();
    expect(result).toEqual(mockAccounts);
  });

  it('returns empty array when GET returns null', async () => {
    vi.mocked(get).mockResolvedValue(null);
    const result = await getAccounts();
    expect(result).toEqual([]);
  });

  it('includes userId in the URL', async () => {
    vi.mocked(get).mockResolvedValue([]);
    await getAccounts();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('user123'));
  });
});

describe('createAccount', () => {
  it('posts with required fields', async () => {
    const newAcc = { id: 'acc2', name: '銀行', type: 'BANK', currency: 'TWD', balance: 0, isDefault: false, isSub: false, createdAt: '' };
    vi.mocked(post).mockResolvedValue(newAcc);
    const result = await createAccount({ name: '銀行', type: 'BANK', currency: 'TWD' });
    expect(post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: '銀行', type: 'BANK' }));
    expect(result).toEqual(newAcc);
  });

  it('returns null when POST returns null', async () => {
    vi.mocked(post).mockResolvedValue(null);
    const result = await createAccount({ name: '現金', type: 'CASH', currency: 'TWD' });
    expect(result).toBeNull();
  });

  it('passes optional balance when provided', async () => {
    vi.mocked(post).mockResolvedValue(null);
    await createAccount({ name: '現金', type: 'CASH', currency: 'TWD', balance: 5000 });
    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ balance: 5000 })
    );
  });
});

describe('deleteAccount', () => {
  it('calls DELETE with accountId', async () => {
    vi.mocked(del).mockResolvedValue(true);
    await deleteAccount('acc1');
    expect(del).toHaveBeenCalledWith(expect.stringContaining('acc1'));
  });

  it('returns boolean result from del', async () => {
    vi.mocked(del).mockResolvedValue(false);
    const result = await deleteAccount('acc1');
    expect(result).toBe(false);
  });
});

describe('createTransfer', () => {
  it('calls POST with transfer details', async () => {
    vi.mocked(post).mockResolvedValue({ id: 'tr1' });
    await createTransfer({ fromAccountId: 'acc1', toAccountId: 'acc2', amount: 500 });
    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ fromAccountId: 'acc1', toAccountId: 'acc2', amount: 500 })
    );
  });

  it('passes optional exchangeRate and fee', async () => {
    vi.mocked(post).mockResolvedValue({ id: 'tr2' });
    await createTransfer({ fromAccountId: 'acc1', toAccountId: 'acc2', amount: 1000, exchangeRate: 30.5, fee: 10 });
    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ exchangeRate: 30.5, fee: 10 })
    );
  });
});

describe('updateAccount', () => {
  it('calls PATCH with accountId and update data', async () => {
    const updated = { id: 'acc1', name: '新名稱', type: 'CASH' as const, currency: 'TWD' as const, balance: 0, isDefault: false, isSub: false, createdAt: '' };
    vi.mocked(patch).mockResolvedValue(updated);
    const result = await updateAccount('acc1', { name: '新名稱' });
    expect(patch).toHaveBeenCalledWith(
      expect.stringContaining('acc1'),
      expect.objectContaining({ name: '新名稱' })
    );
    expect(result).toEqual(updated);
  });
});

describe('updateAccountBalance', () => {
  it('calls postBoolean with amount and operation', async () => {
    vi.mocked(postBoolean).mockResolvedValue(true);
    const result = await updateAccountBalance('acc1', 200, 'add');
    expect(postBoolean).toHaveBeenCalledWith(
      expect.stringContaining('acc1'),
      expect.objectContaining({ amount: 200, operation: 'add' })
    );
    expect(result).toBe(true);
  });
});

describe('getTransfers', () => {
  it('returns transfers array with default limit', async () => {
    const mockTransfers = [{ id: 'tr1', amount: 500 }];
    vi.mocked(get).mockResolvedValue(mockTransfers);
    const result = await getTransfers();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('limit=20'));
    expect(result).toEqual(mockTransfers);
  });

  it('returns empty array when GET returns null', async () => {
    vi.mocked(get).mockResolvedValue(null);
    const result = await getTransfers();
    expect(result).toEqual([]);
  });
});
