import type { Asset } from '../types';

const CACHE_TTL = 60_000;
const priceCache = new Map<string, { price: number; ts: number }>();

const COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  ADA: 'cardano', XRP: 'ripple', DOGE: 'dogecoin', DOT: 'polkadot',
  AVAX: 'avalanche-2', MATIC: 'matic-network',
};

function getCached(symbol: string): number | null {
  const entry = priceCache.get(symbol);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.price;
  return null;
}

function setCache(symbol: string, price: number) {
  priceCache.set(symbol, { price, ts: Date.now() });
}

async function fetchTWSE(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!symbols.length) return result;
  const query = symbols.map(s => `tse_${s}.tw`).join('|');
  const res = await fetch(
    `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${query}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  for (const item of data.msgArray ?? []) {
    const price = parseFloat(item.z ?? item.y ?? '');
    if (!isNaN(price)) {
      result.set(item.c, price);
      setCache(item.c, price);
    }
  }
  return result;
}

async function fetchCoinGecko(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!symbols.length) return result;
  const ids = symbols
    .map(s => COINGECKO_ID[s.toUpperCase()])
    .filter(Boolean);
  if (!ids.length) return result;
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  for (const symbol of symbols) {
    const id = COINGECKO_ID[symbol.toUpperCase()];
    if (id && data[id]?.usd != null) {
      result.set(symbol.toUpperCase(), data[id].usd);
      setCache(symbol.toUpperCase(), data[id].usd);
    }
  }
  return result;
}

async function fetchFinnhub(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!symbols.length) return result;
  const key = import.meta.env.VITE_FINNHUB_API_KEY;
  if (!key) return result;
  const settled = await Promise.allSettled(
    symbols.map(async s => {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${s}&token=${key}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { symbol: s, price: data.c as number };
    })
  );
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value.price > 0) {
      result.set(r.value.symbol, r.value.price);
      setCache(r.value.symbol, r.value.price);
    }
  }
  const anyRejected = settled.some(r => r.status === 'rejected');
  if (anyRejected && result.size === 0) throw new Error('All Finnhub fetches failed');
  return result;
}

export interface FetchPricesResult {
  prices: Map<string, number>;
  anyFailed: boolean;
}

export async function fetchLivePrices(
  assets: Asset[]
): Promise<FetchPricesResult> {
  const prices = new Map<string, number>();
  const twSymbols: string[] = [];
  const cryptoSymbols: string[] = [];
  const usSymbols: string[] = [];
  const uncachedAssets: Asset[] = [];

  for (const asset of assets) {
    const cached = getCached(asset.symbol);
    if (cached !== null) {
      prices.set(asset.symbol, cached);
    } else {
      uncachedAssets.push(asset);
      if (asset.currency === 'TWD') twSymbols.push(asset.symbol);
      else if (asset.type === 'Crypto') cryptoSymbols.push(asset.symbol);
      else usSymbols.push(asset.symbol);
    }
  }

  let anyFailed = false;
  const [twR, cgR, fnR] = await Promise.allSettled([
    fetchTWSE(twSymbols),
    fetchCoinGecko(cryptoSymbols),
    fetchFinnhub(usSymbols),
  ]);

  for (const r of [twR, cgR, fnR]) {
    if (r.status === 'fulfilled') {
      r.value.forEach((price, symbol) => prices.set(symbol, price));
    } else {
      anyFailed = true;
    }
  }

  // Fall back to stored currentPrice for any symbol we couldn't fetch
  for (const asset of uncachedAssets) {
    if (!prices.has(asset.symbol)) {
      prices.set(asset.symbol, asset.currentPrice);
      anyFailed = true;
    }
  }

  return { prices, anyFailed };
}
