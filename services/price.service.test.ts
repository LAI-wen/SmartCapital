import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLivePrices, clearPriceCache } from './price.service';
import type { Asset } from '../types';

type AssetStub = Pick<Asset, 'symbol' | 'currency' | 'type' | 'currentPrice'>;

const a = (stub: AssetStub): Asset => ({
  id: 'test',
  name: 'Test',
  quantity: 1,
  avgPrice: 0,
  change24h: 0,
  history: [],
  ...stub,
});

beforeEach(() => {
  clearPriceCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('cache', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns cached price without re-fetching within TTL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ msgArray: [{ c: '2330', z: '950' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const asset = a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 900 });
    await fetchLivePrices([asset]);
    await fetchLivePrices([asset]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after TTL expires', async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ msgArray: [{ c: '2330', z: '950' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const asset = a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 900 });
    await fetchLivePrices([asset]);
    vi.setSystemTime(Date.now() + 61_000); // TTL is 60s; 61s guarantees expiry
    await fetchLivePrices([asset]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('TWSE', () => {
  it('parses price from msgArray', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ msgArray: [{ c: '2330', z: '950' }] }),
    }));

    const { prices } = await fetchLivePrices([
      a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 0 }),
    ]);

    expect(prices.get('2330')).toBe(950);
  });
});

describe('CoinGecko', () => {
  it('parses BTC price from response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 65000 } }),
    }));

    const { prices } = await fetchLivePrices([
      a({ symbol: 'BTC', currency: 'USD', type: 'Crypto', currentPrice: 0 }),
    ]);

    expect(prices.get('BTC')).toBe(65000);
  });
});

describe('Finnhub', () => {
  it('falls back to currentPrice when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const asset = a({ symbol: 'AAPL', currency: 'USD', type: 'Stock', currentPrice: 175 });
    const { prices, anyFailed } = await fetchLivePrices([asset]);

    expect(anyFailed).toBe(true);
    expect(prices.get('AAPL')).toBe(175);
  });
});

describe('fetchLivePrices', () => {
  it('returns prices for mixed TW, Crypto, and US assets', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('twse.com.tw')) {
        return Promise.resolve({ ok: true, json: async () => ({ msgArray: [{ c: '2330', z: '900' }] }) });
      }
      if (url.includes('coingecko.com')) {
        return Promise.resolve({ ok: true, json: async () => ({ bitcoin: { usd: 60000 } }) });
      }
      if (url.includes('finnhub.io')) {
        return Promise.resolve({ ok: true, json: async () => ({ c: 180 }) });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }));

    const assets = [
      a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 0 }),
      a({ symbol: 'BTC', currency: 'USD', type: 'Crypto', currentPrice: 0 }),
      a({ symbol: 'AAPL', currency: 'USD', type: 'Stock', currentPrice: 0 }),
    ];
    const { prices, anyFailed } = await fetchLivePrices(assets);

    expect(prices.get('2330')).toBe(900);
    expect(prices.get('BTC')).toBe(60000);
    expect(prices.get('AAPL')).toBe(180);
    expect(anyFailed).toBe(false);
  });
});
