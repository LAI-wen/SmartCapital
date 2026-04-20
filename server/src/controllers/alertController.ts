import { Request, Response } from 'express';
import { getOrCreateUser, prisma } from '../services/databaseService.js';
import {
  getUserAlerts,
  createPriceAlert,
  updateAlertStatus,
  deleteAlert,
  createDefaultAlertsForAllAssets,
} from '../services/priceAlertService.js';
import { ensureAuthenticatedUser } from './shared.js';

export async function getPriceAlerts(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const user = await getOrCreateUser(lineUserId);
    const alerts = await getUserAlerts(user.id);
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching price alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch price alerts' });
  }
}

export async function createPriceAlertAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { symbol, name, alertType, threshold, targetPrice, direction, referencePrice } = req.body;

    const user = await getOrCreateUser(lineUserId);
    const alert = await createPriceAlert(user.id, {
      symbol, name, alertType, threshold, targetPrice, direction, referencePrice
    });

    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error creating price alert:', error);
    const message = error instanceof Error ? error.message : 'Failed to create price alert';
    res.status(400).json({ success: false, error: message });
  }
}

export async function updatePriceAlertAPI(req: Request, res: Response) {
  try {
    const { alertId } = req.params;
    const { isActive, lineUserId } = req.body;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) return;

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

    const alert = await updateAlertStatus(alertId, isActive);
    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error updating price alert:', error);
    res.status(500).json({ success: false, error: 'Failed to update price alert' });
  }
}

export async function deletePriceAlertAPI(req: Request, res: Response) {
  try {
    const { alertId } = req.params;
    const { lineUserId } = req.query;
    const authenticatedLineUserId = ensureAuthenticatedUser(req, res, lineUserId);

    if (!authenticatedLineUserId) return;

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

    await deleteAlert(alertId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting price alert:', error);
    res.status(500).json({ success: false, error: 'Failed to delete price alert' });
  }
}

export async function createDefaultAlertsAPI(req: Request, res: Response) {
  try {
    const { lineUserId } = req.params;
    const { dailyChangeThreshold, profitThreshold, lossThreshold } = req.body;
    const user = await getOrCreateUser(lineUserId);

    const alerts = await createDefaultAlertsForAllAssets(
      user.id,
      dailyChangeThreshold || 5,
      profitThreshold || 10,
      lossThreshold || 10
    );

    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error creating default alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to create default alerts' });
  }
}
