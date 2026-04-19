/**
 * Webhook Controller - LINE Bot 主要處理邏輯（薄層協調器）
 * 委派所有業務邏輯至 domain handler 模組
 */

import { Client, WebhookEvent, MessageEvent } from '@line/bot-sdk';
import {
  getOrCreateUser,
  getConversationState,
  clearConversationState,
  updateConversationState
} from '../services/databaseService.js';
import { predictExpenseCategory, predictIncomeCategory } from '../services/categoryPredictionService.js';
import {
  createExpenseCategoryQuickReply,
  createIncomeCategoryQuickReply,
  createWelcomeCard
} from '../utils/flexMessages.js';
import { parseMessage, getHelpCard } from '../utils/messageParser.js';

import { replyText, handleLedgerLink, handleWebsiteLink, sendSuccessCard } from './webhook/utilHandlers.js';
import { handleAccountList, handleCreateAccount, handleAccountSelection } from './webhook/accountHandlers.js';
import {
  handleStockQuery,
  handleBuyAction,
  executeBuy,
  handleBuyQuantityInput,
  handleSellAction,
  executeSell,
  handleSellQuantityInput,
  handlePortfolioQuery,
  handleTotalAssets
} from './webhook/assetHandlers.js';
import {
  handleExpenseCategorySelection,
  handleIncomeCategorySelection,
  handleExpenseCategory,
  handleIncomeCategory,
  handleExpenseQuery,
  handleSetBudget,
  handleBudgetQuery,
  handleSmartExpense,
  handleBatchExpense,
  handleCategoryConfirmation,
  handleSmartCategorySelection,
  createSmartExpense
} from './webhook/transactionHandlers.js';

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
      await replyText(this.client, event.replyToken, '抱歉，發生錯誤，請稍後再試。');
    }
  }

  /**
   * 處理一般訊息 (IDLE 狀態)
   */
  private async handleNormalMessage(lineUserId: string, userId: string, text: string): Promise<void> {
    // 🤖 智能記帳：檢查是否為記帳指令（數字開頭，可選「記」）
    const trimmed = text.trim();
    if (trimmed.startsWith('記') || /^[+\-]?\d+/.test(trimmed)) {
      await handleSmartExpense(this.client, lineUserId, userId, trimmed);
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
        await handleStockQuery(this.client, lineUserId, userId, intent.symbol, intent.showKelly);
        break;

      case 'BUY_ACTION':
        await handleBuyAction(this.client, lineUserId, userId, intent.symbol, intent.quantity);
        break;

      case 'SELL_ACTION':
        // 賣出操作
        await handleSellAction(this.client, lineUserId, userId, intent.symbol, intent.quantity);
        break;

      case 'EXPENSE_CATEGORY':
        await handleExpenseCategory(this.client, lineUserId, userId, intent.category, intent.amount, intent.note, intent.subcategory);
        break;

      case 'INCOME_CATEGORY':
        // 直接輸入分類（支持備註）
        await handleIncomeCategory(this.client, lineUserId, userId, intent.category, intent.amount, intent.note);
        break;

      case 'HELP':
        await this.client.pushMessage(lineUserId, getHelpCard());
        break;

      case 'PORTFOLIO':
        await handlePortfolioQuery(this.client, lineUserId, userId);
        break;

      case 'WEBSITE':
        await handleWebsiteLink(this.client, lineUserId);
        break;

      case 'ACCOUNT_LIST':
        await handleAccountList(this.client, lineUserId, userId);
        break;

      case 'CREATE_ACCOUNT':
        await handleCreateAccount(this.client, lineUserId, userId);
        break;

      case 'TOTAL_ASSETS':
        await handleTotalAssets(this.client, lineUserId, userId);
        break;

      case 'LEDGER':
        await handleLedgerLink(this.client, lineUserId);
        break;

      case 'EXPENSE_QUERY':
        await handleExpenseQuery(this.client, lineUserId, userId, intent.period, intent.category);
        break;

      case 'BUDGET_QUERY':
        await handleBudgetQuery(this.client, lineUserId, userId);
        break;

      case 'SET_BUDGET':
        await handleSetBudget(this.client, lineUserId, userId, intent.category, intent.amount);
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
        await handleExpenseCategorySelection(this.client, lineUserId, userId, text, context);
        break;

      case 'WAITING_INCOME_CATEGORY':
        await handleIncomeCategorySelection(this.client, lineUserId, userId, text, context);
        break;

      case 'WAITING_ACCOUNT_SELECT':
        await handleAccountSelection(this.client, lineUserId, userId, text, context);
        break;

      case 'WAITING_BUY_QUANTITY':
        await handleBuyQuantityInput(this.client, lineUserId, userId, text, context);
        break;

      case 'WAITING_SELL_QUANTITY':
        await handleSellQuantityInput(this.client, lineUserId, userId, text, context);
        break;

      // 🤖 智能記帳新增的狀態
      case 'WAITING_CATEGORY_CONFIRMATION':
        await handleCategoryConfirmation(this.client, lineUserId, userId, text, context);
        break;

      case 'WAITING_CATEGORY_SELECTION':
        await handleSmartCategorySelection(this.client, lineUserId, userId, text, context);
        break;

      default:
        // 回到一般處理
        await clearConversationState(lineUserId);
        await this.handleNormalMessage(lineUserId, userId, text);
    }
  }
}
