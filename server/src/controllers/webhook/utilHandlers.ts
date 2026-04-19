/**
 * Utility handlers for webhook controller
 */

import { Client } from '@line/bot-sdk';
import { getUserTransactions, getUserBudgets } from '../../services/databaseService.js';
import { createTransactionSuccessCard } from '../../utils/flexMessages.js';

/**
 * 回覆文字訊息
 */
export async function replyText(client: Client, replyToken: string, text: string): Promise<void> {
  await client.replyMessage(replyToken, {
    type: 'text',
    text
  });
}

/**
 * 處理記帳頁面連結
 */
export async function handleLedgerLink(client: Client, lineUserId: string): Promise<void> {
  const liffId = process.env.LIFF_ID;
  const webUrl = liffId
    ? `https://liff.line.me/${liffId}/#/ledger`
    : `${process.env.FRONTEND_URL || 'http://localhost:3001'}/#/ledger?userId=${encodeURIComponent(lineUserId)}`;

  await client.pushMessage(lineUserId, {
    type: 'template',
    altText: '📝 前往記帳頁面',
    template: {
      type: 'buttons',
      text: '📝 SmartCapital 記帳\n\n快速記錄你的每一筆收支',
      actions: [
        {
          type: 'uri',
          label: '💰 開始記帳',
          uri: webUrl
        }
      ]
    }
  });
}

/**
 * 處理網站連結請求
 */
export async function handleWebsiteLink(client: Client, lineUserId: string): Promise<void> {
  // 優先使用 LIFF URL（生產環境），回退到 FRONTEND_URL（開發環境）
  // 導向資產主頁 (Dashboard)
  const liffId = process.env.LIFF_ID;
  const webUrl = liffId
    ? `https://liff.line.me/${liffId}#/`
    : `${process.env.FRONTEND_URL || 'http://localhost:3001'}/#/?userId=${encodeURIComponent(lineUserId)}`;

  await client.pushMessage(lineUserId, {
    type: 'template',
    altText: '查看你的 SmartCapital 投資組合',
    template: {
      type: 'buttons',
      text: '📊 SmartCapital Web\n\n點擊下方按鈕查看完整資料',
      actions: [
        {
          type: 'uri',
          label: '🌐 開啟網站',
          uri: webUrl
        }
      ]
    }
  });
}

/**
 * 記帳後檢查是否觸發預算警告
 */
export async function checkBudgetAlert(client: Client, lineUserId: string, userId: string, category: string, totalMonthlyExpense: number): Promise<void> {
  const budgets = await getUserBudgets(userId);
  if (budgets.length === 0) return;

  // 重新計算本月該分類支出
  const now = new Date();
  const taiwanOffset = 8 * 60 * 60 * 1000;
  const taiwanNow = new Date(now.getTime() + taiwanOffset);
  const startOfMonth = new Date(Date.UTC(
    taiwanNow.getUTCFullYear(), taiwanNow.getUTCMonth(), 1
  ) - taiwanOffset);

  const allTx = await getUserTransactions(userId, 500);
  const monthExpenses = allTx.filter(tx => tx.type === 'expense' && new Date(tx.date) >= startOfMonth);

  const spentByCategory: Record<string, number> = { '總計': 0 };
  monthExpenses.forEach(tx => {
    spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + tx.amount;
    spentByCategory['總計'] += tx.amount;
  });

  const THRESHOLDS = [
    { pct: 100, emoji: '🔴', label: '已超出' },
    { pct: 90, emoji: '🟠', label: '已達 90%' },
    { pct: 70, emoji: '🟡', label: '已達 70%' }
  ];

  const warnings: string[] = [];

  for (const b of budgets) {
    if (b.category !== category && b.category !== '總計') continue;
    const spent = spentByCategory[b.category] || 0;
    const pct = (spent / b.amount) * 100;

    for (const t of THRESHOLDS) {
      if (pct >= t.pct) {
        warnings.push(`${t.emoji} ${b.category}預算${t.label}\n已用 $${spent.toFixed(0)} / $${b.amount.toLocaleString()}（${Math.round(pct)}%）`);
        break;
      }
    }
  }

  if (warnings.length > 0) {
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: `⚠️ 預算提醒\n\n${warnings.join('\n\n')}`
    });
  }
}

/**
 * 發送記帳成功卡片（統一入口）
 */
export async function sendSuccessCard(
  client: Client,
  lineUserId: string,
  userId: string,
  category: string,
  amount: number,
  note: string,
  subcategory?: string,
  type: 'income' | 'expense' = 'expense'
): Promise<void> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const allTransactions = await getUserTransactions(userId, 100);

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  allTransactions.forEach(tx => {
    const txDate = new Date(tx.date);
    if (txDate >= startOfMonth) {
      if (tx.type === 'income') monthlyIncome += tx.amount;
      else monthlyExpense += tx.amount;
    }
  });

  const recentTransactions = allTransactions.slice(1, 3).map(tx => ({
    date: typeof tx.date === 'string' ? tx.date : tx.date.toISOString(),
    type: tx.type as 'income' | 'expense',
    amount: tx.amount,
    category: tx.category
  }));

  const liffId = process.env.LIFF_ID;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}#/ledger` : undefined;

  const card = createTransactionSuccessCard({
    type,
    amount,
    category,
    subcategory,
    monthlyIncome,
    monthlyExpense,
    monthlyBalance: monthlyIncome - monthlyExpense,
    recentTransactions,
    liffUrl
  });

  await client.pushMessage(lineUserId, card);
  checkBudgetAlert(client, lineUserId, userId, category, monthlyExpense).catch(console.error);
}
