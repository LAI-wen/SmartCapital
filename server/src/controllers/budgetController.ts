import { Request, Response } from 'express';
import {
  getOrCreateUser,
  getUserBudgets,
  upsertBudget,
  deleteBudget,
} from '../services/databaseService.js';

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

export async function setBudget(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { category, amount } = req.body;

    if (!category || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'category and amount are required'
      });
    }

    const user = await getOrCreateUser(lineUserId);
    const budget = await upsertBudget(user.id, category, amount);
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Error setting budget:', error);
    res.status(500).json({ success: false, error: 'Failed to set budget' });
  }
}

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
