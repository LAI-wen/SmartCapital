/**
 * Account handlers for webhook controller
 */

import { Client } from '@line/bot-sdk';
import {
  getUserAccounts,
  createAccount,
  updateConversationState
} from '../../services/databaseService.js';
import { getExchangeRate } from '../../services/exchangeRateService.js';

/**
 * 取得或創建預設現金帳戶
 */
export async function getOrCreateDefaultCashAccount(userId: string): Promise<string> {
  const accounts = await getUserAccounts(userId);

  // 優先找預設現金帳戶
  let defaultCash = accounts.find(acc => acc.type === 'CASH' && acc.isDefault);

  if (!defaultCash) {
    // 找任何現金帳戶
    defaultCash = accounts.find(acc => acc.type === 'CASH');
  }

  if (!defaultCash) {
    // 創建預設現金帳戶
    defaultCash = await createAccount(userId, '現金', 'CASH', 'TWD', 0, true, false);
  }

  return defaultCash.id;
}

/**
 * 處理帳戶列表查詢
 */
export async function handleAccountList(client: Client, lineUserId: string, userId: string): Promise<void> {
  const accounts = await getUserAccounts(userId);

  if (accounts.length === 0) {
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '您目前沒有任何帳戶。\n\n請輸入「建立帳戶」開始設定。'
    });
    return;
  }

  // 計算總資產
  let totalTWD = 0;
  let totalUSD = 0;

  accounts.forEach((acc: any) => {
    if (acc.currency === 'TWD') {
      totalTWD += acc.balance;
    } else if (acc.currency === 'USD') {
      totalUSD += acc.balance;
    }
  });

  // 格式化帳戶清單
  let message = '💰 您的帳戶列表\n\n';

  accounts.forEach((acc: any) => {
    const icon = acc.type === 'CASH' ? '💵' : '🏦';
    const subIcon = acc.isSub ? ' (複委託)' : '';
    const defaultIcon = acc.isDefault ? ' ⭐' : '';
    const balanceStr = acc.currency === 'TWD'
      ? `NT$ ${acc.balance.toLocaleString()}`
      : `$ ${acc.balance.toLocaleString()}`;

    message += `${icon} ${acc.name}${subIcon}${defaultIcon}\n`;
    message += `   ${balanceStr}\n\n`;
  });

  message += `📊 總資產\n`;
  if (totalTWD > 0) {
    message += `💰 台幣：NT$ ${totalTWD.toLocaleString()}\n`;
  }
  if (totalUSD > 0) {
    message += `💵 美金：$ ${totalUSD.toLocaleString()}\n`;
  }

  await client.pushMessage(lineUserId, {
    type: 'text',
    text: message
  });
}

/**
 * 處理建立帳戶請求（引導至網頁版）
 */
export async function handleCreateAccount(client: Client, lineUserId: string, userId: string): Promise<void> {
  const liffId = process.env.LIFF_ID;
  const webUrl = liffId
    ? `https://liff.line.me/${liffId}/#/settings`
    : `${process.env.FRONTEND_URL || 'http://localhost:3001'}/#/settings?userId=${encodeURIComponent(lineUserId)}`;

  await client.pushMessage(lineUserId, {
    type: 'template',
    altText: '建立新帳戶',
    template: {
      type: 'buttons',
      text: '💳 建立新帳戶\n\n請前往網頁版進行設定：\n\n• 選擇帳戶類型\n• 設定初始餘額\n• 選擇幣別 (TWD/USD)',
      actions: [
        {
          type: 'uri',
          label: '🌐 開啟設定頁面',
          uri: webUrl
        }
      ]
    }
  });
}

/**
 * 處理帳戶選擇
 */
export async function handleAccountSelection(
  client: Client,
  lineUserId: string,
  userId: string,
  text: string,
  context: Record<string, unknown>
): Promise<void> {
  const match = text.match(/選擇帳戶\s+(\d+)/);

  if (!match) {
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '請點擊下方按鈕選擇帳戶'
    });
    return;
  }

  const accountIndex = parseInt(match[1]) - 1;
  const { availableAccounts, symbol, price, name, stockCurrency } = context as any;

  if (accountIndex < 0 || accountIndex >= availableAccounts.length) {
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '無效的帳戶選擇'
    });
    return;
  }

  const selectedAccount = availableAccounts[accountIndex];
  const needsExchange = selectedAccount.currency !== stockCurrency;
  const exchangeRate = needsExchange ? await getExchangeRate('USD', 'TWD') : 1;

  // 更新狀態為等待輸入數量
  await updateConversationState(lineUserId, 'WAITING_BUY_QUANTITY', {
    symbol,
    price,
    name,
    accountId: selectedAccount.id,
    accountName: selectedAccount.name,
    accountCurrency: selectedAccount.currency,
    stockCurrency
  });

  await client.pushMessage(lineUserId, {
    type: 'text',
    text: `請輸入要買入的股數\n` +
      `股票：${symbol} @ $${price}\n` +
      `帳戶：${selectedAccount.name} (${selectedAccount.currency})\n` +
      `餘額：${selectedAccount.currency === 'TWD' ? 'NT$' : '$'}${selectedAccount.balance.toLocaleString()}\n` +
      (needsExchange ? `\n⚠️ 將以複委託方式下單\n匯率：1 USD ≈ ${exchangeRate} TWD\n` : '') +
      `\n例如: 10`
  });
}
