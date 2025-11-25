/**
 * Stock Service - 股價查詢服務
 * 使用 Yahoo Finance API 取得即時股價資料
 */

import axios from 'axios';

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

/**
 * 從 Yahoo Finance 查詢股價
 * 使用公開的 Yahoo Finance Query API
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // Yahoo Finance Query API (免費，無需 API Key)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

    const response = await axios.get(url, {
      params: {
        interval: '1d',
        range: '1d'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const data = response.data;

    if (!data.chart?.result?.[0]) {
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    if (!meta || !quote) {
      return null;
    }

    const currentPrice = meta.regularMarketPrice || quote.close?.[0];
    const previousClose = meta.previousClose || meta.chartPreviousClose;

    if (!currentPrice || !previousClose) {
      return null;
    }

    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || symbol,
      price: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      currency: meta.currency || 'USD'
    };

  } catch (error) {
    console.error(`Failed to fetch stock quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * 批次查詢多個股票代碼
 */
export async function getMultipleStockQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();

  // 並行查詢，但限制同時請求數量
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(symbol => getStockQuote(symbol));
    const quotes = await Promise.all(promises);

    quotes.forEach((quote, index) => {
      if (quote) {
        results.set(batch[index], quote);
      }
    });
  }

  return results;
}

/**
 * 驗證股票代碼格式
 */
export function isValidStockSymbol(text: string): boolean {
  // 股票代碼通常是 1-5 個字母或數字的組合
  // 支援: TSLA, BTC, 2330, AAPL, QQQ
  const pattern = /^[A-Z0-9]{1,5}$/i;
  return pattern.test(text.trim());
}

/**
 * 自動轉換台股代碼格式
 * 輸入: 2330 -> 輸出: 2330.TW
 * 輸入: 0050 -> 輸出: 0050.TW
 * 輸入: AAPL -> 輸出: AAPL
 */
export function formatTaiwanStockSymbol(input: string): string {
  const clean = input.trim().toUpperCase();

  // 如果已經有後綴，直接返回
  if (clean.includes('.')) {
    return clean;
  }

  // 台股上市股票：4 位數字（2330, 2454）
  if (/^\d{4}$/.test(clean)) {
    return `${clean}.TW`;
  }

  // 台股 ETF：0 開頭的 4 或 5 位數字（0050, 0056, 00878, 00919）
  if (/^0\d{3,4}$/.test(clean)) {
    return `${clean}.TW`;
  }

  // 美股或其他：保持原樣（AAPL, TSLA, BTC-USD）
  return clean;
}

/**
 * 台股專用：查詢股票（自動加上 .TW 後綴）
 */
export async function getTaiwanStockQuote(symbol: string): Promise<StockQuote | null> {
  const formattedSymbol = formatTaiwanStockSymbol(symbol);
  return getStockQuote(formattedSymbol);
}

/**
 * 搜尋股票 - 支援任意股票代碼查詢
 * 輸入關鍵字，返回匹配的股票列表
 */
export async function searchStocks(query: string): Promise<StockQuote[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.trim().toUpperCase();

  // 常見股票代碼列表（用於中文關鍵字搜尋）
  const popularStocks: { [key: string]: string[] } = {
    // 台股中文名稱
    'TSMC': ['2330.TW'],
    '台積電': ['2330.TW'],
    '元大': ['0050.TW', '0056.TW', '00878.TW', '00919.TW'],
    '元大台灣50': ['0050.TW'],
    '元大高股息': ['0056.TW'],
    '國泰永續高股息': ['00878.TW'],
    '群益台灣精選高息': ['00919.TW'],
    '鴻海': ['2317.TW'],
    '聯發科': ['2454.TW'],
    '富邦金': ['2881.TW'],
    '國泰金': ['2882.TW'],
    '中華電': ['2412.TW'],
    '台達電': ['2308.TW'],
    '日月光': ['2311.TW'],
    '南亞科': ['2408.TW'],
    '聯電': ['2303.TW'],
    '台塑': ['1301.TW'],
    '中鋼': ['2002.TW'],
    '長榮': ['2603.TW'],
    '陽明': ['2609.TW'],
    '玉山金': ['2884.TW'],
    '高股息': ['0056.TW', '00878.TW', '00919.TW', '00929.TW'],
    '配息': ['0056.TW', '00878.TW', '00919.TW', '00929.TW'],

    // 熱門台灣 ETF
    '0050': ['0050.TW'],
    '0056': ['0056.TW'],
    '00878': ['00878.TW'],
    '00919': ['00919.TW'],
    '00929': ['00929.TW'],
    '006208': ['006208.TW'],
    '00692': ['00692.TW'],
    '00850': ['00850.TW'],

    // 美股公司名稱
    'APPLE': ['AAPL'],
    'TESLA': ['TSLA'],
    'NVIDIA': ['NVDA'],
    'GOOGLE': ['GOOGL'],
    'MICROSOFT': ['MSFT'],
    'AMAZON': ['AMZN'],
    'FACEBOOK': ['META'],
    'NETFLIX': ['NFLX'],
    'INTEL': ['INTC'],
    'AMD': ['AMD'],
    'DISNEY': ['DIS'],
    'NIKE': ['NKE'],
    'STARBUCKS': ['SBUX'],
    'VISA': ['V'],
    'MASTERCARD': ['MA']
  };

  // 收集所有匹配的股票代碼
  const matchedSymbols = new Set<string>();

  // 1. 直接股票代碼匹配
  if (/^\d{4,6}$/.test(searchTerm)) {
    // 台股代碼（4 位數如 2330，或 5-6 位數 ETF 如 00919, 006208）
    matchedSymbols.add(`${searchTerm}.TW`);
  } else if (/^[A-Z]{1,5}$/.test(searchTerm)) {
    // 美股代碼（如 AAPL, TSLA）
    matchedSymbols.add(searchTerm);
  } else if (/^\d{4,6}\.TW$/.test(searchTerm)) {
    // 已經是完整台股格式（2330.TW 或 00919.TW）
    matchedSymbols.add(searchTerm);
  }

  // 2. 中文關鍵字匹配
  Object.entries(popularStocks).forEach(([key, symbols]) => {
    if (key.includes(searchTerm) || searchTerm.includes(key)) {
      symbols.forEach(symbol => matchedSymbols.add(symbol));
    }
  });

  // 3. 如果是數字開頭但長度不足，可能是台股代碼的部分匹配
  if (/^\d+$/.test(searchTerm) && searchTerm.length < 6) {
    // 從常見台股中找開頭匹配的
    const taiwanStocks = [
      // 個股
      '2330', '2317', '2454', '2881', '2882', '2412', '2308', '2311', '2408', '2303', '1301', '2002', '2603', '2609', '2884',
      // ETF
      '0050', '0056', '00878', '00919', '00929', '006208', '00692', '00850', '00713', '00757'
    ];
    taiwanStocks
      .filter(code => code.startsWith(searchTerm))
      .forEach(code => matchedSymbols.add(`${code}.TW`));
  }

  // 4. 批次查詢所有匹配的股票
  const results: StockQuote[] = [];
  const symbolsArray = Array.from(matchedSymbols).slice(0, 10); // 限制最多 10 個結果

  // 並行查詢以提升速度
  const promises = symbolsArray.map(async (symbol) => {
    try {
      const quote = await getStockQuote(symbol);
      return quote;
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      return null;
    }
  });

  const quotes = await Promise.all(promises);

  // 過濾掉 null 結果
  quotes.forEach(quote => {
    if (quote) {
      results.push(quote);
    }
  });

  return results;
}
