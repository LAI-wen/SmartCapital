import { Request, Response } from 'express';
import {
  getOrCreateUser,
  updateUserInvestmentScope,
  getUserAssets,
  getUserSettings,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  upsertAsset,
  importAsset,
  reduceAsset,
} from '../services/databaseService.js';
import { getStockQuote } from '../services/stockService.js';

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
        enableTWStock: user.enableTWStock,
        enableUSStock: user.enableUSStock,
        enableCrypto: user.enableCrypto,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
}

export async function updateUserSettings(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { enableTWStock, enableUSStock, enableCrypto } = req.body;

    const user = await getOrCreateUser(lineUserId);
    const updatedUser = await updateUserInvestmentScope(
      user.id,
      enableTWStock,
      enableUSStock,
      enableCrypto
    );

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        enableTWStock: updatedUser.enableTWStock,
        enableUSStock: updatedUser.enableUSStock,
        enableCrypto: updatedUser.enableCrypto
      }
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update user settings' });
  }
}

export async function getSettings(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    const settings = await getUserSettings(user.id);

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
}

async function enrichAssetsWithPrice(assets: Awaited<ReturnType<typeof getUserAssets>>) {
  return Promise.all(
    assets.map(async (asset) => {
      const quote = await getStockQuote(asset.symbol);
      const currentPrice = quote?.price || asset.avgPrice;
      const value = currentPrice * asset.quantity;
      const cost = asset.avgPrice * asset.quantity;
      const profit = value - cost;

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
        profitPercent: (profit / cost) * 100,
        change24h: quote?.changePercent || 0
      };
    })
  );
}

export async function getAssets(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    const assets = await getUserAssets(user.id);
    const assetsWithPrice = await enrichAssetsWithPrice(assets);

    res.json({ success: true, data: assetsWithPrice });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assets' });
  }
}

export async function getPortfolio(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    const assets = await getUserAssets(user.id);
    const assetsWithPrice = await enrichAssetsWithPrice(assets);

    const totalValue = assetsWithPrice.reduce((sum, a) => sum + a.value, 0);
    const totalCost = assetsWithPrice.reduce((sum, a) => sum + a.cost, 0);

    res.json({
      success: true,
      data: {
        totalValue,
        totalCost,
        totalProfit: totalValue - totalCost,
        totalProfitPercent: ((totalValue - totalCost) / totalCost) * 100,
        assets: assetsWithPrice.map(a => ({ ...a, history: [] }))
      }
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch portfolio' });
  }
}

export async function upsertAssetAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { symbol, name, type, quantity, avgPrice, currency } = req.body;

    const user = await getOrCreateUser(lineUserId);
    const asset = await upsertAsset(user.id, symbol, name, type, quantity, avgPrice, currency);

    res.json({ success: true, data: asset });
  } catch (error) {
    console.error('Error upserting asset:', error);
    res.status(500).json({ success: false, error: 'Failed to upsert asset' });
  }
}

export async function reduceAssetAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { symbol, quantity } = req.body;

    const user = await getOrCreateUser(lineUserId);
    const asset = await reduceAsset(user.id, symbol, quantity);

    res.json({ success: true, data: asset });
  } catch (error) {
    console.error('Error reducing asset:', error);
    res.status(500).json({ success: false, error: 'Failed to reduce asset' });
  }
}

export async function importAssetAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { symbol, name, type, quantity, avgPrice, currency } = req.body;

    const user = await getOrCreateUser(lineUserId);
    const asset = await importAsset(user.id, symbol, name, type, quantity, avgPrice, currency);

    res.json({ success: true, data: asset });
  } catch (error) {
    console.error('Error importing asset:', error);
    res.status(500).json({ success: false, error: 'Failed to import asset' });
  }
}

export async function getNotifications(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const user = await getOrCreateUser(lineUserId);
    const notifications = await getUserNotifications(user.id, limit);

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
}

export async function markNotificationAsRead(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;
    await markNotificationRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
}

export async function markAllNotificationsAsRead(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    await markAllNotificationsRead(user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
}
