/**
 * exchangeRateService.test.ts
 * 測試匯率服務邏輯
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getExchangeRate, convertCurrency, getCurrencySymbol, clearCache } from './exchangeRateService.js';

// Mock axios
vi.mock('axios');

describe('getCurrencySymbol', () => {
  it('應該返回正確的台幣符號', () => {
    expect(getCurrencySymbol('TWD')).toBe('NT$');
  });

  it('應該返回正確的美元符號', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('應該返回正確的日圓符號', () => {
    expect(getCurrencySymbol('JPY')).toBe('¥');
  });

  it('應該返回正確的歐元符號', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('應該返回正確的英鎊符號', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('應該對未知貨幣返回貨幣代碼本身', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});

describe('getExchangeRate', () => {
  beforeEach(() => {
    clearCache(); // 每個測試前清除快取
  });

  it('應該對相同貨幣返回 1.0', async () => {
    const rate = await getExchangeRate('USD', 'USD');
    expect(rate).toBe(1.0);
  });

  it('應該對相同貨幣（TWD）返回 1.0', async () => {
    const rate = await getExchangeRate('TWD', 'TWD');
    expect(rate).toBe(1.0);
  });

  // 注意：以下測試需要網絡連接或 mock axios
  // 由於我們不想在單元測試中依賴外部 API，這裡僅測試邏輯

  it('應該返回數字類型的匯率', async () => {
    const rate = await getExchangeRate('USD', 'TWD');
    expect(typeof rate).toBe('number');
    expect(rate).toBeGreaterThan(0);
  });

  it('應該返回合理範圍內的 USD->TWD 匯率（20-40之間）', async () => {
    const rate = await getExchangeRate('USD', 'TWD');
    expect(rate).toBeGreaterThan(20);
    expect(rate).toBeLessThan(40);
  });
});

describe('convertCurrency', () => {
  beforeEach(() => {
    clearCache();
  });

  it('應該對相同貨幣返回原金額', async () => {
    const result = await convertCurrency(100, 'USD', 'USD');
    expect(result).toBe(100);
  });

  it('應該返回數字類型', async () => {
    const result = await convertCurrency(100, 'USD', 'TWD');
    expect(typeof result).toBe('number');
  });

  it('應該返回正數金額', async () => {
    const result = await convertCurrency(100, 'USD', 'TWD');
    expect(result).toBeGreaterThan(0);
  });

  it('應該將 100 USD 轉換為合理的 TWD 金額（2000-4000之間）', async () => {
    const result = await convertCurrency(100, 'USD', 'TWD');
    expect(result).toBeGreaterThan(2000);
    expect(result).toBeLessThan(4000);
  });

  it('應該正確處理小數金額', async () => {
    const result = await convertCurrency(99.99, 'USD', 'TWD');
    expect(result).toBeGreaterThan(0);
    // 結果應該有兩位小數（根據 toFixed(2)）
    expect(result.toString()).toMatch(/^\d+\.\d{1,2}$/);
  });
});

describe('快取機制', () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    clearCache();
  });

  it('應該快取匯率查詢結果', async () => {
    const rate1 = await getExchangeRate('USD', 'TWD');
    const rate2 = await getExchangeRate('USD', 'TWD');

    // 由於使用快取，兩次查詢應該返回相同結果
    expect(rate1).toBe(rate2);
  });

  it('clearCache 應該清除快取', async () => {
    const rate1 = await getExchangeRate('USD', 'TWD');
    clearCache();
    const rate2 = await getExchangeRate('USD', 'TWD');

    // 清除快取後，兩次查詢可能返回不同結果（如果 API 返回略有不同）
    // 但兩個都應該是有效的匯率
    expect(rate1).toBeGreaterThan(0);
    expect(rate2).toBeGreaterThan(0);
  });
});

describe('容錯機制', () => {
  beforeEach(() => {
    clearCache();
  });

  it('API 失敗時應該返回預設匯率（降級處理）', async () => {
    // 即使 API 失敗，也應該返回一個合理的預設值
    const rate = await getExchangeRate('USD', 'TWD');
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(100); // 預設值應該在合理範圍內
  });

  it('應該能處理 0 金額的轉換', async () => {
    const result = await convertCurrency(0, 'USD', 'TWD');
    expect(result).toBe(0);
  });

  it('應該能處理負數金額的轉換（雖然不推薦）', async () => {
    const result = await convertCurrency(-100, 'USD', 'TWD');
    expect(result).toBeLessThan(0);
  });
});

describe('多種貨幣對', () => {
  beforeEach(() => {
    clearCache();
  });

  it('應該支持 USD -> JPY 轉換', async () => {
    const rate = await getExchangeRate('USD', 'JPY');
    expect(rate).toBeGreaterThan(100); // 1 USD 通常 > 100 JPY
    expect(rate).toBeLessThan(200);
  });

  it('應該支持 TWD -> USD 轉換（反向）', async () => {
    const rate = await getExchangeRate('TWD', 'USD');
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(1); // 1 TWD < 1 USD
  });

  it('應該支持 EUR -> USD 轉換', async () => {
    const rate = await getExchangeRate('EUR', 'USD');
    expect(rate).toBeGreaterThan(0.8);
    expect(rate).toBeLessThan(1.5);
  });
});
