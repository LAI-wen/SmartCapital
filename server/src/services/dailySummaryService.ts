/**
 * Daily Summary Service - 每日總結服務
 * 每天早上 9:00 自動發送用戶的每日投資總結
 */

import { Client } from '@line/bot-sdk';
import { prisma } from './databaseService.js';
import { getStockQuote } from './stockService.js';

/**
 * 為所有用戶生成並發送每日總結
 */
export async function sendDailySummaryToAllUsers(lineClient: Client) {
  console.log('📊 [每日總結] 開始生成每日總結...');

  try {
    // 1. 取得所有用戶
    const users = await prisma.user.findMany({
      select: {
        id: true,
        lineUserId: true,
        displayName: true
      }
    });

    console.log(`📊 [每日總結] 找到 ${users.length} 位用戶`);

    let successCount = 0;
    let failCount = 0;

    // 2. 為每位用戶生成總結
    for (const user of users) {
      try {
        const summary = await generateDailySummary(user.id);

        // 只有在有內容時才發送（避免打擾沒有活動的用戶）
        if (summary.hasActivity) {
          await lineClient.pushMessage(user.lineUserId, {
            type: 'text',
            text: summary.message
          });
          successCount++;
          console.log(`✅ [每日總結] 已發送給 ${user.displayName} (${user.lineUserId})`);
        } else {
          console.log(`⏭️  [每日總結] ${user.displayName} 今日無活動，跳過`);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ [每日總結] 發送失敗 ${user.displayName}:`, error);
      }
    }

    console.log(`📊 [每日總結] 完成！成功: ${successCount}, 失敗: ${failCount}`);
    return { successCount, failCount };

  } catch (error) {
    console.error('❌ [每日總結] 執行失敗:', error);
    throw error;
  }
}

/**
 * 生成單個用戶的每日總結
 */
async function generateDailySummary(userId: string) {
  // 取得今天的日期範圍（00:00 - 23:59）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. 查詢昨天的交易記錄
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: yesterday,
        lt: today
      }
    },
    orderBy: { date: 'desc' }
  });

  // 2. 查詢昨天的轉帳記錄
  const transfers = await prisma.transfer.findMany({
    where: {
      userId,
      date: {
        gte: yesterday,
        lt: today
      }
    },
    include: {
      fromAccount: true,
      toAccount: true
    },
    orderBy: { date: 'desc' }
  });

  // 3. 查詢所有帳戶餘額
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });

  // 4. 查詢持倉資產
  const assets = await prisma.asset.findMany({
    where: { userId }
  });

  // 5. 統計數據
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netFlow = totalIncome - totalExpense;

  // 6. 計算持倉市值和損益（需要即時股價）
  let totalMarketValue = 0;
  let totalCost = 0;
  let assetSummary: string[] = [];

  for (const asset of assets) {
    try {
      const quote = await getStockQuote(asset.symbol);
      if (!quote) {
        console.warn(`⚠️  無法取得 ${asset.symbol} 的價格`);
        assetSummary.push(`${asset.symbol}: ${asset.quantity}股 (價格查詢失敗)`);
        continue;
      }

      const currentPrice = quote.price;
      const marketValue = asset.quantity * currentPrice;
      const cost = asset.quantity * asset.avgPrice;
      const profitLoss = marketValue - cost;
      const profitLossPercent = ((profitLoss / cost) * 100).toFixed(2);

      totalMarketValue += marketValue;
      totalCost += cost;

      assetSummary.push(
        `${asset.symbol}: ${asset.quantity}股 ` +
        `${profitLoss >= 0 ? '📈' : '📉'} ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(0)} (${profitLossPercent}%)`
      );
    } catch (error) {
      console.warn(`⚠️  無法取得 ${asset.symbol} 的價格:`, error);
      assetSummary.push(`${asset.symbol}: ${asset.quantity}股 (價格查詢失敗)`);
    }
  }

  const totalProfitLoss = totalMarketValue - totalCost;
  const totalProfitLossPercent = totalCost > 0
    ? ((totalProfitLoss / totalCost) * 100).toFixed(2)
    : '0.00';

  // 7. 判斷是否有活動（交易、轉帳、持倉）
  const hasActivity = transactions.length > 0 || transfers.length > 0 || assets.length > 0;

  // 8. 生成訊息
  let message = '🌅 早安！以下是您昨日的投資總結：\n\n';

  // 交易摘要
  if (transactions.length > 0) {
    message += `💰 記帳統計\n`;
    message += `收入: +$${totalIncome.toFixed(0)}\n`;
    message += `支出: -$${totalExpense.toFixed(0)}\n`;
    message += `淨流量: ${netFlow >= 0 ? '+' : ''}$${netFlow.toFixed(0)}\n\n`;
  }

  // 轉帳摘要
  if (transfers.length > 0) {
    message += `🔄 轉帳記錄 (${transfers.length}筆)\n`;
    transfers.slice(0, 3).forEach(t => {
      message += `${t.fromAccount.name} → ${t.toAccount.name}: $${t.amount.toFixed(0)}\n`;
    });
    if (transfers.length > 3) {
      message += `... 還有 ${transfers.length - 3} 筆\n`;
    }
    message += '\n';
  }

  // 帳戶餘額總覽
  if (accounts.length > 0) {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    message += `🏦 帳戶總覽\n`;
    message += `總餘額: $${totalBalance.toFixed(0)}\n`;
    accounts.forEach(acc => {
      message += `  ${acc.name}: $${acc.balance.toFixed(0)} ${acc.currency}\n`;
    });
    message += '\n';
  }

  // 持倉總覽
  if (assets.length > 0) {
    message += `📊 持倉總覽 (${assets.length}檔)\n`;
    message += `市值: $${totalMarketValue.toFixed(0)}\n`;
    message += `成本: $${totalCost.toFixed(0)}\n`;
    message += `損益: ${totalProfitLoss >= 0 ? '📈 +' : '📉 '}$${totalProfitLoss.toFixed(0)} (${totalProfitLossPercent}%)\n\n`;

    if (assetSummary.length > 0) {
      message += `持股明細：\n`;
      assetSummary.slice(0, 5).forEach(line => {
        message += `${line}\n`;
      });
      if (assetSummary.length > 5) {
        message += `... 還有 ${assetSummary.length - 5} 檔\n`;
      }
    }
    message += '\n';
  }

  message += '祝您今天投資順利！🚀';

  return {
    hasActivity,
    message,
    stats: {
      transactions: transactions.length,
      transfers: transfers.length,
      totalIncome,
      totalExpense,
      netFlow,
      totalMarketValue,
      totalCost,
      totalProfitLoss
    }
  };
}

/**
 * 為單個用戶發送每日總結（可用於測試）
 */
export async function sendDailySummaryToUser(lineClient: Client, userId: string, lineUserId: string) {
  try {
    const summary = await generateDailySummary(userId);

    if (summary.hasActivity) {
      await lineClient.pushMessage(lineUserId, {
        type: 'text',
        text: summary.message
      });
      console.log(`✅ [每日總結] 已發送給用戶 ${userId}`);
      return { success: true, summary };
    } else {
      console.log(`⏭️  [每日總結] 用戶 ${userId} 今日無活動`);
      return { success: false, message: '今日無活動' };
    }
  } catch (error) {
    console.error(`❌ [每日總結] 發送失敗:`, error);
    throw error;
  }
}
