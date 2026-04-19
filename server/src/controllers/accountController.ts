import { Request, Response } from 'express';
import {
  getOrCreateUser,
  getUserAccounts,
  createAccount,
  updateAccount,
  updateAccountBalance,
  deleteAccount,
  createTransfer,
  getUserTransfers,
  prisma,
} from '../services/databaseService.js';
import { ensureAuthenticatedUser } from './shared.js';

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

export async function createNewAccount(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { name, type, currency, balance, isDefault, isSub } = req.body;

    if (!name || !type || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, currency'
      });
    }

    if (!['CASH', 'BANK', 'BROKERAGE', 'EXCHANGE'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid account type' });
    }

    if (!['TWD', 'USD'].includes(currency)) {
      return res.status(400).json({ success: false, error: 'Invalid currency' });
    }

    const user = await getOrCreateUser(lineUserId);
    const account = await createAccount(
      user.id, name, type, currency,
      balance || 0, isDefault || false, isSub || false
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

export async function updateAccountInfo(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    const { name, isDefault, lineUserId } = req.body;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) return;

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
      data: { id: account.id, name: account.name, isDefault: account.isDefault }
    });
  } catch (error) {
    console.error('Error updating account:', error);
    const message = error instanceof Error ? error.message : 'Failed to update account';
    res.status(500).json({ success: false, error: message });
  }
}

export async function removeAccount(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    const { lineUserId } = req.query;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) return;

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

export async function updateBalance(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    const { amount, operation, lineUserId } = req.body;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

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

    if (!authenticatedLineUserId) return;

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

    res.json({ success: true, data: { id: account.id, balance: account.balance } });
  } catch (error) {
    console.error('Error updating account balance:', error);
    const message = error instanceof Error ? error.message : 'Failed to update balance';
    res.status(500).json({ success: false, error: message });
  }
}

export async function createNewTransfer(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { fromAccountId, toAccountId, amount, exchangeRate, fee, note } = req.body;

    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromAccountId, toAccountId, amount'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be positive' });
    }

    const user = await getOrCreateUser(lineUserId);
    const transfer = await createTransfer(
      user.id, fromAccountId, toAccountId, amount, exchangeRate, fee, note
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

export async function getTransfers(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const user = await getOrCreateUser(lineUserId);
    const transfers = await getUserTransfers(user.id, limit);

    res.json({ success: true, data: transfers });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transfers' });
  }
}
