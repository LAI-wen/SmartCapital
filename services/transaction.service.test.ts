import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./core/http', () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  delWithQuery: vi.fn(),
}));

vi.mock('./user.service', () => ({
  getUserId: vi.fn(() => 'user123'),
}));

import { get, post, delWithQuery } from './core/http';
import { getTransactions, createTransaction, deleteTransaction, batchDeleteTransactions } from './transaction.service';

beforeEach(() => vi.resetAllMocks());

describe('getTransactions', () => {
  it('calls GET with correct limit', async () => {
    vi.mocked(get).mockResolvedValue([]);
    const result = await getTransactions(100);
    expect(get).toHaveBeenCalledWith(expect.stringContaining('limit=100'));
    expect(result).toEqual([]);
  });

  it('defaults to 50 transactions', async () => {
    vi.mocked(get).mockResolvedValue([]);
    await getTransactions();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('limit=50'));
  });

  it('returns empty array when GET returns null', async () => {
    vi.mocked(get).mockResolvedValue(null);
    const result = await getTransactions();
    expect(result).toEqual([]);
  });

  it('includes userId in the URL', async () => {
    vi.mocked(get).mockResolvedValue([]);
    await getTransactions();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('user123'));
  });
});

describe('createTransaction', () => {
  it('calls POST with correct positional arguments', async () => {
    const mockTx = { id: 'tx1', type: 'expense', amount: 100, category: '飲食', date: '2024-01-01', note: '', accountId: 'acc1' };
    vi.mocked(post).mockResolvedValue(mockTx);
    const result = await createTransaction('expense', 100, '飲食', '2024-01-01');
    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ type: 'expense', amount: 100, category: '飲食' })
    );
    expect(result).toEqual(mockTx);
  });

  it('includes optional note and accountId when provided', async () => {
    vi.mocked(post).mockResolvedValue(null);
    await createTransaction('income', 500, '薪資', '2024-01-15', '月薪', 'acc2');
    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ note: '月薪', accountId: 'acc2' })
    );
  });

  it('returns null when POST returns null', async () => {
    vi.mocked(post).mockResolvedValue(null);
    const result = await createTransaction('expense', 50, '交通', '2024-01-01');
    expect(result).toBeNull();
  });
});

describe('deleteTransaction', () => {
  it('calls delWithQuery with transactionId in URL', async () => {
    vi.mocked(delWithQuery).mockResolvedValue(true);
    await deleteTransaction('tx123');
    expect(delWithQuery).toHaveBeenCalledWith(
      expect.stringContaining('tx123'),
      expect.any(Object)
    );
  });

  it('passes skipBalanceUpdate=false by default', async () => {
    vi.mocked(delWithQuery).mockResolvedValue(true);
    await deleteTransaction('tx123');
    expect(delWithQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ skipBalanceUpdate: 'false' })
    );
  });

  it('passes skipBalanceUpdate=true when specified', async () => {
    vi.mocked(delWithQuery).mockResolvedValue(true);
    await deleteTransaction('tx123', true);
    expect(delWithQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ skipBalanceUpdate: 'true' })
    );
  });
});

describe('batchDeleteTransactions', () => {
  it('calls POST batch-delete with ids array', async () => {
    vi.mocked(post).mockResolvedValue({ deletedCount: 2, totalRequested: 2 });
    const result = await batchDeleteTransactions(['tx1', 'tx2']);
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('batch-delete'),
      expect.objectContaining({ transactionIds: ['tx1', 'tx2'] })
    );
    expect(result).toEqual({ deletedCount: 2, totalRequested: 2 });
  });

  it('returns null when POST returns null', async () => {
    vi.mocked(post).mockResolvedValue(null);
    const result = await batchDeleteTransactions(['tx1']);
    expect(result).toBeNull();
  });

  it('passes skipBalanceUpdate in request body', async () => {
    vi.mocked(post).mockResolvedValue({ deletedCount: 1, totalRequested: 1 });
    await batchDeleteTransactions(['tx1'], true);
    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ skipBalanceUpdate: true })
    );
  });
});
