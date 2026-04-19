import { Request, Response } from 'express';
import { searchStocks } from '../services/stockService.js';
import { getExchangeRates, convertCurrency } from '../services/exchangeRateService.js';

export async function searchStocksAPI(req: Request, res: Response) {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const results = await searchStocks(query);

    res.json({
      success: true,
      data: results.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        currency: stock.currency,
        change: stock.change,
        changePercent: stock.changePercent
      }))
    });
  } catch (error) {
    console.error('Error searching stocks:', error);
    res.status(500).json({ success: false, error: 'Failed to search stocks' });
  }
}

export async function getExchangeRatesAPI(req: Request, res: Response) {
  try {
    const baseCurrency = (req.query.base as string) || 'USD';
    const rates = await getExchangeRates(baseCurrency);

    res.json({
      success: true,
      data: { base: baseCurrency, rates, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.json({
      success: true,
      data: {
        base: 'USD',
        rates: { TWD: 31.5, JPY: 150.0, EUR: 0.92, GBP: 0.79, CNY: 7.25, KRW: 1320, HKD: 7.83, SGD: 1.35, AUD: 1.53, CAD: 1.36, USD: 1.0 },
        timestamp: new Date().toISOString(),
        cached: true,
        fallback: true
      }
    });
  }
}

export async function convertCurrencyAPI(req: Request, res: Response) {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const amount = parseFloat(req.query.amount as string);

    if (!from || !to || isNaN(amount) || amount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: from, to, amount (amount must be non-zero)'
      });
    }

    const convertedAmount = await convertCurrency(amount, from, to);

    res.json({
      success: true,
      data: { from, to, originalAmount: amount, convertedAmount, rate: convertedAmount / amount }
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ success: false, error: 'Failed to convert currency' });
  }
}
