/**
 * Webhook Controller - LINE Bot 主要處理邏輯
 * 整合所有服務，處理用戶訊息並回應
 */

import { Client, WebhookEvent, TextMessage, MessageEvent } from '@line/bot-sdk';
import {
  getOrCreateUser,
  getUserSettings,
  createTransaction,
  getUserTransactions,
  upsertAsset,
  reduceAsset,
  getAsset,
  getUserAssets,
  getConversationState,
  updateConversationState,
  clearConversationState,
  getUserAccounts,
  getAccount,
  updateAccountBalance,
  createAccount,
  upsertBudget,
  getUserBudgets
} from '../services/databaseService.js';
import { getStockQuote } from '../services/stockService.js';
import { calculateKelly } from '../services/strategyService.js';
import { predictExpenseCategory, predictIncomeCategory } from '../services/categoryPredictionService.js';
import { getExchangeRate } from '../services/exchangeRateService.js';
import {
  createStockQuoteCard,
  createExpenseCategoryQuickReply,
  createIncomeCategoryQuickReply,
  createPortfolioSummaryCard,
  createTransactionSuccessCard,
  createWelcomeCard
} from '../utils/flexMessages.js';
import { parseMessage, getHelpMessage, getHelpCard, validateQuantity, validateAmount } from '../utils/messageParser.js';
import {
  parseExpenseCommand,
  parseBatchExpenseCommands,
  learnKeyword
} from '../services/expenseParserService.js';
import {
  setConversationState as setConvState,
  clearConversationState as clearConvState,
  generateCategoryConfirmationMessage,
  generateCategorySelectionMessage,
  numberToCategory
} from '../services/conversationService.js';

/**
 * 依台灣時間（UTC+8）推斷餐別
 */
function getMealSubcategoryByTime(): string {
  const taiwanHour = (new Date().getUTCHours() + 8) % 24;
  if (taiwanHour >= 6 && taiwanHour < 10) return '早餐';
  if (taiwanHour >= 10 && taiwanHour < 14) return '午餐';
  if (taiwanHour >= 14 && taiwanHour < 17) return '下午茶';
  if (taiwanHour >= 17 && taiwanHour < 21) return '晚餐';
  return '宵夜'; // 21:00 - 05:59
}

export class WebhookController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * 處理 Webhook 事件
   */
  async handleEvent(event: WebhookEvent): Promise<void> {
    // 新用戶加入 → 發送歡迎卡片
    if (event.type === 'follow') {
      const userId = event.source.userId;
      if (!userId) return;
      try {
        const profile = await this.client.getProfile(userId);
        await getOrCreateUser(userId, profile.displayName);
        await this.client.pushMessage(userId, createWelcomeCard(profile.displayName));
      } catch (error) {
        console.error('Follow event error:', error);
      }
      return;
    }

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
    // 🤖 智能記帳：檢查是否為記帳指令（數字開頭，可選「記」）
    const trimmed = text.trim();
    if (trimmed.startsWith('記') || /^[+\-]?\d+/.test(trimmed)) {
      await this.handleSmartExpense(lineUserId, userId, trimmed);
      return;
    }

    const intent = parseMessage(text);

    switch (intent.type) {
      case 'EXPENSE':
        // 支出 → 使用智能預測 + 顯示分類選單
        try {
          const predictedCategory = await predictExpenseCategory(userId, intent.amount);
          await this.client.pushMessage(lineUserId, createExpenseCategoryQuickReply(intent.amount, predictedCategory));
          await updateConversationState(lineUserId, 'WAITING_EXPENSE_CATEGORY', {
            amount: intent.amount,
            note: intent.note // 保存備註
          });
        } catch (error) {
          console.error('預測分類失敗:', error);
          await this.client.pushMessage(lineUserId, createExpenseCategoryQuickReply(intent.amount));
          await updateConversationState(lineUserId, 'WAITING_EXPENSE_CATEGORY', {
            amount: intent.amount,
            note: intent.note // 保存備註
          });
        }
        break;

      case 'INCOME':
        // 收入 → 使用智能預測 + 顯示分類選單
        try {
          const predictedCategory = await predictIncomeCategory(userId, intent.amount);
          await this.client.pushMessage(lineUserId, createIncomeCategoryQuickReply(intent.amount, predictedCategory));
          await updateConversationState(lineUserId, 'WAITING_INCOME_CATEGORY', {
            amount: intent.amount,
            note: intent.note // 保存備註
          });
        } catch (error) {
          console.error('預測分類失敗:', error);
          await this.client.pushMessage(lineUserId, createIncomeCategoryQuickReply(intent.amount));
          await updateConversationState(lineUserId, 'WAITING_INCOME_CATEGORY', {
            amount: intent.amount,
            note: intent.note // 保存備註
          });
        }
        break;

      case 'STOCK_QUERY':
        await this.handleStockQuery(lineUserId, userId, intent.symbol, intent.showKelly);
        break;

      case 'BUY_ACTION':
        await this.handleBuyAction(lineUserId, userId, intent.symbol, intent.quantity);
        break;

      case 'SELL_ACTION':
        // 賣出操作
        await this.handleSellAction(lineUserId, userId, intent.symbol, intent.quantity);
        break;

      case 'EXPENSE_CATEGORY':
        await this.handleExpenseCategory(lineUserId, userId, intent.category, intent.amount, intent.note, intent.subcategory);
        break;

      case 'INCOME_CATEGORY':
        // 直接輸入分類（支持備註）
        await this.handleIncomeCategory(lineUserId, userId, intent.category, intent.amount, intent.note);
        break;

      case 'HELP':
        await this.client.pushMessage(lineUserId, getHelpCard());
        break;

      case 'PORTFOLIO':
        await this.handlePortfolioQuery(lineUserId, userId);
        break;

      case 'WEBSITE':
        await this.handleWebsiteLink(lineUserId);
        break;

      case 'ACCOUNT_LIST':
        await this.handleAccountList(lineUserId, userId);
        break;

      case 'CREATE_ACCOUNT':
        await this.handleCreateAccount(lineUserId, userId);
        break;

      case 'TOTAL_ASSETS':
        await this.handleTotalAssets(lineUserId, userId);
        break;

      case 'LEDGER':
        await this.handleLedgerLink(lineUserId);
        break;

      case 'EXPENSE_QUERY':
        await this.handleExpenseQuery(lineUserId, userId, intent.period, intent.category);
        break;

      case 'BUDGET_QUERY':
        await this.handleBudgetQuery(lineUserId, userId);
        break;

      case 'SET_BUDGET':
        await this.handleSetBudget(lineUserId, userId, intent.category, intent.amount);
        break;

      default:
        await this.client.pushMessage(lineUserId, {
          type: 'text',
          text: '看不太懂你說的 🤔\n\n點下方快速開始，或輸入「說明」查看完整指南',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '💸 午餐 120', text: '午餐 120' } },
              { type: 'action', action: { type: 'message', label: '📊 今天花了多少', text: '今天花了多少' } },
              { type: 'action', action: { type: 'message', label: '💰 本月預算', text: '預算' } },
              { type: 'action', action: { type: 'message', label: '📈 查 TSLA', text: 'TSLA' } },
              { type: 'action', action: { type: 'message', label: '📖 說明', text: '說明' } }
            ]
          }
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
      case 'WAITING_EXPENSE_CATEGORY':
        await this.handleExpenseCategorySelection(lineUserId, userId, text, context);
        break;

      case 'WAITING_INCOME_CATEGORY':
        await this.handleIncomeCategorySelection(lineUserId, userId, text, context);
        break;

      case 'WAITING_ACCOUNT_SELECT':
        await this.handleAccountSelection(lineUserId, userId, text, context);
        break;

      case 'WAITING_BUY_QUANTITY':
        await this.handleBuyQuantityInput(lineUserId, userId, text, context);
        break;

      case 'WAITING_SELL_QUANTITY':
        await this.handleSellQuantityInput(lineUserId, userId, text, context);
        break;

      // 🤖 智能記帳新增的狀態
      case 'WAITING_CATEGORY_CONFIRMATION':
        await this.handleCategoryConfirmation(lineUserId, userId, text, context);
        break;

      case 'WAITING_CATEGORY_SELECTION':
        await this.handleSmartCategorySelection(lineUserId, userId, text, context);
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
  private async handleStockQuery(lineUserId: string, userId: string, symbol: string, showKelly = false): Promise<void> {
    const quote = await getStockQuote(symbol);

    if (!quote) {
      await this.client.pushMessage(lineUserId, {
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
      await this.client.pushMessage(lineUserId, {
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
    await this.client.pushMessage(lineUserId, card);
  }

  /**
   * 處理支出分類選擇（Quick Reply 回應）
   */
  private async handleExpenseCategorySelection(
    lineUserId: string,
    userId: string,
    text: string,
    context: any
  ): Promise<void> {
    const { amount, note } = context; // 從 context 取得備註

    // 解析分類（支援中文分類名稱或直接輸入分類）
    let category = '其他';
    const categoryMap: Record<string, string> = {
      '飲食': '飲食',
      '交通': '交通',
      '居住': '居住',
      '娛樂': '娛樂',
      '購物': '購物',
      '醫療': '醫療',
      '其他': '其他',
      '其他支出': '其他'
    };

    // 支援兩種格式：
    // 1. 純分類名稱：「飲食」
    // 2. 分類 + 金額：「飲食 100」（忽略金額，因為 amount 已在 context 中）
    const trimmed = text.trim();

    // 先嘗試直接匹配
    if (categoryMap[trimmed]) {
      category = categoryMap[trimmed];
    } else {
      // 嘗試提取分類名稱（移除數字和空格）
      const categoryMatch = trimmed.match(/^(飲食|交通|居住|娛樂|購物|醫療|其他支出|其他)/);
      if (categoryMatch && categoryMap[categoryMatch[1]]) {
        category = categoryMap[categoryMatch[1]];
      } else {
        // 如果不是有效分類，提示用戶
        await this.client.pushMessage(lineUserId, {
          type: 'text',
          text: '請從分類按鈕中選擇，或輸入「取消」'
        });
        return;
      }
    }

    // 呼叫已有的處理函數，傳入備註
    await this.handleExpenseCategory(lineUserId, userId, category, amount, note);
  }

  /**
   * 處理收入分類選擇（Quick Reply 回應）
   */
  private async handleIncomeCategorySelection(
    lineUserId: string,
    userId: string,
    text: string,
    context: any
  ): Promise<void> {
    const { amount, note } = context; // 從 context 取得備註

    // 解析分類
    let category = '其他';
    const categoryMap: Record<string, string> = {
      '薪資': '薪資',
      '薪水': '薪資',
      '獎金': '獎金',
      '紅利': '獎金',
      '股息': '股息',
      '配息': '股息',
      '投資獲利': '投資獲利',
      '兼職': '兼職',
      '副業': '兼職',
      '其他': '其他',
      '其他收入': '其他'
    };

    // 支援兩種格式：
    // 1. 純分類名稱：「股息」
    // 2. 分類 + 金額：「股息 100」（忽略金額，因為 amount 已在 context 中）
    const trimmed = text.trim();

    // 先嘗試直接匹配
    if (categoryMap[trimmed]) {
      category = categoryMap[trimmed];
    } else {
      // 嘗試提取分類名稱（移除數字和空格）
      const categoryMatch = trimmed.match(/^(薪資|薪水|獎金|紅利|股息|配息|投資獲利|兼職|副業|其他收入|其他)/);
      if (categoryMatch && categoryMap[categoryMatch[1]]) {
        category = categoryMap[categoryMatch[1]];
      } else {
        // 如果不是有效分類，提示用戶
        await this.client.pushMessage(lineUserId, {
          type: 'text',
          text: '請從分類按鈕中選擇，或輸入「取消」'
        });
        return;
      }
    }

    // 呼叫已有的處理函數，傳入備註
    await this.handleIncomeCategory(lineUserId, userId, category, amount, note);
  }

  /**
   * 處理帳戶選擇
   */
  private async handleAccountSelection(
    lineUserId: string,
    userId: string,
    text: string,
    context: any
  ): Promise<void> {
    const match = text.match(/選擇帳戶\s+(\d+)/);
    
    if (!match) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '請點擊下方按鈕選擇帳戶'
      });
      return;
    }

    const accountIndex = parseInt(match[1]) - 1;
    const { availableAccounts, symbol, price, name, stockCurrency } = context;

    if (accountIndex < 0 || accountIndex >= availableAccounts.length) {
      await this.client.pushMessage(lineUserId, {
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

    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: `請輸入要買入的股數\n` +
        `股票：${symbol} @ $${price}\n` +
        `帳戶：${selectedAccount.name} (${selectedAccount.currency})\n` +
        `餘額：${selectedAccount.currency === 'TWD' ? 'NT$' : '$'}${selectedAccount.balance.toLocaleString()}\n` +
        (needsExchange ? `\n⚠️ 將以複委託方式下單\n匯率：1 USD ≈ ${exchangeRate} TWD\n` : '') +
        `\n例如: 10`
    });
  }

  /**
   * 處理買入操作
   */
  private async handleBuyAction(lineUserId: string, userId: string, symbol: string, quantity?: number): Promise<void> {
    const quote = await getStockQuote(symbol);
    if (!quote) {
      await this.client.pushMessage(lineUserId, { type: 'text', text: `❌ 找不到 ${symbol} 行情` });
      return;
    }

    if (quantity === undefined) {
      // 問一次股數
      await updateConversationState(lineUserId, 'WAITING_BUY_QUANTITY', {
        symbol, price: quote.price, name: quote.name
      });
      const currency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'NT$' : '$';
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `${quote.name}（${symbol}）現價 ${currency}${quote.price}\n請輸入買入股數：`
      });
      return;
    }

    await this.executeBuy(lineUserId, userId, symbol, quote.name, quote.price, quantity);
  }

  private async executeBuy(lineUserId: string, userId: string, symbol: string, name: string, price: number, quantity: number): Promise<void> {
    const currency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'NT$' : '$';
    const totalCost = price * quantity;
    try {
      await upsertAsset(userId, symbol, name, 'Stock', quantity, price);
      await createTransaction(userId, 'expense', totalCost, 'investment',
        `買入 ${symbol} ${quantity}股 @ ${currency}${price}`);
      await clearConversationState(lineUserId);
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `✅ 已記錄買入\n\n${symbol} × ${quantity} 股\n單價 ${currency}${price}\n成本 ${currency}${totalCost.toLocaleString()}`
      });
    } catch (error) {
      console.error('Buy error:', error);
      await this.client.pushMessage(lineUserId, { type: 'text', text: '記錄失敗，請稍後再試。' });
      await clearConversationState(lineUserId);
    }
  }

  private async handleBuyQuantityInput(lineUserId: string, userId: string, text: string, context: any): Promise<void> {
    const quantity = parseFloat(text.trim());
    if (isNaN(quantity) || quantity <= 0) {
      await this.client.pushMessage(lineUserId, { type: 'text', text: '請輸入有效股數，例如: 10' });
      return;
    }
    const { symbol, price, name } = context;
    await this.executeBuy(lineUserId, userId, symbol, name, price, quantity);
  }

  private async handleSellAction(lineUserId: string, userId: string, symbol: string, quantity?: number): Promise<void> {
    const asset = await getAsset(userId, symbol);
    if (!asset) {
      await this.client.pushMessage(lineUserId, { type: 'text', text: `❌ 您沒有持有 ${symbol}` });
      return;
    }

    const quote = await getStockQuote(symbol);
    if (!quote) {
      await this.client.pushMessage(lineUserId, { type: 'text', text: `❌ 找不到 ${symbol} 行情` });
      return;
    }

    if (quantity === undefined) {
      await updateConversationState(lineUserId, 'WAITING_SELL_QUANTITY', {
        symbol, price: quote.price, availableQuantity: asset.quantity, avgPrice: asset.avgPrice
      });
      const currency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'NT$' : '$';
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `${symbol} 持有 ${asset.quantity} 股，現價 ${currency}${quote.price}\n請輸入賣出股數：`
      });
      return;
    }

    await this.executeSell(lineUserId, userId, symbol, quote.price, asset.avgPrice, quantity, asset.quantity);
  }

  private async executeSell(lineUserId: string, userId: string, symbol: string, price: number, avgPrice: number, quantity: number, availableQty: number): Promise<void> {
    if (quantity > availableQty) {
      await this.client.pushMessage(lineUserId, { type: 'text', text: `❌ 持倉不足（持有 ${availableQty} 股）` });
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
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `✅ 已記錄賣出\n\n${symbol} × ${quantity} 股\n賣出價 ${currency}${price}\n均價 ${currency}${avgPrice}\n收入 ${currency}${revenue.toLocaleString()}\n\n${profit >= 0 ? '📈 獲利' : '📉 虧損'} ${currency}${Math.abs(profit).toFixed(2)} (${profit >= 0 ? '+' : ''}${profitPct}%)`
      });
    } catch (error) {
      console.error('Sell error:', error);
      await this.client.pushMessage(lineUserId, { type: 'text', text: '記錄失敗，請稍後再試。' });
      await clearConversationState(lineUserId);
    }
  }

  private async handleSellQuantityInput(lineUserId: string, userId: string, text: string, context: any): Promise<void> {
    const quantity = parseFloat(text.trim());
    if (isNaN(quantity) || quantity <= 0) {
      await this.client.pushMessage(lineUserId, { type: 'text', text: '請輸入有效股數，例如: 5' });
      return;
    }
    const { symbol, price, availableQuantity, avgPrice } = context;
    await this.executeSell(lineUserId, userId, symbol, price, avgPrice, quantity, availableQuantity);
  }

  /**
   * 取得或創建預設現金帳戶
   */
  private async getOrCreateDefaultCashAccount(userId: string): Promise<string> {
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
   * 處理支出分類
   */
  private async handleExpenseCategory(
    lineUserId: string,
    userId: string,
    category: string,
    amount: number,
    note?: string,
    subcategory?: string
  ): Promise<void> {
    // 飲食類自動推斷餐別（Taiwan UTC+8）
    const resolvedSubcategory = subcategory ?? (
      category === '飲食' ? getMealSubcategoryByTime() : undefined
    );

    const accountId = await this.getOrCreateDefaultCashAccount(userId);
    await createTransaction(userId, 'expense', amount, category, note, accountId, undefined, undefined, undefined, resolvedSubcategory);
    await clearConversationState(lineUserId);
    await this.sendSuccessCard(lineUserId, userId, category, amount, note || '', resolvedSubcategory, 'expense');
  }

  /**
   * 記帳後檢查是否觸發預算警告
   */
  private async checkBudgetAlert(lineUserId: string, userId: string, category: string, totalMonthlyExpense: number): Promise<void> {
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
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `⚠️ 預算提醒\n\n${warnings.join('\n\n')}`
      });
    }
  }

  /**
   * 處理收入分類
   */
  private async handleIncomeCategory(
    lineUserId: string,
    userId: string,
    category: string,
    amount: number,
    note?: string
  ): Promise<void> {
    // 取得預設現金帳戶
    const accountId = await this.getOrCreateDefaultCashAccount(userId);

    // 創建交易（帶備註和帳戶）
    await createTransaction(userId, 'income', amount, category, note, accountId);
    await clearConversationState(lineUserId);

    // 獲取本月統計
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const allTransactions = await getUserTransactions(userId, 100);

    // 計算本月收支
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    allTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate >= startOfMonth) {
        if (tx.type === 'income') {
          monthlyIncome += tx.amount;
        } else {
          monthlyExpense += tx.amount;
        }
      }
    });

    // 獲取最近2筆交易（不包括剛剛的這筆）
    const recentTransactions = allTransactions
      .slice(1, 3)
      .map(tx => ({
        date: typeof tx.date === 'string' ? tx.date : tx.date.toISOString(),
        type: tx.type as 'income' | 'expense',
        amount: tx.amount,
        category: tx.category
      }));

    // 獲取 LIFF URL
    const liffId = process.env.LIFF_ID;
    const liffUrl = liffId ? `https://liff.line.me/${liffId}#/ledger` : undefined;

    // 發送卡片
    const card = createTransactionSuccessCard({
      type: 'income',
      amount,
      category,
      monthlyIncome,
      monthlyExpense,
      monthlyBalance: monthlyIncome - monthlyExpense,
      recentTransactions,
      liffUrl
    });

    await this.client.pushMessage(lineUserId, card);
  }

  /**
   * 處理費用查詢（今天/本週/本月花了多少）
   */
  private async handleExpenseQuery(
    lineUserId: string,
    userId: string,
    period: 'today' | 'week' | 'month',
    category?: string
  ): Promise<void> {
    // 計算台灣時間的日期範圍（UTC+8）
    const now = new Date();
    const taiwanOffset = 8 * 60 * 60 * 1000;
    const taiwanNow = new Date(now.getTime() + taiwanOffset);

    let startDate: Date;
    let periodLabel: string;

    if (period === 'today') {
      startDate = new Date(Date.UTC(
        taiwanNow.getUTCFullYear(),
        taiwanNow.getUTCMonth(),
        taiwanNow.getUTCDate()
      ) - taiwanOffset);
      periodLabel = '今天';
    } else if (period === 'week') {
      const dayOfWeek = taiwanNow.getUTCDay(); // 0=日, 1=一...
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(Date.UTC(
        taiwanNow.getUTCFullYear(),
        taiwanNow.getUTCMonth(),
        taiwanNow.getUTCDate() - daysFromMonday
      ) - taiwanOffset);
      periodLabel = '本週';
    } else {
      startDate = new Date(Date.UTC(
        taiwanNow.getUTCFullYear(),
        taiwanNow.getUTCMonth(),
        1
      ) - taiwanOffset);
      periodLabel = '本月';
    }

    // 取得該時段所有交易（多取一些）
    const allTransactions = await getUserTransactions(userId, 500);
    const periodTransactions = allTransactions.filter(tx => new Date(tx.date) >= startDate);

    // 分類對應（子分類也對應到飲食）
    const SUBCATEGORIES_TO_PARENT: Record<string, string> = {
      '早餐': '飲食', '午餐': '飲食', '晚餐': '飲食', '下午茶': '飲食', '宵夜': '飲食'
    };

    const filtered = category
      ? periodTransactions.filter(tx => {
          const cat = tx.category;
          const sub = (tx as any).subcategory;
          const matchCat = cat === category || SUBCATEGORIES_TO_PARENT[category] === cat;
          const matchSub = sub === category;
          return tx.type === 'expense' && (matchCat || matchSub);
        })
      : periodTransactions.filter(tx => tx.type === 'expense');

    const totalExpense = filtered.reduce((sum, tx) => sum + tx.amount, 0);
    const totalIncome = periodTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // 計算分類明細（以父分類為鍵，子分類不單獨列出）
    const categoryBreakdown: Record<string, number> = {};
    filtered.forEach(tx => {
      const key = tx.category; // 統一用父分類
      categoryBreakdown[key] = (categoryBreakdown[key] || 0) + tx.amount;
    });

    const sortedCategories = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    let msg = category
      ? `📊 ${periodLabel}${category}支出\n\n總計：$${totalExpense.toFixed(0)} 元\n筆數：${filtered.length} 筆`
      : `📊 ${periodLabel}花費\n\n💸 支出：$${totalExpense.toFixed(0)} 元\n💰 收入：$${totalIncome.toFixed(0)} 元\n📈 結餘：$${(totalIncome - totalExpense).toFixed(0)} 元`;

    if (sortedCategories.length > 0 && !category) {
      msg += '\n\n📋 分類明細：';
      sortedCategories.forEach(([cat, amt]) => {
        msg += `\n• ${cat}：$${amt.toFixed(0)}`;
      });
    }

    if (filtered.length === 0) {
      msg = `${periodLabel}還沒有${category ? category + '的' : ''}支出記錄 🎉`;
    }

    await this.client.pushMessage(lineUserId, { type: 'text', text: msg });
  }

  /**
   * 設定分類預算
   */
  private async handleSetBudget(lineUserId: string, userId: string, category: string, amount: number): Promise<void> {
    await upsertBudget(userId, category, amount);
    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: `✅ 已設定${category}月預算：$${amount.toLocaleString()} 元\n\n輸入「預算」可查看所有預算狀況`
    });
  }

  /**
   * 查詢預算使用狀況
   */
  private async handleBudgetQuery(lineUserId: string, userId: string): Promise<void> {
    const budgets = await getUserBudgets(userId);
    if (budgets.length === 0) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '尚未設定任何預算\n\n💡 設定方式：\n「設預算 飲食 5000」\n「設預算 交通 2000」\n「設預算 總計 20000」'
      });
      return;
    }

    // 計算本月支出（台灣時間）
    const now = new Date();
    const taiwanOffset = 8 * 60 * 60 * 1000;
    const taiwanNow = new Date(now.getTime() + taiwanOffset);
    const startOfMonth = new Date(Date.UTC(
      taiwanNow.getUTCFullYear(),
      taiwanNow.getUTCMonth(),
      1
    ) - taiwanOffset);

    const allTransactions = await getUserTransactions(userId, 500);
    const monthExpenses = allTransactions.filter(
      tx => tx.type === 'expense' && new Date(tx.date) >= startOfMonth
    );

    // 計算各分類支出
    const spentByCategory: Record<string, number> = { '總計': 0 };
    monthExpenses.forEach(tx => {
      spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + tx.amount;
      spentByCategory['總計'] += tx.amount;
    });

    const BAR_WIDTH = 10;
    const makeBar = (pct: number) => {
      const filled = Math.min(Math.round(pct / 10), BAR_WIDTH);
      return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
    };

    let msg = '📊 本月預算使用狀況\n\n';
    for (const b of budgets) {
      const spent = spentByCategory[b.category] || 0;
      const pct = Math.round((spent / b.amount) * 100);
      const bar = makeBar(pct);
      const status = pct >= 100 ? ' 🔴' : pct >= 90 ? ' 🟠' : pct >= 70 ? ' 🟡' : ' 🟢';
      msg += `${b.category}${status}\n${bar} ${pct}%\n$${spent.toFixed(0)} / $${b.amount.toLocaleString()}\n\n`;
    }
    msg += '💡 設預算 [分類] [金額] 可修改';

    await this.client.pushMessage(lineUserId, { type: 'text', text: msg });
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
   * 處理帳戶列表查詢
   */
  private async handleAccountList(lineUserId: string, userId: string): Promise<void> {
    const accounts = await getUserAccounts(userId);

    if (accounts.length === 0) {
      await this.client.pushMessage(lineUserId, {
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

    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: message
    });
  }

  /**
   * 處理建立帳戶請求（引導至網頁版）
   */
  private async handleCreateAccount(lineUserId: string, userId: string): Promise<void> {
    const liffId = process.env.LIFF_ID;
    const webUrl = liffId
      ? `https://liff.line.me/${liffId}/#/settings`
      : `${process.env.FRONTEND_URL || 'http://localhost:3001'}/#/settings?userId=${encodeURIComponent(lineUserId)}`;

    await this.client.pushMessage(lineUserId, {
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
   * 處理總資產查詢
   */
  private async handleTotalAssets(lineUserId: string, userId: string): Promise<void> {
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

    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: message
    });
  }

  /**
   * 處理記帳頁面連結
   */
  private async handleLedgerLink(lineUserId: string): Promise<void> {
    const liffId = process.env.LIFF_ID;
    const webUrl = liffId
      ? `https://liff.line.me/${liffId}/#/ledger`
      : `${process.env.FRONTEND_URL || 'http://localhost:3001'}/#/ledger?userId=${encodeURIComponent(lineUserId)}`;

    await this.client.pushMessage(lineUserId, {
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
  private async handleWebsiteLink(lineUserId: string): Promise<void> {
    // 優先使用 LIFF URL（生產環境），回退到 FRONTEND_URL（開發環境）
    // 導向資產主頁 (Dashboard)
    const liffId = process.env.LIFF_ID;
    const webUrl = liffId
      ? `https://liff.line.me/${liffId}#/`
      : `${process.env.FRONTEND_URL || 'http://localhost:3001'}/#/?userId=${encodeURIComponent(lineUserId)}`;

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
   * 🤖 智能記帳主處理函數
   */
  private async handleSmartExpense(lineUserId: string, userId: string, text: string): Promise<void> {
    // 檢查是否為批次記帳（包含換行）
    if (text.includes('\n')) {
      await this.handleBatchExpense(lineUserId, userId, text);
      return;
    }

    // 單筆記帳
    const result = await parseExpenseCommand(userId, text);

    if (!result) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '❌ 指令格式錯誤\n\n範例：\n記 100\n記 100 午餐\n記 100 飲食 下午茶 星巴克'
      });
      return;
    }

    // 如果需要確認
    if (result.needConfirmation) {
      // 保存 context 並等待用戶確認
      await setConvState(lineUserId, 'WAITING_CATEGORY_CONFIRMATION', {
        amount: result.amount,
        keyword: result.note || '',
        category: result.category,
        subcategory: result.subcategory,
        note: result.note
      });

      const message = generateCategoryConfirmationMessage(
        result.amount,
        result.note || '',
        result.category
      );

      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: message
      });
      return;
    }

    // 直接記帳（信心度高）
    await this.createSmartExpense(lineUserId, userId, result);
  }

  /**
   * 🤖 批次記帳處理
   */
  private async handleBatchExpense(lineUserId: string, userId: string, text: string): Promise<void> {
    const results = await parseBatchExpenseCommands(userId, text);

    if (results.length === 0) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '❌ 沒有找到有效的記帳指令'
      });
      return;
    }

    // 批次處理每一筆
    let successCount = 0;
    const messages: string[] = [];

    for (const result of results) {
      try {
        await this.createSmartExpense(lineUserId, userId, result, false); // 不發送個別成功訊息
        successCount++;
        messages.push(`✅ $${result.amount} - ${result.category}${result.subcategory ? ` > ${result.subcategory}` : ''}`);
      } catch (error) {
        console.error('Batch expense error:', error);
        messages.push(`❌ $${result.amount} - 記帳失敗`);
      }
    }

    // 發送批次結果
    const summary = `📋 批次記帳完成\n\n${messages.join('\n')}\n\n成功：${successCount}/${results.length} 筆`;
    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: summary
    });
  }

  /**
   * 🤖 處理分類確認（是/否）
   */
  private async handleCategoryConfirmation(
    lineUserId: string,
    userId: string,
    text: string,
    context: any
  ): Promise<void> {
    const response = text.trim();

    // 用戶確認「是」
    if (/^(是|yes|y|對|ok|確定)$/i.test(response)) {
      const { amount, keyword, category, subcategory, note } = context;

      // 學習關鍵字
      if (keyword) {
        await learnKeyword(userId, keyword, category, subcategory);
      }

      // 創建交易
      const result = {
        amount,
        category,
        subcategory,
        note,
        confidence: 'high' as const,
        needConfirmation: false
      };

      await this.createSmartExpense(lineUserId, userId, result);
      await clearConvState(lineUserId);
      return;
    }

    // 用戶拒絕「否」
    if (/^(否|no|n|不對|錯|不是)$/i.test(response)) {
      const { amount, keyword } = context;

      // 讓用戶重新選擇分類
      await setConvState(lineUserId, 'WAITING_CATEGORY_SELECTION', {
        amount,
        keyword
      });

      const message = generateCategorySelectionMessage(amount, keyword);
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: message
      });
      return;
    }

    // 無效回應
    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: '請回覆「是」或「否」'
    });
  }

  /**
   * 🤖 處理分類選擇（數字 1-8）
   */
  private async handleSmartCategorySelection(
    lineUserId: string,
    userId: string,
    text: string,
    context: any
  ): Promise<void> {
    const num = parseInt(text.trim());
    const category = numberToCategory(num);

    if (!category) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '請輸入數字 1-8 選擇分類'
      });
      return;
    }

    const { amount, keyword } = context;

    // 學習關鍵字
    if (keyword) {
      await learnKeyword(userId, keyword, category);
    }

    // 創建交易
    const result = {
      amount,
      category,
      note: keyword,
      confidence: 'high' as const,
      needConfirmation: false
    };

    await this.createSmartExpense(lineUserId, userId, result);
    await clearConvState(lineUserId);
  }

  /**
   * 🤖 創建智能記帳交易
   */
  private async createSmartExpense(
    lineUserId: string,
    userId: string,
    result: { amount: number; category: string; subcategory?: string; note?: string; type?: 'income' | 'expense' },
    sendMessage: boolean = true
  ): Promise<void> {
    const accountId = await this.getOrCreateDefaultCashAccount(userId);
    const fullNote = result.note || '';
    const transactionType = result.type || 'expense';

    // 自動推斷餐別
    const resolvedSubcategory = result.subcategory ??
      (result.category === '飲食' ? getMealSubcategoryByTime() : undefined);

    await createTransaction(
      userId, transactionType, result.amount, result.category,
      fullNote, accountId, undefined, undefined, undefined, resolvedSubcategory
    );

    if (!sendMessage) return;

    await this.sendSuccessCard(lineUserId, userId, result.category, result.amount, fullNote, resolvedSubcategory, transactionType);
  }

  /**
   * 發送記帳成功卡片（統一入口）
   */
  private async sendSuccessCard(
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

    await this.client.pushMessage(lineUserId, card);
    this.checkBudgetAlert(lineUserId, userId, category, monthlyExpense).catch(console.error);
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
