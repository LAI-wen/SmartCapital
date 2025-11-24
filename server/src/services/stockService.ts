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
  
  // 台股 ETF：0 開頭的 4 位數字（0050, 0056）
  if (/^0\d{3}$/.test(clean)) {
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
 * 搜尋股票 - 支援多個常見股票代碼
 * 輸入關鍵字，返回匹配的股票列表
 */
export async function searchStocks(query: string): Promise<StockQuote[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.trim().toUpperCase();

  // 常見股票代碼列表（台股 + 美股）
  const popularStocks: { [key: string]: string[] } = {
    // 台股
    'TSMC': ['2330.TW'],
    '台積電': ['2330.TW'],
    '2330': ['2330.TW'],
    '0050': ['0050.TW'],
    '元大': ['0050.TW'],
    '2317': ['2317.TW'],
    '鴻海': ['2317.TW'],
    '2454': ['2454.TW'],
    '聯發科': ['2454.TW'],
    '2881': ['2881.TW'],
    '富邦金': ['2881.TW'],
    '2882': ['2882.TW'],
    '國泰金': ['2882.TW'],

    // 美股
    'AAPL': ['AAPL'],
    'APPLE': ['AAPL'],
    'TSLA': ['TSLA'],
    'TESLA': ['TSLA'],
    'NVDA': ['NVDA'],
    'NVIDIA': ['NVDA'],
    'GOOGL': ['GOOGL'],
    'GOOGLE': ['GOOGL'],
    'MSFT': ['MSFT'],
    'MICROSOFT': ['MSFT'],
    'AMZN': ['AMZN'],
    'AMAZON': ['AMZN'],
    'META': ['META'],
    'FACEBOOK': ['META'],
    'NFLX': ['NFLX'],
    'NETFLIX': ['NFLX'],
    'SPY': ['SPY'],
    'QQQ': ['QQQ'],
    'VOO': ['VOO']
  };

  // 收集所有匹配的股票代碼
  const matchedSymbols = new Set<string>();

  // 1. 精確匹配 - 直接輸入股票代碼
  if (/^\d{4}$/.test(searchTerm)) {
    // 台股代碼（如 2330）
    matchedSymbols.add(`${searchTerm}.TW`);
  } else if (/^[A-Z]{1,5}$/.test(searchTerm)) {
    // 美股代碼（如 AAPL）
    matchedSymbols.add(searchTerm);
  }

  // 2. 模糊匹配 - 從常見股票列表搜尋
  Object.entries(popularStocks).forEach(([key, symbols]) => {
    if (key.includes(searchTerm) || searchTerm.includes(key)) {
      symbols.forEach(symbol => matchedSymbols.add(symbol));
    }
  });

  // 3. 批次查詢所有匹配的股票
  const results: StockQuote[] = [];
  const symbolsArray = Array.from(matchedSymbols).slice(0, 10); // 限制最多 10 個結果

  for (const symbol of symbolsArray) {
    try {
      const quote = await getStockQuote(symbol);
      if (quote) {
        results.push(quote);
      }
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
    }
  }

  return results;
}
