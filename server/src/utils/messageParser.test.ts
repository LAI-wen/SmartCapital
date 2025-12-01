/**
 * messageParser.test.ts
 * 測試 LINE Bot 訊息解析邏輯
 */

import { describe, it, expect } from 'vitest';
import { parseMessage, validateQuantity, validateAmount } from './messageParser.js';

describe('parseMessage - 一步式記帳（支出）', () => {
  it('應該正確解析「午餐 120」', () => {
    const result = parseMessage('午餐 120');
    expect(result.type).toBe('EXPENSE_CATEGORY');
    if (result.type === 'EXPENSE_CATEGORY') {
      expect(result.category).toBe('飲食');
      expect(result.amount).toBe(120);
      expect(result.note).toBeUndefined();
    }
  });

  it('應該正確解析「咖啡 80 星巴克」（帶備註）', () => {
    const result = parseMessage('咖啡 80 星巴克');
    expect(result.type).toBe('EXPENSE_CATEGORY');
    if (result.type === 'EXPENSE_CATEGORY') {
      expect(result.category).toBe('飲食');
      expect(result.amount).toBe(80);
      expect(result.note).toBe('星巴克');
    }
  });

  it('應該正確解析「計程車 200 去公司」', () => {
    const result = parseMessage('計程車 200 去公司');
    expect(result.type).toBe('EXPENSE_CATEGORY');
    if (result.type === 'EXPENSE_CATEGORY') {
      expect(result.category).toBe('交通');
      expect(result.amount).toBe(200);
      expect(result.note).toBe('去公司');
    }
  });

  it('應該正確解析「電影 300」（娛樂分類）', () => {
    const result = parseMessage('電影 300');
    expect(result.type).toBe('EXPENSE_CATEGORY');
    if (result.type === 'EXPENSE_CATEGORY') {
      expect(result.category).toBe('娛樂');
      expect(result.amount).toBe(300);
    }
  });

  it('應該正確解析「房租 15000」（居住分類）', () => {
    const result = parseMessage('房租 15000');
    expect(result.type).toBe('EXPENSE_CATEGORY');
    if (result.type === 'EXPENSE_CATEGORY') {
      expect(result.category).toBe('居住');
      expect(result.amount).toBe(15000);
    }
  });

  it('應該支持小數點金額「咖啡 85.5」', () => {
    const result = parseMessage('咖啡 85.5');
    expect(result.type).toBe('EXPENSE_CATEGORY');
    if (result.type === 'EXPENSE_CATEGORY') {
      expect(result.amount).toBe(85.5);
    }
  });
});

describe('parseMessage - 一步式記帳（收入）', () => {
  it('應該正確解析「薪水 50000」', () => {
    const result = parseMessage('薪水 50000');
    expect(result.type).toBe('INCOME_CATEGORY');
    if (result.type === 'INCOME_CATEGORY') {
      expect(result.category).toBe('薪資');
      expect(result.amount).toBe(50000);
      expect(result.note).toBeUndefined();
    }
  });

  it('應該正確解析「獎金 10000 年終」（帶備註）', () => {
    const result = parseMessage('獎金 10000 年終');
    expect(result.type).toBe('INCOME_CATEGORY');
    if (result.type === 'INCOME_CATEGORY') {
      expect(result.category).toBe('獎金');
      expect(result.amount).toBe(10000);
      expect(result.note).toBe('年終');
    }
  });

  it('應該正確解析「股息 5000」', () => {
    const result = parseMessage('股息 5000');
    expect(result.type).toBe('INCOME_CATEGORY');
    if (result.type === 'INCOME_CATEGORY') {
      expect(result.category).toBe('股息');
      expect(result.amount).toBe(5000);
    }
  });
});

describe('parseMessage - 傳統兩步式記帳', () => {
  it('應該正確解析「-120」為支出', () => {
    const result = parseMessage('-120');
    expect(result.type).toBe('EXPENSE');
    if (result.type === 'EXPENSE') {
      expect(result.amount).toBe(120);
    }
  });

  it('應該正確解析「100」為收入（純數字優先當作記帳）', () => {
    // 純數字現在優先被視為記帳金額，而非股票代碼
    // 要查詢股票請使用「股票查詢 2330」等明確指令
    const result = parseMessage('100');
    expect(result.type).toBe('INCOME');
    if (result.type === 'INCOME') {
      expect(result.amount).toBe(100);
    }
  });

  it('應該正確解析「+5000」為收入', () => {
    const result = parseMessage('+5000');
    expect(result.type).toBe('INCOME');
    if (result.type === 'INCOME') {
      expect(result.amount).toBe(5000);
    }
  });

  it('應該正確解析「+100 牛肉麵」為收入且保留備註', () => {
    const result = parseMessage('+100 牛肉麵');
    expect(result.type).toBe('INCOME');
    if (result.type === 'INCOME') {
      expect(result.amount).toBe(100);
      expect(result.note).toBe('牛肉麵');
    }
  });

  it('應該正確解析「-120 計程車」為支出且保留備註', () => {
    const result = parseMessage('-120 計程車');
    expect(result.type).toBe('EXPENSE');
    if (result.type === 'EXPENSE') {
      expect(result.amount).toBe(120);
      expect(result.note).toBe('計程車');
    }
  });

  it('應該正確解析「100 星巴克」為收入且保留備註', () => {
    const result = parseMessage('100 星巴克');
    expect(result.type).toBe('INCOME');
    if (result.type === 'INCOME') {
      expect(result.amount).toBe(100);
      expect(result.note).toBe('星巴克');
    }
  });
});

describe('parseMessage - 股票查詢', () => {
  it('應該正確解析「股票查詢 2330」', () => {
    const result = parseMessage('股票查詢 2330');
    expect(result.type).toBe('STOCK_QUERY');
    if (result.type === 'STOCK_QUERY') {
      expect(result.symbol).toBe('2330.TW');
    }
  });

  it('應該正確解析「查詢 TSLA」', () => {
    const result = parseMessage('查詢 TSLA');
    expect(result.type).toBe('STOCK_QUERY');
    if (result.type === 'STOCK_QUERY') {
      expect(result.symbol).toBe('TSLA');
    }
  });

  it('應該正確解析「股 0050」', () => {
    const result = parseMessage('股 0050');
    expect(result.type).toBe('STOCK_QUERY');
    if (result.type === 'STOCK_QUERY') {
      expect(result.symbol).toBe('0050.TW');
    }
  });

  it('應該正確解析「股票 2330」', () => {
    const result = parseMessage('股票 2330');
    expect(result.type).toBe('STOCK_QUERY');
    if (result.type === 'STOCK_QUERY') {
      expect(result.symbol).toBe('2330.TW');
    }
  });

  it('純數字「2330」應該被當作收入記帳，而非股票查詢', () => {
    const result = parseMessage('2330');
    expect(result.type).toBe('INCOME');
    if (result.type === 'INCOME') {
      expect(result.amount).toBe(2330);
    }
  });

  it('純字母「TSLA」應該被當作未知指令，而非股票查詢', () => {
    // 純字母不是數字，所以不會被當作記帳，也不會被當作股票查詢（需要關鍵字）
    const result = parseMessage('TSLA');
    expect(result.type).toBe('UNKNOWN');
  });
});

describe('parseMessage - 買賣操作', () => {
  it('應該正確解析「買 2330」', () => {
    const result = parseMessage('買 2330');
    expect(result.type).toBe('BUY_ACTION');
    if (result.type === 'BUY_ACTION') {
      expect(result.symbol).toBe('2330.TW');
    }
  });

  it('應該正確解析「買入 TSLA」', () => {
    const result = parseMessage('買入 TSLA');
    expect(result.type).toBe('BUY_ACTION');
    if (result.type === 'BUY_ACTION') {
      expect(result.symbol).toBe('TSLA');
    }
  });

  it('應該正確解析「賣 2330」', () => {
    const result = parseMessage('賣 2330');
    expect(result.type).toBe('SELL_ACTION');
    if (result.type === 'SELL_ACTION') {
      expect(result.symbol).toBe('2330.TW');
    }
  });

  it('應該正確解析「賣出 AAPL」', () => {
    const result = parseMessage('賣出 AAPL');
    expect(result.type).toBe('SELL_ACTION');
    if (result.type === 'SELL_ACTION') {
      expect(result.symbol).toBe('AAPL');
    }
  });
});

describe('parseMessage - 指令', () => {
  it('應該正確解析「說明」', () => {
    const result = parseMessage('說明');
    expect(result.type).toBe('HELP');
  });

  it('應該正確解析「幫助」', () => {
    const result = parseMessage('幫助');
    expect(result.type).toBe('HELP');
  });

  it('應該正確解析「帳戶」', () => {
    const result = parseMessage('帳戶');
    expect(result.type).toBe('ACCOUNT_LIST');
  });

  it('應該正確解析「資產」', () => {
    const result = parseMessage('資產');
    expect(result.type).toBe('TOTAL_ASSETS');
  });

  it('應該正確解析「持倉」', () => {
    const result = parseMessage('持倉');
    expect(result.type).toBe('PORTFOLIO');
  });

  it('應該正確解析「網站」', () => {
    const result = parseMessage('網站');
    expect(result.type).toBe('WEBSITE');
  });

  it('應該正確解析「記帳」', () => {
    const result = parseMessage('記帳');
    expect(result.type).toBe('LEDGER');
  });
});

describe('parseMessage - 未知訊息', () => {
  it('應該將無法識別的訊息標記為 UNKNOWN', () => {
    const result = parseMessage('隨便說點什麼');
    expect(result.type).toBe('UNKNOWN');
  });

  it('應該將空字串標記為 UNKNOWN', () => {
    const result = parseMessage('');
    expect(result.type).toBe('UNKNOWN');
  });
});

describe('validateQuantity', () => {
  it('應該接受有效的正數數量', () => {
    const result = validateQuantity(10);
    expect(result.valid).toBe(true);
  });

  it('應該接受小數數量', () => {
    const result = validateQuantity(10.5);
    expect(result.valid).toBe(true);
  });

  it('應該拒絕 0', () => {
    const result = validateQuantity(0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('大於 0');
  });

  it('應該拒絕負數', () => {
    const result = validateQuantity(-5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('大於 0');
  });

  it('應該拒絕過大的數量', () => {
    const result = validateQuantity(2000000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('過大');
  });
});

describe('validateAmount', () => {
  it('應該接受有效的正數金額', () => {
    const result = validateAmount(1000);
    expect(result.valid).toBe(true);
  });

  it('應該接受小數金額', () => {
    const result = validateAmount(99.99);
    expect(result.valid).toBe(true);
  });

  it('應該拒絕 0', () => {
    const result = validateAmount(0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('大於 0');
  });

  it('應該拒絕負數', () => {
    const result = validateAmount(-100);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('大於 0');
  });

  it('應該拒絕過大的金額', () => {
    const result = validateAmount(20000000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('過大');
  });
});
