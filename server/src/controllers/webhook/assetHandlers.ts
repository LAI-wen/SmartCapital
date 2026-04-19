/**
 * Asset handlers for webhook controller
 */

import { Client } from '@line/bot-sdk';
import {
  getOrCreateUser,
  getUserSettings,
  createTransaction,
  getUserAssets,
  upsertAsset,
  reduceAsset,
  getAsset,
  getUserAccounts,
  updateConversationState,
  clearConversationState
} from '../../services/databaseService.js';
import { getStockQuote } from '../../services/stockService.js';
import { calculateKelly } from '../../services/strategyService.js';
import {
  createStockQuoteCard,
  createPortfolioSummaryCard
} from '../../utils/flexMessages.js';
import { getOrCreateDefaultCashAccount } from './accountHandlers.js';
import { sendSuccessCard } from './utilHandlers.js';

/**
 * 處理股票查詢
 */
export async function handleStockQuery(client: Client, lineUserId: string, userId: string, symbol: string, showKelly = false): Promise<void> {
  const quote = await getStockQuote(symbol);

  if (!quote) {
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: `❌ 找不到 ${symbol}，請確認代號是否正確。`
    });
    return;
  }

  if (!showKelly) {
    // 輕量模式：只顯示股價
    const sign = quote.change >= 0 ? '+' : '';
    const currency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'NT$' : '$';
    const arrow = quote.change >= 0 ? '▲' : '▼';
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: `${quote.name}（${symbol}）\n` +
            `${currency}${quote.price.toLocaleString()}\n` +
            `${arrow} ${sign}${quote.change} (${sign}${quote.changePercent.toFixed(2)}%)\n\n` +
            `💡 「${symbol} kelly」查看凱利建議`
    });
    return;
  }

  // Kelly 模式
  const settings = await getUserSettings(userId);
  const user = await getOrCreateUser(lineUserId);
  const kelly = calculateKelly(settings.kellyWinProbability, settings.kellyOdds, user.bankroll);
  const card = createStockQuoteCard(quote, kelly, undefined);
  await client.pushMessage(lineUserId, card);
}

/**
 * 處理買入操作
 */
export async function handleBuyAction(client: Client, lineUserId: string, userId: string, symbol: string, quantity?: number): Promise<void> {
  const quote = await getStockQuote(symbol);
  if (!quote) {
    await client.pushMessage(lineUserId, { type: 'text', text: `❌ 找不到 ${symbol} 行情` });
    return;
  }

  if (quantity === undefined) {
    // 問一次股數
    await updateConversationState(lineUserId, 'WAITING_BUY_QUANTITY', {
      symbol, price: quote.price, name: quote.name
    });
    const currency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'NT$' : '$';
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: `${quote.name}（${symbol}）現價 ${currency}${quote.price}\n請輸入買入股數：`
    });
    return;
  }

  await executeBuy(client, lineUserId, userId, symbol, quote.name, quote.price, quantity);
}

export async function executeBuy(client: Client, lineUserId: string, userId: string, symbol: string, name: string, price: number, quantity: number): Promise<void> {
  const currency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'NT$' : '$';
  const totalCost = price * quantity;
  try {
    await upsertAsset(userId, symbol, name, 'Stock', quantity, price);
    await createTransaction(userId, 'expense', totalCost, 'investment',
      `買入 ${symbol} ${quantity}股 @ ${currency}${price}`);
    await clearConversationState(lineUserId);
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: `✅ 已記錄買入\n\n${symbol} × ${quantity} 股\n單價 ${currency}${price}\n成本 ${currency}${totalCost.toLocaleString()}`
    });
  } catch (error) {
    console.error('Buy error:', error);
    await client.pushMessage(lineUserId, { type: 'text', text: '記錄失敗，請稍後再試。' });
    await clearConversationState(lineUserId);
  }
}

export async function handleBuyQuantityInput(client: Client, lineUserId: string, userId: string, text: string, context: any): Promise<void> {
  const quantity = parseFloat(text.trim());
  if (isNaN(quantity) || quantity <= 0) {
    await client.pushMessage(lineUserId, { type: 'text', text: '請輸入有效股數，例如: 10' });
    return;
  }
  const { symbol, price, name } = context;
  await executeBuy(client, lineUserId, userId, symbol, name, price, quantity);
}

export async function handleSellAction(client: Client, lineUserId: string, userId: string, symbol: string, quantity?: number): Promise<void> {
  const asset = await getAsset(userId, symbol);
  if (!asset) {
    await client.pushMessage(lineUserId, { type: 'text', text: `❌ 您沒有持有 ${symbol}` });
    return;
  }

  const quote = await getStockQuote(symbol);
  if (!quote) {
    await client.pushMessage(lineUserId, { type: 'text', text: `❌ 找不到 ${symbol} 行情` });
    return;
  }

  if (quantity === undefined) {
    await updateConversationState(lineUserId, 'WAITING_SELL_QUANTITY', {
      symbol, price: quote.price, availableQuantity: asset.quantity, avgPrice: asset.avgPrice
    });
    const currency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'NT$' : '$';
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: `${symbol} 持有 ${asset.quantity} 股，現價 ${currency}${quote.price}\n請輸入賣出股數：`
    });
    return;
  }

  await executeSell(client, lineUserId, userId, symbol, quote.price, asset.avgPrice, quantity, asset.quantity);
}

export async function executeSell(client: Client, lineUserId: string, userId: string, symbol: string, price: number, avgPrice: number, quantity: number, availableQty: number): Promise<void> {
  if (quantity > availableQty) {
    await client.pushMessage(lineUserId, { type: 'text', text: `❌ 持倉不足（持有 ${availableQty} 股）` });
    return;
  }
  const currency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'NT$' : '$';
  const revenue = price * quantity;
  const profit = (price - avgPrice) * quantity;
  const profitPct = ((price - avgPrice) / avgPrice * 100).toFixed(2);
  try {
    await reduceAsset(userId, symbol, quantity);
    await createTransaction(userId, 'income', revenue, 'investment',
      `賣出 ${symbol} ${quantity}股 @ ${currency}${price}`);
    await clearConversationState(lineUserId);
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: `✅ 已記錄賣出\n\n${symbol} × ${quantity} 股\n賣出價 ${currency}${price}\n均價 ${currency}${avgPrice}\n收入 ${currency}${revenue.toLocaleString()}\n\n${profit >= 0 ? '📈 獲利' : '📉 虧損'} ${currency}${Math.abs(profit).toFixed(2)} (${profit >= 0 ? '+' : ''}${profitPct}%)`
    });
  } catch (error) {
    console.error('Sell error:', error);
    await client.pushMessage(lineUserId, { type: 'text', text: '記錄失敗，請稍後再試。' });
    await clearConversationState(lineUserId);
  }
}

export async function handleSellQuantityInput(client: Client, lineUserId: string, userId: string, text: string, context: any): Promise<void> {
  const quantity = parseFloat(text.trim());
  if (isNaN(quantity) || quantity <= 0) {
    await client.pushMessage(lineUserId, { type: 'text', text: '請輸入有效股數，例如: 5' });
    return;
  }
  const { symbol, price, availableQuantity, avgPrice } = context;
  await executeSell(client, lineUserId, userId, symbol, price, avgPrice, quantity, availableQuantity);
}

/**
 * 處理資產查詢
 */
export async function handlePortfolioQuery(client: Client, lineUserId: string, userId: string): Promise<void> {
  const assets = await getUserAssets(userId);

  if (assets.length === 0) {
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '您目前沒有任何資產持倉。'
    });
    return;
  }

  // 批次查詢現價
  let totalValue = 0;
  let totalCost = 0;
  const assetDetails = [];

  for (const asset of assets) {
    const quote = await getStockQuote(asset.symbol);
    const currentPrice = quote?.price || asset.avgPrice;
    const value = currentPrice * asset.quantity;
    const cost = asset.avgPrice * asset.quantity;
    const returnPercent = ((currentPrice - asset.avgPrice) / asset.avgPrice) * 100;

    totalValue += value;
    totalCost += cost;

    assetDetails.push({
      symbol: asset.symbol,
      value,
      returnPercent
    });
  }

  const card = createPortfolioSummaryCard(totalValue, totalCost, assetDetails);
  await client.pushMessage(lineUserId, card);
}

/**
 * 處理總資產查詢
 */
export async function handleTotalAssets(client: Client, lineUserId: string, userId: string): Promise<void> {
  const accounts = await getUserAccounts(userId);
  const assets = await getUserAssets(userId);

  // 計算現金總資產
  let cashTWD = 0;
  let cashUSD = 0;

  accounts.forEach((acc: any) => {
    if (acc.currency === 'TWD') {
      cashTWD += acc.balance;
    } else if (acc.currency === 'USD') {
      cashUSD += acc.balance;
    }
  });

  // 計算投資組合總值
  let stockValueTWD = 0;
  let stockValueUSD = 0;

  for (const asset of assets) {
    const quote = await getStockQuote(asset.symbol);
    const currentPrice = quote?.price || asset.avgPrice;
    const value = currentPrice * asset.quantity;

    // 判斷是台股還是美股
    if (asset.symbol.includes('.TW') || asset.symbol.includes('.TWO')) {
      stockValueTWD += value;
    } else {
      stockValueUSD += value;
    }
  }

  // 總資產
  const totalTWD = cashTWD + stockValueTWD;
  const totalUSD = cashUSD + stockValueUSD;

  let message = '📊 總資產概覽\n\n';

  message += '💰 台幣資產\n';
  message += `   現金：NT$ ${cashTWD.toLocaleString()}\n`;
  message += `   股票：NT$ ${stockValueTWD.toLocaleString()}\n`;
  message += `   小計：NT$ ${totalTWD.toLocaleString()}\n\n`;

  if (totalUSD > 0 || cashUSD > 0 || stockValueUSD > 0) {
    message += '💵 美金資產\n';
    message += `   現金：$ ${cashUSD.toLocaleString()}\n`;
    message += `   股票：$ ${stockValueUSD.toLocaleString()}\n`;
    message += `   小計：$ ${totalUSD.toLocaleString()}\n\n`;
  }

  // 獲取 LIFF URL
  const liffId = process.env.LIFF_ID;
  const webUrl = liffId
    ? `https://liff.line.me/${liffId}`
    : `${process.env.FRONTEND_URL || 'http://localhost:3001'}/#/?userId=${encodeURIComponent(lineUserId)}`;

  message += `🌐 查看詳細分析 → ${webUrl}`;

  await client.pushMessage(lineUserId, {
    type: 'text',
    text: message
  });
}
