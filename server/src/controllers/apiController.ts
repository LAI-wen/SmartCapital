/**
 * API Controller - REST API 端點供前端使用
 * 提供資產、交易記錄等資料
 */

import { Request, Response } from 'express';
import {
  getOrCreateUser,
  updateUserInvestmentScope,
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
  importAsset,
  upsertAsset,
  getUserBudgets,
  upsertBudget,
  deleteBudget,
  prisma
} from '../services/databaseService.js';
import { getStockQuote, searchStocks } from '../services/stockService.js';

function getAuthenticatedLineUserId(req: Request, res: Response): string | null {
  const authenticatedLineUserId = req.user?.lineUserId;

  if (!authenticatedLineUserId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required'
    });
    return null;
  }

  return authenticatedLineUserId;
}

function ensureAuthenticatedUser(
  req: Request,
  res: Response,
  requestedLineUserId?: unknown
): string | null {
  const authenticatedLineUserId = getAuthenticatedLineUserId(req, res);
  if (!authenticatedLineUserId) {
    return null;
  }

  if (
    requestedLineUserId !== undefined &&
    requestedLineUserId !== null &&
    requestedLineUserId !== authenticatedLineUserId
  ) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: lineUserId does not match authenticated user'
    });
    return null;
  }

  return authenticatedLineUserId;
}

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

/**
 * PATCH /api/user/:lineUserId
 * 更新用戶投資範圍設定
 */
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
 * POST /api/assets/:lineUserId/upsert
 * 新增或更新資產持倉
 */
export async function upsertAssetAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { symbol, name, type, quantity, avgPrice, currency } = req.body;

    if (!symbol || !name || !type || quantity === undefined || avgPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, name, type, quantity, avgPrice'
      });
    }

    const user = await getOrCreateUser(lineUserId);
    const asset = await upsertAsset(user.id, symbol, name, type, quantity, avgPrice, currency);

    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('Error upserting asset:', error);
    res.status(500).json({ success: false, error: 'Failed to upsert asset' });
  }
}

/**
 * POST /api/assets/:lineUserId/reduce
 * 減少資產持倉（賣出）
 */
export async function reduceAssetAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { symbol, quantity } = req.body;

    if (!symbol || quantity === undefined || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, quantity (must be > 0)'
      });
    }

    const user = await getOrCreateUser(lineUserId);
    const asset = await import('../services/databaseService.js').then(m =>
      m.reduceAsset(user.id, symbol, quantity)
    );

    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('Error reducing asset:', error);
    res.status(500).json({ success: false, error: 'Failed to reduce asset' });
  }
}

/**
 * POST /api/assets/:lineUserId/import
 * 導入既有資產持倉（不扣款）
 * 用於使用者記錄他們已經持有的股票成本
 */
export async function importAssetAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { symbol, name, type, quantity, avgPrice, currency } = req.body;

    if (!symbol || !name || !type || quantity === undefined || avgPrice === undefined || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, name, type, quantity, avgPrice, currency'
      });
    }

    if (quantity <= 0 || avgPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity and avgPrice must be positive numbers'
      });
    }

    const user = await getOrCreateUser(lineUserId);
    const asset = await importAsset(
      user.id,
      symbol,
      name,
      type,
      quantity,
      avgPrice,
      currency
    );

    console.log(`✅ 導入資產成功: ${symbol} ${quantity}股 @ ${currency} ${avgPrice}`);

    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('Error importing asset:', error);
    res.status(500).json({ success: false, error: 'Failed to import asset' });
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
        subcategory: t.subcategory,
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
    const { type, amount, category, note, accountId, originalCurrency, exchangeRate, date } = req.body;

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
      accountId,
      originalCurrency,  // 支援原始幣別
      exchangeRate,      // 支援匯率快取
      date               // 支援自訂日期
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
 * POST /api/transactions/batch-delete
 * 批次刪除交易記錄（並回滾帳戶餘額）
 *
 * ⚠️ 安全性：僅允許擁有者刪除自己的交易記錄
 */
export async function batchDeleteTransactions(req: Request, res: Response) {
  try {
    const { transactionIds, lineUserId, skipBalanceUpdate } = req.body;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) {
      return;
    }

    // 驗證 transactionIds 格式
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'transactionIds must be a non-empty array'
      });
    }

    // 解析 skipBalanceUpdate 參數（預設為 false，即會連動資金池）
    const shouldSkipBalanceUpdate = skipBalanceUpdate === true;

    // 查詢所有交易記錄
    const transactions = await prisma.transaction.findMany({
      where: { id: { in: transactionIds } },
      include: { user: true }
    });

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No transactions found'
      });
    }

    // 🔒 安全檢查：驗證所有交易都屬於當前用戶
    const unauthorizedTransactions = transactions.filter(
      t => t.user.lineUserId !== authenticatedLineUserId
    );

    if (unauthorizedTransactions.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only delete your own transactions'
      });
    }

    // 批次刪除交易（可選擇是否回滾帳戶餘額）
    let deletedCount = 0;
    const errors: string[] = [];

    for (const transaction of transactions) {
      try {
        // 如果交易有關聯帳戶且用戶選擇要連動資金池，則回滾餘額
        if (transaction.accountId && !shouldSkipBalanceUpdate) {
          await prisma.$transaction(async (tx) => {
            // 1. 回滾帳戶餘額
            const account = await tx.account.findUnique({
              where: { id: transaction.accountId! }
            });

            if (account) {
              const newBalance = transaction.type === 'income'
                ? account.balance - transaction.amount
                : account.balance + transaction.amount;

              await tx.account.update({
                where: { id: transaction.accountId! },
                data: { balance: newBalance }
              });
            }

            // 2. 刪除交易記錄
            await tx.transaction.delete({
              where: { id: transaction.id }
            });
          });
        } else {
          // 沒有關聯帳戶或用戶選擇不連動資金池，直接刪除
          await prisma.transaction.delete({
            where: { id: transaction.id }
          });
        }

        deletedCount++;
      } catch (error) {
        console.error(`Error deleting transaction ${transaction.id}:`, error);
        errors.push(`Failed to delete transaction ${transaction.id}`);
      }
    }

    res.json({
      success: true,
      data: {
        deletedCount,
        totalRequested: transactionIds.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Error batch deleting transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch delete transactions'
    });
  }
}

/**
 * DELETE /api/transactions/:transactionId
 * 刪除交易記錄（並回滾帳戶餘額）
 *
 * ⚠️ 安全性：僅允許擁有者刪除自己的交易記錄
 */
export async function deleteTransaction(req: Request, res: Response) {
  try {
    const { transactionId } = req.params;
    const { lineUserId, skipBalanceUpdate } = req.query;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) {
      return;
    }

    // 解析 skipBalanceUpdate 參數（預設為 false，即會連動資金池）
    const shouldSkipBalanceUpdate = skipBalanceUpdate === 'true';

    // 先查詢交易記錄以取得 accountId 和 amount
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // 🔒 安全檢查：驗證交易擁有者
    if (transaction.user.lineUserId !== authenticatedLineUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only delete your own transactions'
      });
    }

    // 如果交易有關聯帳戶且用戶選擇要連動資金池，則回滾餘額
    if (transaction.accountId && !shouldSkipBalanceUpdate) {
      await prisma.$transaction(async (tx) => {
        // 1. 回滾帳戶餘額
        const account = await tx.account.findUnique({
          where: { id: transaction.accountId! }
        });

        if (account) {
          // 刪除交易時反向操作：
          // - 如果是 income，減少餘額
          // - 如果是 expense，增加餘額
          const newBalance = transaction.type === 'income'
            ? account.balance - transaction.amount
            : account.balance + transaction.amount;

          await tx.account.update({
            where: { id: transaction.accountId! },
            data: { balance: newBalance }
          });
        }

        // 2. 刪除交易記錄
        await tx.transaction.delete({
          where: { id: transactionId }
        });
      });
    } else {
      // 沒有關聯帳戶或用戶選擇不連動資金池，直接刪除
      await prisma.transaction.delete({
        where: { id: transactionId }
      });
    }

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
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res);

    if (!authenticatedLineUserId) {
      return;
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (notification.user.lineUserId !== authenticatedLineUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only update your own notifications'
      });
    }

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
 *
 * ⚠️ 安全性：僅允許擁有者更新自己的帳戶
 */
export async function updateAccountInfo(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    const { name, isDefault, lineUserId } = req.body;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) {
      return;
    }

    // 🔒 安全檢查：驗證帳戶擁有者
    const existingAccount = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true }
    });

    if (!existingAccount) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    if (existingAccount.user.lineUserId !== authenticatedLineUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only update your own accounts'
      });
    }

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
 *
 * ⚠️ 安全性：僅允許擁有者刪除自己的帳戶
 */
export async function removeAccount(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    const { lineUserId } = req.query;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) {
      return;
    }

    // 🔒 安全檢查：驗證帳戶擁有者
    const existingAccount = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true }
    });

    if (!existingAccount) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    if (existingAccount.user.lineUserId !== authenticatedLineUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only delete your own accounts'
      });
    }

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
 *
 * ⚠️ 安全性：僅允許擁有者更新自己的帳戶餘額
 */
export async function updateBalance(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    const { amount, operation, lineUserId } = req.body;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

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

    if (!authenticatedLineUserId) {
      return;
    }

    // 🔒 安全檢查：驗證帳戶擁有者
    const existingAccount = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true }
    });

    if (!existingAccount) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    if (existingAccount.user.lineUserId !== authenticatedLineUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only update your own account balance'
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

/**
 * ============================================================
 * Stock Search Endpoint
 * ============================================================
 */

/**
 * GET /api/stocks/search?q=keyword
 * 搜尋股票
 */
export async function searchStocksAPI(req: Request, res: Response) {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      return res.json({
        success: true,
        data: []
      });
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

/**
 * ============================================================
 * Exchange Rate API
 * ============================================================
 */

/**
 * GET /api/exchange-rates?base=USD
 * 取得即時匯率（帶 1 小時快取）
 */
export async function getExchangeRatesAPI(req: Request, res: Response) {
  try {
    const { getExchangeRates } = await import('../services/exchangeRateService.js');
    const baseCurrency = (req.query.base as string) || 'USD';

    const rates = await getExchangeRates(baseCurrency);

    res.json({
      success: true,
      data: {
        base: baseCurrency,
        rates,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // 即使出錯也返回預設匯率，不要讓前端崩潰
    const getDefaultRates = () => ({
      TWD: 31.5,
      JPY: 150.0,
      EUR: 0.92,
      GBP: 0.79,
      CNY: 7.25,
      KRW: 1320,
      HKD: 7.83,
      SGD: 1.35,
      AUD: 1.53,
      CAD: 1.36,
      USD: 1.0
    });

    res.json({
      success: true,
      data: {
        base: 'USD',
        rates: getDefaultRates(),
        timestamp: new Date().toISOString(),
        cached: true,
        fallback: true
      }
    });
  }
}

/**
 * GET /api/exchange-rates/convert?from=USD&to=TWD&amount=100
 * 轉換幣別
 */
export async function convertCurrencyAPI(req: Request, res: Response) {
  try {
    const { convertCurrency } = await import('../services/exchangeRateService.js');
    const from = req.query.from as string;
    const to = req.query.to as string;
    const amount = parseFloat(req.query.amount as string);

    if (!from || !to || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: from, to, amount'
      });
    }

    const convertedAmount = await convertCurrency(amount, from, to);

    res.json({
      success: true,
      data: {
        from,
        to,
        originalAmount: amount,
        convertedAmount,
        rate: convertedAmount / amount
      }
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ success: false, error: 'Failed to convert currency' });
  }
}

/**
 * ============================================================
 * Price Alert Endpoints
 * ============================================================
 */

/**
 * GET /api/price-alerts/:lineUserId
 * 取得用戶所有價格警示
 */
export async function getPriceAlerts(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);

    const { getUserAlerts } = await import('../services/priceAlertService');
    const alerts = await getUserAlerts(user.id);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching price alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch price alerts' });
  }
}

/**
 * POST /api/price-alerts/:lineUserId
 * 建立新的價格警示
 */
export async function createPriceAlertAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { symbol, name, alertType, threshold, targetPrice, direction, referencePrice } = req.body;

    if (!symbol || !alertType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, alertType'
      });
    }

    const user = await getOrCreateUser(lineUserId);

    const { createPriceAlert } = await import('../services/priceAlertService');
    const alert = await createPriceAlert(user.id, {
      symbol,
      name,
      alertType,
      threshold,
      targetPrice,
      direction,
      referencePrice
    });

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error creating price alert:', error);
    const message = error instanceof Error ? error.message : 'Failed to create price alert';
    res.status(400).json({ success: false, error: message });
  }
}

/**
 * PATCH /api/price-alerts/:alertId
 * 更新警示狀態（啟用/停用）
 *
 * ⚠️ 安全性：僅允許擁有者更新自己的警示
 */
export async function updatePriceAlertAPI(req: Request, res: Response) {
  try {
    const { alertId } = req.params;
    const { isActive, lineUserId } = req.body;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean'
      });
    }

    if (!authenticatedLineUserId) {
      return;
    }

    // 🔒 安全檢查：驗證警示擁有者
    const existingAlert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
      include: { user: true }
    });

    if (!existingAlert) {
      return res.status(404).json({ success: false, error: 'Price alert not found' });
    }

    if (existingAlert.user.lineUserId !== authenticatedLineUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only update your own price alerts'
      });
    }

    const { updateAlertStatus } = await import('../services/priceAlertService');
    const alert = await updateAlertStatus(alertId, isActive);

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error updating price alert:', error);
    res.status(500).json({ success: false, error: 'Failed to update price alert' });
  }
}

/**
 * DELETE /api/price-alerts/:alertId
 * 刪除警示
 *
 * ⚠️ 安全性：僅允許擁有者刪除自己的警示
 */
export async function deletePriceAlertAPI(req: Request, res: Response) {
  try {
    const { alertId } = req.params;
    const { lineUserId } = req.query;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) {
      return;
    }

    // 🔒 安全檢查：驗證警示擁有者
    const existingAlert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
      include: { user: true }
    });

    if (!existingAlert) {
      return res.status(404).json({ success: false, error: 'Price alert not found' });
    }

    if (existingAlert.user.lineUserId !== authenticatedLineUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only delete your own price alerts'
      });
    }

    const { deleteAlert } = await import('../services/priceAlertService');
    await deleteAlert(alertId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting price alert:', error);
    res.status(500).json({ success: false, error: 'Failed to delete price alert' });
  }
}

/**
 * POST /api/price-alerts/:lineUserId/create-defaults
 * 為所有持倉建立預設警示
 */
export async function createDefaultAlertsAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { dailyChangeThreshold, profitThreshold, lossThreshold } = req.body;

    const user = await getOrCreateUser(lineUserId);

    const { createDefaultAlertsForAllAssets } = await import('../services/priceAlertService');
    const alerts = await createDefaultAlertsForAllAssets(
      user.id,
      dailyChangeThreshold || 5,
      profitThreshold || 10,
      lossThreshold || 10
    );

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error creating default alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to create default alerts' });
  }
}

/**
 * GET /api/budgets/:lineUserId
 * 取得用戶所有預算設定
 */
export async function getBudgets(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    const budgets = await getUserBudgets(user.id);
    res.json({ success: true, data: budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch budgets' });
  }
}

/**
 * PUT /api/budgets/:lineUserId
 * 新增或更新分類預算
 */
export async function setBudget(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { category, amount } = req.body;
    if (!category || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'category and amount are required' });
    }
    const user = await getOrCreateUser(lineUserId);
    const budget = await upsertBudget(user.id, category, amount);
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Error setting budget:', error);
    res.status(500).json({ success: false, error: 'Failed to set budget' });
  }
}

/**
 * DELETE /api/budgets/:lineUserId/:category
 * 刪除分類預算
 */
export async function removeBudget(req: Request, res: Response) {
  try {
    const { lineUserId, category } = req.params;
    const user = await getOrCreateUser(lineUserId);
    await deleteBudget(user.id, decodeURIComponent(category));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ success: false, error: 'Failed to delete budget' });
  }
}
