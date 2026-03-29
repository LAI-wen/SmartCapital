/**
 * Daily Summary Service - 每日總結服務
 * 每天早上 9:00 自動發送用戶的每日投資總結
 */

import { Client } from '@line/bot-sdk';
import { prisma } from './databaseService.js';
import { createDailySummaryCard } from '../utils/flexMessages.js';

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
          await lineClient.pushMessage(user.lineUserId, summary.card);
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
  // 以台灣時間（UTC+8）計算昨天的日期範圍
  const taiwanOffset = 8 * 60 * 60 * 1000;
  const nowTaiwan = new Date(Date.now() + taiwanOffset);

  // 台灣今天的開始（midnight Taiwan = UTC-8h）
  const todayTaiwanStart = new Date(
    Date.UTC(nowTaiwan.getUTCFullYear(), nowTaiwan.getUTCMonth(), nowTaiwan.getUTCDate()) - taiwanOffset
  );
  // 台灣昨天的開始
  const yesterdayTaiwanStart = new Date(todayTaiwanStart.getTime() - 24 * 60 * 60 * 1000);

  // 台灣昨天的日期標籤（e.g. "3/26 (三)"）
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const yesterdayLabel = new Date(yesterdayTaiwanStart.getTime() + taiwanOffset);
  const dateLabel = `${yesterdayLabel.getUTCMonth() + 1}/${yesterdayLabel.getUTCDate()}（${weekDays[yesterdayLabel.getUTCDay()]}）`;

  // 查詢昨天的交易記錄
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: yesterdayTaiwanStart, lt: todayTaiwanStart }
    },
    orderBy: { date: 'desc' }
  });

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // 分類支出明細（取前4）
  const catMap: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const topCategories = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({ category, amount }));

  const hasActivity = transactions.length > 0;

  const liffId = process.env.LIFF_ID;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}#/ledger` : undefined;

  return {
    hasActivity,
    card: createDailySummaryCard({ dateLabel, income: totalIncome, expense: totalExpense, topCategories, liffUrl })
  };
}

/**
 * 為單個用戶發送每日總結（可用於測試）
 */
export async function sendDailySummaryToUser(lineClient: Client, userId: string, lineUserId: string) {
  try {
    const summary = await generateDailySummary(userId);

    if (summary.hasActivity) {
      await lineClient.pushMessage(lineUserId, summary.card);
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
