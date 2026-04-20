import { Request, Response } from 'express';
import {
  getOrCreateUser,
  getUserTransactions,
  createTransaction as dbCreateTransaction,
  prisma,
} from '../services/databaseService.js';
import { ensureAuthenticatedUser } from './shared.js';

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

export async function createTransaction(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { type, amount, category, note, accountId, originalCurrency, exchangeRate, date } = req.body;

    const user = await getOrCreateUser(lineUserId);
    const transaction = await dbCreateTransaction(
      user.id, type, amount, category, note,
      accountId, originalCurrency, exchangeRate, date
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

export async function batchDeleteTransactions(req: Request, res: Response) {
  try {
    const { transactionIds, lineUserId, skipBalanceUpdate } = req.body;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) return;

    const shouldSkipBalanceUpdate = skipBalanceUpdate === true;

    const transactions = await prisma.transaction.findMany({
      where: { id: { in: transactionIds } },
      include: { user: true }
    });

    if (transactions.length === 0) {
      return res.status(404).json({ success: false, error: 'No transactions found' });
    }

    const unauthorizedTransactions = transactions.filter(
      t => t.user.lineUserId !== authenticatedLineUserId
    );

    if (unauthorizedTransactions.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only delete your own transactions'
      });
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const transaction of transactions) {
      try {
        if (transaction.accountId && !shouldSkipBalanceUpdate) {
          await prisma.$transaction(async (tx) => {
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

            await tx.transaction.delete({ where: { id: transaction.id } });
          });
        } else {
          await prisma.transaction.delete({ where: { id: transaction.id } });
        }

        deletedCount++;
      } catch (err) {
        console.error(`Error deleting transaction ${transaction.id}:`, err);
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
    res.status(500).json({ success: false, error: 'Failed to batch delete transactions' });
  }
}

export async function deleteTransaction(req: Request, res: Response) {
  try {
    const { transactionId } = req.params;
    const { lineUserId, skipBalanceUpdate } = req.query;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) return;

    const shouldSkipBalanceUpdate = skipBalanceUpdate === 'true';

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.user.lineUserId !== authenticatedLineUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only delete your own transactions'
      });
    }

    if (transaction.accountId && !shouldSkipBalanceUpdate) {
      await prisma.$transaction(async (tx) => {
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

        await tx.transaction.delete({ where: { id: transactionId } });
      });
    } else {
      await prisma.transaction.delete({ where: { id: transactionId } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to delete transaction' });
  }
}
