/**
 * Webhook Controller - LINE Bot 主要處理邏輯
 * 整合所有服務，處理用戶訊息並回應
 */

import { Client, WebhookEvent, TextMessage, MessageEvent } from '@line/bot-sdk';
import {
  getOrCreateUser,
  getUserSettings,
  createTransaction,
  upsertAsset,
  reduceAsset,
  getAsset,
  getUserAssets,
  getConversationState,
  updateConversationState,
  clearConversationState
} from '../services/databaseService.js';
import { getStockQuote } from '../services/stockService.js';
import { calculateKelly, calculateMartingale, calculateReturn } from '../services/strategyService.js';
import {
  createStockQuoteCard,
  createExpenseCategoryQuickReply,
  createIncomeCategoryQuickReply,
  createPortfolioSummaryCard
} from '../utils/flexMessages.js';
import { parseMessage, getHelpMessage, validateQuantity, validateAmount } from '../utils/messageParser.js';

export class WebhookController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * 處理 Webhook 事件
   */
  async handleEvent(event: WebhookEvent): Promise<void> {
    // 只處理文字訊息事件
    if (event.type !== 'message' || event.message.type !== 'text') {
      return;
    }

    const messageEvent = event as MessageEvent;
    const userId = messageEvent.source.userId;

    if (!userId) {
      return;
    }

    const userMessage = event.message.text;

    try {
      // 取得或建立用戶
      const user = await getOrCreateUser(userId);

      // 取得對話狀態
      const convState = await getConversationState(userId);

      // 根據狀態處理訊息
      if (convState.state !== 'IDLE') {
        await this.handleStateBasedMessage(userId, user.id, userMessage, convState);
      } else {
        await this.handleNormalMessage(userId, user.id, userMessage);
      }

    } catch (error) {
      console.error('Error handling event:', error);
      await this.replyText(event.replyToken, '抱歉，發生錯誤，請稍後再試。');
    }
  }

  /**
   * 處理一般訊息 (IDLE 狀態)
   */
  private async handleNormalMessage(lineUserId: string, userId: string, text: string): Promise<void> {
    const intent = parseMessage(text);

    switch (intent.type) {
      case 'EXPENSE':
        // 支出 → 顯示分類選單
        await this.client.pushMessage(lineUserId, createExpenseCategoryQuickReply(intent.amount));
        await updateConversationState(lineUserId, 'WAITING_EXPENSE_CATEGORY', { amount: intent.amount });
        break;

      case 'INCOME':
        // 收入 → 顯示分類選單
        await this.client.pushMessage(lineUserId, createIncomeCategoryQuickReply(intent.amount));
        await updateConversationState(lineUserId, 'WAITING_INCOME_CATEGORY', { amount: intent.amount });
        break;

      case 'STOCK_QUERY':
        // 股票查詢
        await this.handleStockQuery(lineUserId, userId, intent.symbol);
        break;

      case 'BUY_ACTION':
        // 買入操作
        await this.handleBuyAction(lineUserId, userId, intent.symbol);
        break;

      case 'SELL_ACTION':
        // 賣出操作
        await this.handleSellAction(lineUserId, userId, intent.symbol);
        break;

      case 'EXPENSE_CATEGORY':
        // 直接輸入分類
        await this.handleExpenseCategory(lineUserId, userId, intent.category, intent.amount);
        break;

      case 'INCOME_CATEGORY':
        // 直接輸入分類
        await this.handleIncomeCategory(lineUserId, userId, intent.category, intent.amount);
        break;

      case 'HELP':
        await this.client.pushMessage(lineUserId, { type: 'text', text: getHelpMessage() });
        break;

      case 'PORTFOLIO':
        await this.handlePortfolioQuery(lineUserId, userId);
        break;

      case 'WEBSITE':
        await this.handleWebsiteLink(lineUserId);
        break;

      default:
        await this.client.pushMessage(lineUserId, {
          type: 'text',
          text: '抱歉，我不太理解您的意思。\n輸入「說明」查看使用指南。'
        });
    }
  }

  /**
   * 處理狀態相關訊息 (等待用戶輸入)
   */
  private async handleStateBasedMessage(
    lineUserId: string,
    userId: string,
    text: string,
    convState: any
  ): Promise<void> {
    // 檢查是否要取消操作
    if (/^(取消|cancel|exit)$/i.test(text.trim())) {
      await clearConversationState(lineUserId);
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '✅ 已取消操作'
      });
      return;
    }

    const context = convState.context ? JSON.parse(convState.context) : {};

    switch (convState.state) {
      case 'WAITING_BUY_QUANTITY':
        await this.handleBuyQuantityInput(lineUserId, userId, text, context);
        break;

      case 'WAITING_SELL_QUANTITY':
        await this.handleSellQuantityInput(lineUserId, userId, text, context);
        break;

      default:
        // 回到一般處理
        await clearConversationState(lineUserId);
        await this.handleNormalMessage(lineUserId, userId, text);
    }
  }

  /**
   * 處理股票查詢
   */
  private async handleStockQuery(lineUserId: string, userId: string, symbol: string): Promise<void> {
    const quote = await getStockQuote(symbol);

    if (!quote) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `無法查詢 ${symbol} 的行情，請確認股票代號是否正確。`
      });
      return;
    }

    // 取得用戶設定
    const settings = await getUserSettings(userId);
    const user = await getOrCreateUser(lineUserId);

    // 計算凱利建議
    const kelly = calculateKelly(
      settings.kellyWinProbability,
      settings.kellyOdds,
      user.bankroll
    );

    // 檢查是否有持倉，計算馬丁格爾
    const asset = await getAsset(userId, symbol);
    let martingale = undefined;

    if (asset && asset.avgPrice > quote.price) {
      // 如果有虧損，顯示救援點
      martingale = calculateMartingale(
        asset.avgPrice * asset.quantity * 0.1, // 假設初始投資為 10% 持倉
        1,
        quote.price,
        asset.avgPrice,
        settings.martingaleMultiplier
      );
    }

    // 發送行情卡片
    const card = createStockQuoteCard(quote, kelly, martingale);
    await this.client.pushMessage(lineUserId, card);
  }

  /**
   * 處理買入操作
   */
  private async handleBuyAction(lineUserId: string, userId: string, symbol: string): Promise<void> {
    const quote = await getStockQuote(symbol);

    if (!quote) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `無法查詢 ${symbol} 的行情。`
      });
      return;
    }

    // 設定狀態，等待用戶輸入數量
    await updateConversationState(lineUserId, 'WAITING_BUY_QUANTITY', {
      symbol,
      price: quote.price,
      name: quote.name
    });

    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: `請輸入要買入的股數\n(${symbol} @ $${quote.price})\n\n例如: 10`
    });
  }

  /**
   * 處理買入數量輸入
   */
  private async handleBuyQuantityInput(
    lineUserId: string,
    userId: string,
    text: string,
    context: any
  ): Promise<void> {
    // 直接解析數字，不使用 parseMessage（避免被判斷為收入）
    const trimmed = text.trim();
    const quantity = parseFloat(trimmed);

    // 檢查是否為有效數字
    if (isNaN(quantity) || !/^\d+(\.\d+)?$/.test(trimmed)) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '請輸入有效的數量 (例如: 10)'
      });
      return;
    }

    const validation = validateQuantity(quantity);
    if (!validation.valid) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: validation.error || '數量無效'
      });
      return;
    }

    const { symbol, price, name } = context;
    const totalCost = price * quantity;

    // 儲存至資料庫
    await upsertAsset(userId, symbol, name, 'Stock', quantity, price);

    // 清除狀態
    await clearConversationState(lineUserId);

    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: `✅ 買入成功！\n\n${symbol} x ${quantity} 股\n單價: $${price}\n總計: $${totalCost.toFixed(2)}`
    });
  }

  /**
   * 處理賣出操作
   */
  private async handleSellAction(lineUserId: string, userId: string, symbol: string): Promise<void> {
    const asset = await getAsset(userId, symbol);

    if (!asset) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `您尚未持有 ${symbol}`
      });
      return;
    }

    const quote = await getStockQuote(symbol);

    if (!quote) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `無法查詢 ${symbol} 的行情。`
      });
      return;
    }

    // 設定狀態
    await updateConversationState(lineUserId, 'WAITING_SELL_QUANTITY', {
      symbol,
      price: quote.price,
      availableQuantity: asset.quantity,
      avgPrice: asset.avgPrice
    });

    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: `請輸入要賣出的股數\n(持有: ${asset.quantity} 股)\n現價: $${quote.price}\n\n例如: 5`
    });
  }

  /**
   * 處理賣出數量輸入
   */
  private async handleSellQuantityInput(
    lineUserId: string,
    userId: string,
    text: string,
    context: any
  ): Promise<void> {
    // 直接解析數字，不使用 parseMessage（避免被判斷為收入）
    const trimmed = text.trim();
    const quantity = parseFloat(trimmed);

    // 檢查是否為有效數字
    if (isNaN(quantity) || !/^\d+(\.\d+)?$/.test(trimmed)) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '請輸入有效的數量'
      });
      return;
    }

    const { symbol, price, availableQuantity, avgPrice } = context;

    if (quantity > availableQuantity) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `持倉不足 (僅有 ${availableQuantity} 股)`
      });
      return;
    }

    // 減少持倉
    await reduceAsset(userId, symbol, quantity);

    // 計算獲利
    const profit = (price - avgPrice) * quantity;
    const profitPercent = ((price - avgPrice) / avgPrice) * 100;

    await clearConversationState(lineUserId);

    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: `✅ 賣出成功！\n\n${symbol} x ${quantity} 股\n賣出價: $${price}\n平均成本: $${avgPrice}\n\n${profit >= 0 ? '獲利' : '虧損'}: $${Math.abs(profit).toFixed(2)} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)`
    });
  }

  /**
   * 處理支出分類
   */
  private async handleExpenseCategory(
    lineUserId: string,
    userId: string,
    category: string,
    amount: number
  ): Promise<void> {
    await createTransaction(userId, 'expense', amount, category);
    await clearConversationState(lineUserId);

    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: `✅ 已記錄支出\n\n類別: ${category}\n金額: -$${amount}`
    });
  }

  /**
   * 處理收入分類
   */
  private async handleIncomeCategory(
    lineUserId: string,
    userId: string,
    category: string,
    amount: number
  ): Promise<void> {
    await createTransaction(userId, 'income', amount, category);
    await clearConversationState(lineUserId);

    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: `✅ 已記錄收入\n\n類別: ${category}\n金額: +$${amount}`
    });
  }

  /**
   * 處理資產查詢
   */
  private async handlePortfolioQuery(lineUserId: string, userId: string): Promise<void> {
    const assets = await getUserAssets(userId);

    if (assets.length === 0) {
      await this.client.pushMessage(lineUserId, {
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
    await this.client.pushMessage(lineUserId, card);
  }

  /**
   * 處理網站連結請求
   */
  private async handleWebsiteLink(lineUserId: string): Promise<void> {
    // 開發環境使用 localhost，生產環境改為你的網域
    const webUrl = `http://localhost:3001/#/?userId=${lineUserId}`;

    await this.client.pushMessage(lineUserId, {
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
   * 回覆文字訊息
   */
  private async replyText(replyToken: string, text: string): Promise<void> {
    await this.client.replyMessage(replyToken, {
      type: 'text',
      text
    });
  }
}
