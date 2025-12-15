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
  createAccount
} from '../services/databaseService.js';
import { getStockQuote } from '../services/stockService.js';
import { calculateKelly, calculateMartingale, calculateReturn } from '../services/strategyService.js';
import { predictExpenseCategory, predictIncomeCategory } from '../services/categoryPredictionService.js';
import { getExchangeRate } from '../services/exchangeRateService.js';
import {
  createStockQuoteCard,
  createExpenseCategoryQuickReply,
  createIncomeCategoryQuickReply,
  createPortfolioSummaryCard,
  createTransactionSuccessCard
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
    // 🤖 智能記帳：先檢查是否為「記」開頭的指令
    if (text.trim().startsWith('記')) {
      await this.handleSmartExpense(lineUserId, userId, text.trim());
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
        // 直接輸入分類（支持備註）
        await this.handleExpenseCategory(lineUserId, userId, intent.category, intent.amount, intent.note);
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

      default:
        await this.client.pushMessage(lineUserId, {
          type: 'text',
          text: '💡 試試這些指令：\n\n' +
            '📝 記帳：「記帳」「午餐 120」「薪水 50000」\n' +
            '📊 投資：「TSLA」「買 2330」\n' +
            '📈 查詢：「帳戶」「資產」「持倉」\n\n' +
            '輸入「說明」查看完整指南'
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
  private async handleBuyAction(lineUserId: string, userId: string, symbol: string): Promise<void> {
    const quote = await getStockQuote(symbol);

    if (!quote) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `無法查詢 ${symbol} 的行情。`
      });
      return;
    }

    // 取得用戶帳戶
    const accounts = await getUserAccounts(userId);
    
    if (accounts.length === 0) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '您還沒有任何帳戶，請先在網站設定帳戶。'
      });
      return;
    }

    // 判斷股票幣別
    const stockCurrency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'TWD' : 'USD';
    
    // 過濾可用帳戶
    const availableAccounts = accounts.filter((acc: any) => {
      // 台股：只允許 TWD 證券戶
      if (stockCurrency === 'TWD') {
        return acc.currency === 'TWD' && acc.type === 'BROKERAGE';
      }
      // 美股：允許 USD 或 TWD (複委託)
      if (stockCurrency === 'USD') {
        return acc.type === 'BROKERAGE';
      }
      return false;
    });

    if (availableAccounts.length === 0) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: stockCurrency === 'TWD' 
          ? '您沒有台股證券帳戶，請先在網站新增。'
          : '您沒有證券帳戶，請先在網站新增。'
      });
      return;
    }

    // 如果只有一個帳戶，直接使用
    if (availableAccounts.length === 1) {
      const account = availableAccounts[0];
      await updateConversationState(lineUserId, 'WAITING_BUY_QUANTITY', {
        symbol,
        price: quote.price,
        name: quote.name,
        accountId: account.id,
        accountName: account.name,
        accountCurrency: account.currency,
        stockCurrency
      });

      const needsExchange = account.currency !== stockCurrency;
      const exchangeRate = needsExchange ? await getExchangeRate('USD', 'TWD') : 1;

      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `請輸入要買入的股數\n` +
          `股票：${symbol} @ $${quote.price}\n` +
          `帳戶：${account.name} (${account.currency})\n` +
          `餘額：${account.currency === 'TWD' ? 'NT$' : '$'}${account.balance.toLocaleString()}\n` +
          (needsExchange ? `\n⚠️ 將以複委託方式下單\n匯率：1 USD ≈ ${exchangeRate} TWD\n` : '') +
          `\n例如: 10`
      });
    } else {
      // 多個帳戶，讓用戶選擇
      await updateConversationState(lineUserId, 'WAITING_ACCOUNT_SELECT', {
        symbol,
        price: quote.price,
        name: quote.name,
        stockCurrency,
        availableAccounts: availableAccounts.map((a: any) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          balance: a.balance,
          isSub: a.isSub
        }))
      });

      // 發送帳戶選擇 Quick Reply
      const buttons = availableAccounts.map((acc: any, idx: number) => ({
        type: 'action' as const,
        action: {
          type: 'message' as const,
          label: `${acc.name} (${acc.currency === 'TWD' ? 'NT$' : '$'}${acc.balance.toLocaleString()})`,
          text: `選擇帳戶 ${idx + 1}`
        }
      }));

      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `請選擇扣款帳戶：`,
        quickReply: {
          items: buttons.slice(0, 13) // LINE 限制最多 13 個按鈕
        }
      });
    }
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

    const { symbol, price, name, accountId, accountCurrency, stockCurrency } = context;
    const account = await getAccount(accountId);

    if (!account) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '帳戶不存在，請重新操作。'
      });
      await clearConversationState(lineUserId);
      return;
    }

    // 計算成本（考慮匯率）
    const needsExchange = accountCurrency !== stockCurrency;
    const exchangeRate = needsExchange ? await getExchangeRate('USD', 'TWD') : 1;
    const baseCost = price * quantity;
    const totalCost = needsExchange ? baseCost * exchangeRate : baseCost;

    // 檢查餘額
    if (account.balance < totalCost) {
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `⚠️ 餘額不足\n\n` +
          `需要：${accountCurrency === 'TWD' ? 'NT$' : '$'}${totalCost.toLocaleString()}\n` +
          `可用：${accountCurrency === 'TWD' ? 'NT$' : '$'}${account.balance.toLocaleString()}\n` +
          `不足：${accountCurrency === 'TWD' ? 'NT$' : '$'}${(totalCost - account.balance).toLocaleString()}\n\n` +
          `💡 請先入金或減少買入數量`
      });
      await clearConversationState(lineUserId);
      return;
    }

    try {
      // 1. 更新帳戶餘額
      await updateAccountBalance(accountId, totalCost, 'subtract');

      // 2. 新增持股
      await upsertAsset(userId, symbol, name, 'Stock', quantity, price);

      // 3. 記錄交易
      await createTransaction(
        userId,
        'expense',
        totalCost,
        'investment',
        `買入 ${symbol} ${quantity}股 @ ${stockCurrency === 'TWD' ? 'NT$' : '$'}${price}`,
        accountId
      );

      // 清除狀態
      await clearConversationState(lineUserId);

      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `✅ 買入成功！\n\n` +
          `${symbol} x ${quantity} 股\n` +
          `單價: ${stockCurrency === 'TWD' ? 'NT$' : '$'}${price}\n` +
          (needsExchange ? `原始成本: $${baseCost.toFixed(2)}\n` : '') +
          `扣款: ${accountCurrency === 'TWD' ? 'NT$' : '$'}${totalCost.toLocaleString()}\n` +
          (needsExchange ? `(匯率 1:${exchangeRate})\n` : '') +
          `\n帳戶餘額: ${accountCurrency === 'TWD' ? 'NT$' : '$'}${(account.balance - totalCost).toLocaleString()}`
      });
    } catch (error) {
      console.error('Buy stock error:', error);
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '買入失敗，請稍後再試。'
      });
      await clearConversationState(lineUserId);
    }
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

    try {
      // 判斷股票幣別
      const stockCurrency = symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'TWD' : 'USD';

      // 取得用戶帳戶，找到對應幣別的證券帳戶
      const accounts = await getUserAccounts(userId);
      const targetAccount = accounts.find((acc: any) =>
        acc.type === 'BROKERAGE' &&
        acc.currency === stockCurrency &&
        acc.isDefault
      ) || accounts.find((acc: any) =>
        acc.type === 'BROKERAGE' &&
        acc.currency === stockCurrency
      );

      if (!targetAccount) {
        // 如果沒有對應帳戶，仍然允許賣出，但不更新餘額
        console.warn(`⚠️ 用戶 ${userId} 賣出 ${symbol}，但沒有對應的 ${stockCurrency} 證券帳戶`);
      }

      // 計算賣出收入
      const saleRevenue = price * quantity;

      // 1. 減少持倉
      await reduceAsset(userId, symbol, quantity);

      // 2. 如果有目標帳戶，將賣出收入放回帳戶
      if (targetAccount) {
        await updateAccountBalance(targetAccount.id, saleRevenue, 'add');
      }

      // 3. 記錄交易
      await createTransaction(
        userId,
        'income',
        saleRevenue,
        'investment',
        `賣出 ${symbol} ${quantity}股 @ ${stockCurrency === 'TWD' ? 'NT$' : '$'}${price}`,
        targetAccount?.id
      );

      // 計算獲利
      const profit = (price - avgPrice) * quantity;
      const profitPercent = ((price - avgPrice) / avgPrice) * 100;

      await clearConversationState(lineUserId);

      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: `✅ 賣出成功！\n\n` +
          `${symbol} x ${quantity} 股\n` +
          `賣出價: ${stockCurrency === 'TWD' ? 'NT$' : '$'}${price}\n` +
          `平均成本: ${stockCurrency === 'TWD' ? 'NT$' : '$'}${avgPrice}\n` +
          `賣出收入: ${stockCurrency === 'TWD' ? 'NT$' : '$'}${saleRevenue.toLocaleString()}\n\n` +
          `${profit >= 0 ? '📈 獲利' : '📉 虧損'}: ${stockCurrency === 'TWD' ? 'NT$' : '$'}${Math.abs(profit).toFixed(2)} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)` +
          (targetAccount ? `\n\n💰 已入帳至：${targetAccount.name}` : '')
      });
    } catch (error) {
      console.error('Sell stock error:', error);
      await this.client.pushMessage(lineUserId, {
        type: 'text',
        text: '賣出失敗，請稍後再試。'
      });
      await clearConversationState(lineUserId);
    }
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
    note?: string
  ): Promise<void> {
    // 取得預設現金帳戶
    const accountId = await this.getOrCreateDefaultCashAccount(userId);

    // 創建交易（帶備註和帳戶）
    await createTransaction(userId, 'expense', amount, category, note, accountId);
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
      .slice(1, 3) // 跳過第一筆（剛剛創建的），取接下來2筆
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
      type: 'expense',
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
    // 取得預設現金帳戶
    const accountId = await this.getOrCreateDefaultCashAccount(userId);

    // 組合完整備註
    let fullNote = result.note || '';
    if (result.subcategory && result.subcategory !== result.note) {
      fullNote = result.subcategory + (fullNote ? ` - ${fullNote}` : '');
    }

    // 判斷交易類型（預設為支出）
    const transactionType = result.type || 'expense';

    // 創建交易
    await createTransaction(
      userId,
      transactionType,
      result.amount,
      result.category,
      fullNote,
      accountId
    );

    if (!sendMessage) return;

    // 發送成功訊息
    const icon = transactionType === 'income' ? '💵' : '💰';
    const typeText = transactionType === 'income' ? '收入' : '支出';
    await this.client.pushMessage(lineUserId, {
      type: 'text',
      text: `✅ 已記帳 (${typeText})\n${icon} 金額: $${result.amount}\n📁 分類: ${result.category}${result.subcategory ? ` > ${result.subcategory}` : ''}${fullNote ? `\n📝 備註: ${fullNote}` : ''}`
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
