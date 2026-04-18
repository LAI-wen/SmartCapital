import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrencySymbol,
  formatCurrencyAmount,
  getExchangeRate,
  convertCurrency,
} from './exchangeRateService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCurrencySymbol', () => {
  it('returns NT$ for TWD', () => {
    expect(getCurrencySymbol('TWD')).toBe('NT$');
  });

  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns ¥ for JPY', () => {
    expect(getCurrencySymbol('JPY')).toBe('¥');
  });

  it('returns the code itself for unknown currencies', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});

describe('formatCurrencyAmount', () => {
  it('formats USD amount with $ symbol', () => {
    expect(formatCurrencyAmount(50, 'USD')).toBe('$50');
  });

  it('formats TWD amount with NT$ symbol', () => {
    expect(formatCurrencyAmount(50, 'TWD')).toBe('NT$50');
  });

  it('formats zero correctly', () => {
    expect(formatCurrencyAmount(0, 'TWD')).toBe('NT$0');
  });
});

describe('getExchangeRate', () => {
  const TWD_RATE = 31.5;
  const JPY_RATE = 150;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: { rates: { TWD: TWD_RATE, JPY: JPY_RATE } },
      }),
    }));
  });

  it('returns 1.0 for same currency without calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await getExchangeRate('TWD', 'TWD')).toBe(1.0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns rate for USD to TWD', async () => {
    expect(await getExchangeRate('USD', 'TWD')).toBe(TWD_RATE);
  });

  it('returns reciprocal for TWD to USD', async () => {
    expect(await getExchangeRate('TWD', 'USD')).toBeCloseTo(1 / TWD_RATE);
  });

  it('returns cross rate for TWD to JPY via USD', async () => {
    expect(await getExchangeRate('TWD', 'JPY')).toBeCloseTo(JPY_RATE / TWD_RATE);
  });
});

describe('convertCurrency', () => {
  it('returns amount without calling fetch when from === to', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await convertCurrency(100, 'TWD', 'TWD')).toBe(100);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns convertedAmount from API on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: { convertedAmount: 315 },
      }),
    }));
    expect(await convertCurrency(10, 'USD', 'TWD')).toBe(315);
  });

  it('returns original amount when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    expect(await convertCurrency(100, 'USD', 'TWD')).toBe(100);
  });
});
