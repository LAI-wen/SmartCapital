/**
 * API Controller - REST API 端點供前端使用
 * 提供資產、交易記錄等資料
 */

import { Request, Response } from 'express';
import {
  getOrCreateUser,
  getUserAssets,
  getUserTransactions,
  getUserSettings
} from '../services/databaseService.js';
import { getStockQuote } from '../services/stockService.js';

/**
 * GET /api/user/:lineUserId
 * 取得用戶基本資料
 */
export async function getUser(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);

    res.json({
      success: true,
      data: {
        id: user.id,
        displayName: user.displayName,
        bankroll: user.bankroll,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
}

/**
 * GET /api/assets/:lineUserId
 * 取得用戶資產持倉（含即時價格）
 */
export async function getAssets(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    const assets = await getUserAssets(user.id);

    // 批次查詢即時股價
    const assetsWithPrice = await Promise.all(
      assets.map(async (asset) => {
        const quote = await getStockQuote(asset.symbol);
        const currentPrice = quote?.price || asset.avgPrice;
        const value = currentPrice * asset.quantity;
        const cost = asset.avgPrice * asset.quantity;
        const profit = value - cost;
        const profitPercent = (profit / cost) * 100;

        return {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          quantity: asset.quantity,
          avgPrice: asset.avgPrice,
          currentPrice,
          value,
          cost,
          profit,
          profitPercent,
          change24h: quote?.changePercent || 0
        };
      })
    );

    res.json({
      success: true,
      data: assetsWithPrice
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assets' });
  }
}

/**
 * GET /api/transactions/:lineUserId
 * 取得用戶交易記錄
 */
export async function getTransactions(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const user = await getOrCreateUser(lineUserId);
    const transactions = await getUserTransactions(user.id, limit);

    res.json({
      success: true,
      data: transactions.map(t => ({
        id: t.id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        category: t.category,
        note: t.note
      }))
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
}

/**
 * GET /api/portfolio/:lineUserId
 * 取得用戶完整投資組合摘要
 */
export async function getPortfolio(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    const assets = await getUserAssets(user.id);

    let totalValue = 0;
    let totalCost = 0;

    const assetsWithPrice = await Promise.all(
      assets.map(async (asset) => {
        const quote = await getStockQuote(asset.symbol);
        const currentPrice = quote?.price || asset.avgPrice;
        const value = currentPrice * asset.quantity;
        const cost = asset.avgPrice * asset.quantity;

        totalValue += value;
        totalCost += cost;

        return {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          quantity: asset.quantity,
          avgPrice: asset.avgPrice,
          currentPrice,
          value,
          cost,
          profit: value - cost,
          profitPercent: ((value - cost) / cost) * 100,
          change24h: quote?.changePercent || 0,
          history: [] // Placeholder for now
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalValue,
        totalCost,
        totalProfit: totalValue - totalCost,
        totalProfitPercent: ((totalValue - totalCost) / totalCost) * 100,
        assets: assetsWithPrice
      }
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch portfolio' });
  }
}

/**
 * GET /api/settings/:lineUserId
 * 取得用戶策略設定
 */
export async function getSettings(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    const settings = await getUserSettings(user.id);

    res.json({
      success: true,
      data: {
        kellyWinProbability: settings.kellyWinProbability,
        kellyOdds: settings.kellyOdds,
        martingaleMultiplier: settings.martingaleMultiplier
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
}
