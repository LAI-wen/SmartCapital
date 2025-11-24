/**
 * API Controller - REST API 端點供前端使用
 * 提供資產、交易記錄等資料
 */

import { Request, Response } from 'express';
import {
  getOrCreateUser,
  getUserAssets,
  getUserTransactions,
  getUserSettings,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createTransaction as dbCreateTransaction,
  getUserAccounts,
  getAccount,
  createAccount,
  updateAccount,
  updateAccountBalance,
  deleteAccount,
  createTransfer,
  getUserTransfers,
  prisma
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
        note: t.note,
        accountId: t.accountId
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

/**
 * POST /api/transactions/:lineUserId
 * 新增交易記錄
 */
export async function createTransaction(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { type, amount, category, note, accountId } = req.body;

    // 驗證必填欄位
    if (!type || !amount || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: type, amount, category' 
      });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid transaction type' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Amount must be positive' 
      });
    }

    const user = await getOrCreateUser(lineUserId);
    const transaction = await dbCreateTransaction(
      user.id,
      type,
      amount,
      category,
      note,
      accountId
    );

    res.json({
      success: true,
      data: {
        id: transaction.id,
        accountId: transaction.accountId,
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note
      }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    const message = error instanceof Error ? error.message : 'Failed to create transaction';
    res.status(400).json({ success: false, error: message });
  }
}

/**
 * DELETE /api/transactions/:transactionId
 * 刪除交易記錄
 */
export async function deleteTransaction(req: Request, res: Response) {
  try {
    const { transactionId } = req.params;

    await prisma.transaction.delete({
      where: { id: transactionId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to delete transaction' });
  }
}

/**
 * GET /api/notifications/:lineUserId
 * 取得用戶通知列表
 */
export async function getNotifications(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const user = await getOrCreateUser(lineUserId);
    const notifications = await getUserNotifications(user.id, limit);

    res.json({
      success: true,
      data: notifications.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        time: n.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
}

/**
 * POST /api/notifications/:notificationId/read
 * 標記通知為已讀
 */
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

/**
 * POST /api/notifications/:lineUserId/read-all
 * 標記所有通知為已讀
 */
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

/**
 * ============================================================
 * Account Management Endpoints
 * ============================================================
 */

/**
 * GET /api/accounts/:lineUserId
 * 取得用戶所有帳戶
 */
export async function getAccounts(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    const accounts = await getUserAccounts(user.id);

    res.json({
      success: true,
      data: accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
        balance: acc.balance,
        isDefault: acc.isDefault,
        isSub: acc.isSub,
        createdAt: acc.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
  }
}

/**
 * POST /api/accounts/:lineUserId
 * 創建新帳戶
 */
export async function createNewAccount(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { name, type, currency, balance, isDefault, isSub } = req.body;

    // 驗證必填欄位
    if (!name || !type || !currency) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, type, currency' 
      });
    }

    // 驗證類型
    if (!['CASH', 'BANK', 'BROKERAGE', 'EXCHANGE'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid account type' 
      });
    }

    if (!['TWD', 'USD'].includes(currency)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid currency' 
      });
    }

    const user = await getOrCreateUser(lineUserId);
    const account = await createAccount(
      user.id,
      name,
      type,
      currency,
      balance || 0,
      isDefault || false,
      isSub || false
    );

    res.json({
      success: true,
      data: {
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        balance: account.balance,
        isDefault: account.isDefault,
        isSub: account.isSub
      }
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ success: false, error: 'Failed to create account' });
  }
}

/**
 * PATCH /api/accounts/:accountId
 * 更新帳戶資訊
 */
export async function updateAccountInfo(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    const { name, isDefault } = req.body;

    const account = await updateAccount(accountId, { name, isDefault });

    res.json({
      success: true,
      data: {
        id: account.id,
        name: account.name,
        isDefault: account.isDefault
      }
    });
  } catch (error) {
    console.error('Error updating account:', error);
    const message = error instanceof Error ? error.message : 'Failed to update account';
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * DELETE /api/accounts/:accountId
 * 刪除帳戶
 */
export async function removeAccount(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    await deleteAccount(accountId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    res.status(400).json({ success: false, error: message });
  }
}

/**
 * POST /api/accounts/:accountId/balance
 * 更新帳戶餘額
 */
export async function updateBalance(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    const { amount, operation } = req.body;

    // 驗證必填欄位
    if (typeof amount !== 'number' || !operation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, operation'
      });
    }

    if (operation !== 'add' && operation !== 'subtract') {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation. Must be "add" or "subtract"'
      });
    }

    const account = await updateAccountBalance(accountId, amount, operation);

    res.json({
      success: true,
      data: {
        id: account.id,
        balance: account.balance
      }
    });
  } catch (error) {
    console.error('Error updating account balance:', error);
    const message = error instanceof Error ? error.message : 'Failed to update balance';
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * POST /api/transfers/:lineUserId
 * 創建帳戶間轉帳
 */
export async function createNewTransfer(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { fromAccountId, toAccountId, amount, exchangeRate, fee, note } = req.body;

    // 驗證必填欄位
    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: fromAccountId, toAccountId, amount' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Amount must be positive' 
      });
    }

    const user = await getOrCreateUser(lineUserId);
    const transfer = await createTransfer(
      user.id,
      fromAccountId,
      toAccountId,
      amount,
      exchangeRate,
      fee,
      note
    );

    res.json({
      success: true,
      data: {
        id: transfer.id,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount: transfer.amount,
        exchangeRate: transfer.exchangeRate,
        fee: transfer.fee,
        note: transfer.note,
        date: transfer.date
      }
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    const message = error instanceof Error ? error.message : 'Failed to create transfer';
    res.status(400).json({ success: false, error: message });
  }
}

/**
 * GET /api/transfers/:lineUserId
 * 取得用戶轉帳記錄
 */
export async function getTransfers(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const user = await getOrCreateUser(lineUserId);
    const transfers = await getUserTransfers(user.id, limit);

    res.json({
      success: true,
      data: transfers.map(t => ({
        id: t.id,
        fromAccount: t.fromAccount,
        toAccount: t.toAccount,
        amount: t.amount,
        exchangeRate: t.exchangeRate,
        fee: t.fee,
        note: t.note,
        date: t.date
      }))
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transfers' });
  }
}
