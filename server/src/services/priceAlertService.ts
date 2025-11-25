/**
 * Price Alert Service - 價格警示服務
 * 處理價格警示的建立、查詢、更新、刪除和觸發檢查
 */

import { prisma } from './databaseService.js';
import { getStockQuote } from './stockService.js';
import { getAsset } from './databaseService.js';
import { createNotification } from './databaseService.js';
import { Client } from '@line/bot-sdk';

export type AlertType =
  | 'DAILY_CHANGE'   // 單日漲跌超過 X%
  | 'PROFIT_LOSS'    // 累計獲利/虧損超過 X%
  | 'STOP_PROFIT'    // 停利點
  | 'STOP_LOSS'      // 停損點
  | 'TARGET_PRICE';  // 目標價

export type AlertDirection = 'UP' | 'DOWN' | 'BOTH';

export interface PriceAlertInput {
  symbol: string;
  name?: string;
  alertType: AlertType;
  threshold?: number;      // 百分比閾值
  targetPrice?: number;    // 目標價格
  direction?: AlertDirection;
  referencePrice?: number; // 參考價格（用於計算累計獲利/虧損）
}

/**
 * 建立價格警示
 */
export async function createPriceAlert(userId: string, input: PriceAlertInput) {
  // 驗證輸入
  if (input.alertType === 'TARGET_PRICE' && !input.targetPrice) {
    throw new Error('目標價警示需要設定目標價格');
  }

  if (['DAILY_CHANGE', 'PROFIT_LOSS', 'STOP_PROFIT', 'STOP_LOSS'].includes(input.alertType) && !input.threshold) {
    throw new Error(`${input.alertType} 警示需要設定閾值`);
  }

  // 如果是 PROFIT_LOSS, STOP_PROFIT, STOP_LOSS，需要參考價格
  if (['PROFIT_LOSS', 'STOP_PROFIT', 'STOP_LOSS'].includes(input.alertType) && !input.referencePrice) {
    // 嘗試從用戶資產中取得平均成本
    const asset = await getAsset(userId, input.symbol);
    if (asset) {
      input.referencePrice = asset.avgPrice;
    } else {
      throw new Error('找不到持倉資料，請提供參考價格');
    }
  }

  return prisma.priceAlert.create({
    data: {
      userId,
      symbol: input.symbol,
      name: input.name,
      alertType: input.alertType,
      threshold: input.threshold,
      targetPrice: input.targetPrice,
      direction: input.direction,
      referencePrice: input.referencePrice,
    }
  });
}

/**
 * 取得用戶所有警示
 */
export async function getUserAlerts(userId: string, onlyActive = false) {
  return prisma.priceAlert.findMany({
    where: {
      userId,
      ...(onlyActive && { isActive: true })
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * 取得特定股票的警示
 */
export async function getAlertsBySymbol(userId: string, symbol: string) {
  return prisma.priceAlert.findMany({
    where: {
      userId,
      symbol,
      isActive: true
    }
  });
}

/**
 * 更新警示狀態
 */
export async function updateAlertStatus(alertId: string, isActive: boolean) {
  return prisma.priceAlert.update({
    where: { id: alertId },
    data: { isActive }
  });
}

/**
 * 刪除警示
 */
export async function deleteAlert(alertId: string) {
  return prisma.priceAlert.delete({
    where: { id: alertId }
  });
}

/**
 * 檢查並觸發價格警示
 * 這個函數會被排程任務定期呼叫
 * @param lineClient LINE Bot Client（用於推播通知）
 */
export async function checkAndTriggerAlerts(lineClient?: Client) {
  console.log('⏰ 開始檢查價格警示...');

  // 取得所有啟用的警示
  const activeAlerts = await prisma.priceAlert.findMany({
    where: { isActive: true },
    include: { user: true }
  });

  console.log(`📊 共有 ${activeAlerts.length} 個啟用的警示`);

  for (const alert of activeAlerts) {
    try {
      // 取得當前股價
      const quote = await getStockQuote(alert.symbol);
      if (!quote) {
        console.log(`⚠️ 無法取得 ${alert.symbol} 的股價`);
        continue;
      }

      const currentPrice = quote.price;
      const changePercent = quote.changePercent;
      let triggered = false;
      let message = '';

      switch (alert.alertType) {
        case 'DAILY_CHANGE':
          // 單日漲跌超過閾值
          if (Math.abs(changePercent) >= (alert.threshold || 0)) {
            if (alert.direction === 'UP' && changePercent > 0) {
              triggered = true;
              message = `${alert.name || alert.symbol} 今日上漲 ${changePercent.toFixed(2)}%，已達您設定的 ${alert.threshold}% 警示！`;
            } else if (alert.direction === 'DOWN' && changePercent < 0) {
              triggered = true;
              message = `${alert.name || alert.symbol} 今日下跌 ${Math.abs(changePercent).toFixed(2)}%，已達您設定的 ${alert.threshold}% 警示！`;
            } else if (alert.direction === 'BOTH') {
              triggered = true;
              message = `${alert.name || alert.symbol} 今日${changePercent > 0 ? '上漲' : '下跌'} ${Math.abs(changePercent).toFixed(2)}%，已達您設定的 ${alert.threshold}% 警示！`;
            }
          }
          break;

        case 'PROFIT_LOSS':
          // 累計獲利/虧損超過閾值
          if (alert.referencePrice) {
            const profitLossPercent = ((currentPrice - alert.referencePrice) / alert.referencePrice) * 100;
            if (Math.abs(profitLossPercent) >= (alert.threshold || 0)) {
              triggered = true;
              message = `${alert.name || alert.symbol} 相對成本價 $${alert.referencePrice.toFixed(2)} ${profitLossPercent > 0 ? '獲利' : '虧損'} ${Math.abs(profitLossPercent).toFixed(2)}%，已達您設定的 ${alert.threshold}% 警示！`;
            }
          }
          break;

        case 'STOP_PROFIT':
          // 停利點
          if (alert.referencePrice) {
            const profitPercent = ((currentPrice - alert.referencePrice) / alert.referencePrice) * 100;
            if (profitPercent >= (alert.threshold || 0)) {
              triggered = true;
              message = `🎉 ${alert.name || alert.symbol} 已達停利點！獲利 ${profitPercent.toFixed(2)}% (目標 ${alert.threshold}%)`;
            }
          }
          break;

        case 'STOP_LOSS':
          // 停損點
          if (alert.referencePrice) {
            const lossPercent = ((currentPrice - alert.referencePrice) / alert.referencePrice) * 100;
            if (lossPercent <= -(alert.threshold || 0)) {
              triggered = true;
              message = `⚠️ ${alert.name || alert.symbol} 已達停損點！虧損 ${Math.abs(lossPercent).toFixed(2)}% (停損線 -${alert.threshold}%)`;
            }
          }
          break;

        case 'TARGET_PRICE':
          // 目標價
          if (alert.targetPrice && currentPrice >= alert.targetPrice) {
            triggered = true;
            message = `🎯 ${alert.name || alert.symbol} 已達目標價 $${alert.targetPrice}！當前價格：$${currentPrice.toFixed(2)}`;
          }
          break;
      }

      if (triggered) {
        console.log(`🔔 警示觸發: ${alert.symbol} - ${message}`);

        // 1. 建立通知（網頁版）
        await createNotification(
          alert.userId,
          'alert',
          `價格警示：${alert.name || alert.symbol}`,
          message
        );

        // 2. 發送 LINE 推播（如果有提供 lineClient）
        if (lineClient && alert.user.lineUserId) {
          try {
            await lineClient.pushMessage(alert.user.lineUserId, {
              type: 'text',
              text: `🔔 ${message}\n\n當前價格：$${currentPrice.toFixed(2)}`
            });
            console.log(`✅ LINE 推播已發送給 ${alert.user.lineUserId}`);
          } catch (error) {
            console.error(`❌ LINE 推播失敗:`, error);
          }
        }

        // 3. 更新警示觸發記錄
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            lastTriggered: new Date(),
            triggerCount: { increment: 1 }
          }
        });

        // 可選：觸發一次後自動停用（避免重複通知）
        // await updateAlertStatus(alert.id, false);
      }

    } catch (error) {
      console.error(`❌ 檢查警示 ${alert.id} 時發生錯誤:`, error);
    }
  }

  console.log('✅ 價格警示檢查完成');
}

/**
 * 為用戶的所有持倉建立預設警示
 * 這是一個便利函數，可以快速為所有持倉設定通知
 */
export async function createDefaultAlertsForAllAssets(
  userId: string,
  dailyChangeThreshold = 5,
  profitThreshold = 10,
  lossThreshold = 10
) {
  // 取得用戶所有資產
  const assets = await prisma.asset.findMany({
    where: { userId }
  });

  const results = [];

  for (const asset of assets) {
    try {
      // 單日漲跌 ±5%
      const dailyAlert = await createPriceAlert(userId, {
        symbol: asset.symbol,
        name: asset.name || undefined,
        alertType: 'DAILY_CHANGE',
        threshold: dailyChangeThreshold,
        direction: 'BOTH'
      });
      results.push(dailyAlert);

      // 停利 +10%
      const stopProfitAlert = await createPriceAlert(userId, {
        symbol: asset.symbol,
        name: asset.name || undefined,
        alertType: 'STOP_PROFIT',
        threshold: profitThreshold,
        referencePrice: asset.avgPrice
      });
      results.push(stopProfitAlert);

      // 停損 -10%
      const stopLossAlert = await createPriceAlert(userId, {
        symbol: asset.symbol,
        name: asset.name || undefined,
        alertType: 'STOP_LOSS',
        threshold: lossThreshold,
        referencePrice: asset.avgPrice
      });
      results.push(stopLossAlert);

    } catch (error) {
      console.error(`為 ${asset.symbol} 建立警示失敗:`, error);
    }
  }

  return results;
}
