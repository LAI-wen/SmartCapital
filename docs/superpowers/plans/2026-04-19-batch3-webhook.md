# Batch 3: Split webhookController.ts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `server/src/controllers/webhookController.ts` from 1468 lines to ~250 lines by extracting method groups into domain-specific handler modules.

**Architecture:** Extract private class methods into standalone async functions (accepting `client: Client` as first param) grouped by domain. The `WebhookController` class keeps its public interface unchanged — constructor + `handleEvent` — and becomes a thin orchestrator that delegates to the extracted functions. `index.ts` import path stays the same.

**Tech Stack:** TypeScript, `@line/bot-sdk` Client

---

### File Structure

```
server/src/controllers/webhook/
  transactionHandlers.ts   ← expense/income recording, smart expense, budget, batch
  assetHandlers.ts         ← stock query, buy/sell actions, portfolio, total assets
  accountHandlers.ts       ← account list, create account, account selection, default cash account
  utilHandlers.ts          ← ledger link, website link, send success card, replyText

server/src/controllers/webhookController.ts  ← class skeleton only (~250 lines)
```

---

### Task 1: Create `webhook/` directory and `utilHandlers.ts`

**Files:**
- Create: `server/src/controllers/webhook/utilHandlers.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Client } from '@line/bot-sdk';
import { getUserAccounts, createTransaction, getUserTransactions, getUserAssets, clearConversationState } from '../../services/databaseService.js';
import { getStockQuote } from '../../services/stockService.js';
import { createTransactionSuccessCard } from '../../utils/flexMessages.js';

export async function replyText(client: Client, replyToken: string, text: string): Promise<void> {
  await client.replyMessage(replyToken, { type: 'text', text });
}

export async function handleLedgerLink(client: Client, lineUserId: string): Promise<void> {
  const liffUrl = process.env.LIFF_URL || 'https://miniwallet.vercel.app';
  await client.pushMessage(lineUserId, {
    type: 'text',
    text: `📒 記帳本連結：\n${liffUrl}\n\n點擊即可開啟完整記帳介面`
  });
}

export async function handleWebsiteLink(client: Client, lineUserId: string): Promise<void> {
  const websiteUrl = process.env.WEBSITE_URL || process.env.LIFF_URL || 'https://miniwallet.vercel.app';
  await client.pushMessage(lineUserId, {
    type: 'text',
    text: `🌐 網站連結：\n${websiteUrl}`
  });
}

export async function sendSuccessCard(
  client: Client,
  lineUserId: string,
  userId: string,
  category: string,
  amount: number,
  note: string,
  subcategory: string | undefined,
  type: 'expense' | 'income'
): Promise<void> {
  const accounts = await getUserAccounts(userId);
  const assets = await getUserAssets(userId);
  const allTx = await getUserTransactions(userId, 500);

  const now = new Date();
  const taiwanOffset = 8 * 60 * 60 * 1000;
  const taiwanNow = new Date(now.getTime() + taiwanOffset);
  const startOfMonth = new Date(Date.UTC(taiwanNow.getUTCFullYear(), taiwanNow.getUTCMonth(), 1) - taiwanOffset);

  const monthExpenses = allTx.filter(tx => tx.type === 'expense' && new Date(tx.date) >= startOfMonth);
  const totalMonthlyExpense = monthExpenses.reduce((sum, tx) => sum + tx.amount, 0);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalAssetValue = assets.reduce((sum, a) => sum + a.quantity * a.avgPrice, 0);

  const quotes = await Promise.allSettled(
    assets.slice(0, 3).map(a => getStockQuote(a.symbol))
  );
  const totalCurrentValue = assets.reduce((sum, a, i) => {
    const result = quotes[i];
    const price = result.status === 'fulfilled' && result.value ? result.value.price : a.avgPrice;
    return sum + price * a.quantity;
  }, 0);

  const card = createTransactionSuccessCard({
    type,
    category,
    subcategory,
    amount,
    note,
    totalMonthlyExpense,
    totalBalance,
    totalAssetValue: totalCurrentValue || totalAssetValue,
  });

  await client.pushMessage(lineUserId, card);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors on the new file

---

### Task 2: Create `webhook/accountHandlers.ts`

**Files:**
- Create: `server/src/controllers/webhook/accountHandlers.ts`

- [ ] **Step 1: Create the file**

Copy these methods from `webhookController.ts` into standalone functions. Each method that used `this.client` now takes `client: Client` as first param. Each that used `this.getOrCreateDefaultCashAccount` calls the local export directly.

```typescript
import { Client } from '@line/bot-sdk';
import {
  getUserAccounts,
  createAccount,
  updateConversationState,
  clearConversationState,
} from '../../services/databaseService.js';
import { createTransaction } from '../../services/databaseService.js';

export async function getOrCreateDefaultCashAccount(userId: string): Promise<string> {
  const accounts = await getUserAccounts(userId);
  let defaultCash = accounts.find(acc => acc.type === 'CASH' && acc.isDefault);
  if (!defaultCash) defaultCash = accounts.find(acc => acc.type === 'CASH');
  if (!defaultCash) defaultCash = await createAccount(userId, '現金', 'CASH', 'TWD', 0, true, false);
  return defaultCash.id;
}

export async function handleAccountList(client: Client, lineUserId: string, userId: string): Promise<void> {
  const accounts = await getUserAccounts(userId);
  if (accounts.length === 0) {
    await client.pushMessage(lineUserId, { type: 'text', text: '你還沒有任何帳戶。\n\n輸入「新增帳戶」來建立第一個帳戶！' });
    return;
  }
  const lines = accounts.map(acc =>
    `${acc.isDefault ? '⭐ ' : ''}${acc.name}（${acc.type}）\n餘額：$${acc.balance.toLocaleString()} ${acc.currency}`
  );
  await client.pushMessage(lineUserId, {
    type: 'text',
    text: `📋 你的帳戶列表：\n\n${lines.join('\n\n')}`
  });
}

export async function handleCreateAccount(client: Client, lineUserId: string, userId: string): Promise<void> {
  await client.pushMessage(lineUserId, {
    type: 'text',
    text: '請使用網頁介面新增帳戶：\n\n設定 → 帳戶管理 → 新增帳戶'
  });
}

export async function handleAccountSelection(
  client: Client,
  lineUserId: string,
  userId: string,
  text: string,
  context: Record<string, unknown>
): Promise<void> {
  const accounts = await getUserAccounts(userId);
  const selectedAccount = accounts.find(acc => acc.name === text.trim());

  if (!selectedAccount) {
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: `找不到帳戶「${text}」，請重新選擇或輸入「取消」`
    });
    return;
  }

  const { pendingType, pendingAmount, pendingCategory, pendingNote } = context as {
    pendingType: 'expense' | 'income';
    pendingAmount: number;
    pendingCategory: string;
    pendingNote?: string;
  };

  await createTransaction(userId, pendingType, pendingAmount, pendingCategory, pendingNote, selectedAccount.id);
  await clearConversationState(lineUserId);
  await client.pushMessage(lineUserId, {
    type: 'text',
    text: `✅ 已記錄到「${selectedAccount.name}」\n${pendingCategory} $${pendingAmount.toLocaleString()}`
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

---

### Task 3: Create `webhook/assetHandlers.ts`

**Files:**
- Create: `server/src/controllers/webhook/assetHandlers.ts`

- [ ] **Step 1: Copy asset-related methods**

Extract these methods from `webhookController.ts`, converting `this.client` → `client: Client` and `this.getOrCreateDefaultCashAccount` → imported from `accountHandlers.ts`:

Methods to extract: `handleStockQuery` (line 315), `handleBuyAction` (line 513), `executeBuy` (line 536), `handleBuyQuantityInput` (line 555), `handleSellAction` (line 565), `executeSell` (line 593), `handleSellQuantityInput` (line 618), `handlePortfolioQuery` (line 954), `handleTotalAssets` (line 1075).

```typescript
import { Client } from '@line/bot-sdk';
import {
  getUserAssets, upsertAsset, reduceAsset, getAsset,
  getUserAccounts, updateConversationState, clearConversationState,
} from '../../services/databaseService.js';
import { getStockQuote } from '../../services/stockService.js';
import { calculateKelly } from '../../services/strategyService.js';
import {
  createStockQuoteCard, createPortfolioSummaryCard,
} from '../../utils/flexMessages.js';
import { getOrCreateDefaultCashAccount } from './accountHandlers.js';
import { sendSuccessCard } from './utilHandlers.js';

// Copy the full body of each method here, replacing `this.client` with `client`,
// `this.sendSuccessCard(...)` with `sendSuccessCard(client, ...)`,
// `this.getOrCreateDefaultCashAccount(...)` with `getOrCreateDefaultCashAccount(...)`,
// `this.executeBuy(...)` with `executeBuy(client, ...)`,
// `this.executeSell(...)` with `executeSell(client, ...)`
```

- [ ] **Step 2: Copy each method body verbatim from `webhookController.ts`**

For each of the 9 methods, copy the body exactly from `webhookController.ts` (lines 315–629), prepend `export async function <name>(client: Client, ...)`, and substitute:
- `this.client.pushMessage(...)` → `client.pushMessage(...)`
- `this.client.replyMessage(...)` → `client.replyMessage(...)`
- `this.sendSuccessCard(...)` → `await sendSuccessCard(client, ...)`
- `this.getOrCreateDefaultCashAccount(...)` → `await getOrCreateDefaultCashAccount(...)`
- `this.executeBuy(...)` → `await executeBuy(client, ...)`
- `this.executeSell(...)` → `await executeSell(client, ...)`

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

---

### Task 4: Create `webhook/transactionHandlers.ts`

**Files:**
- Create: `server/src/controllers/webhook/transactionHandlers.ts`

- [ ] **Step 1: Copy transaction-related methods**

Methods to extract: `handleExpenseCategory` (653), `checkBudgetAlert` (675), `handleIncomeCategory` (728), `handleExpenseQuery` (794), `handleSetBudget` (889), `handleBudgetQuery` (900), `handleSmartExpense` (1197), `handleBatchExpense` (1246), `handleCategoryConfirmation` (1283), `handleSmartCategorySelection` (1343), `createSmartExpense` (1383).

```typescript
import { Client } from '@line/bot-sdk';
import {
  createTransaction, getUserTransactions, getUserBudgets, upsertBudget,
  clearConversationState, updateConversationState,
} from '../../services/databaseService.js';
import { predictExpenseCategory, predictIncomeCategory } from '../../services/categoryPredictionService.js';
import {
  createExpenseCategoryQuickReply, createIncomeCategoryQuickReply,
} from '../../utils/flexMessages.js';
import {
  parseExpenseCommand, parseBatchExpenseCommands, learnKeyword,
} from '../../services/expenseParserService.js';
import {
  setConversationState as setConvState,
  clearConversationState as clearConvState,
  generateCategoryConfirmationMessage,
  generateCategorySelectionMessage,
  numberToCategory,
} from '../../services/conversationService.js';
import { getOrCreateDefaultCashAccount } from './accountHandlers.js';
import { sendSuccessCard } from './utilHandlers.js';

function getMealSubcategoryByTime(): string {
  const taiwanHour = (new Date().getUTCHours() + 8) % 24;
  if (taiwanHour >= 6 && taiwanHour < 10) return '早餐';
  if (taiwanHour >= 10 && taiwanHour < 14) return '午餐';
  if (taiwanHour >= 14 && taiwanHour < 17) return '下午茶';
  if (taiwanHour >= 17 && taiwanHour < 21) return '晚餐';
  return '宵夜';
}

// Then copy each method body from webhookController.ts, with same substitution pattern as Task 3
```

- [ ] **Step 2: Copy each method body verbatim**

For each of the 11 methods, copy the body exactly from `webhookController.ts` and apply the same `this.client` → `client`, `this.sendSuccessCard` → `sendSuccessCard(client, ...)`, `this.getOrCreateDefaultCashAccount` → `getOrCreateDefaultCashAccount(...)` substitutions.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

---

### Task 5: Rewrite `webhookController.ts` as thin orchestrator

**Files:**
- Modify: `server/src/controllers/webhookController.ts`

- [ ] **Step 1: Replace file contents**

The new `webhookController.ts` keeps the class, imports from the extracted modules, and delegates:

```typescript
import { Client, WebhookEvent, TextMessage, MessageEvent } from '@line/bot-sdk';
import {
  getOrCreateUser, getUserSettings,
  getConversationState, updateConversationState, clearConversationState,
} from '../services/databaseService.js';
import { parseMessage, getHelpCard } from '../utils/messageParser.js';
import {
  createExpenseCategoryQuickReply, createIncomeCategoryQuickReply, createWelcomeCard,
} from '../utils/flexMessages.js';
import { predictExpenseCategory, predictIncomeCategory } from '../services/categoryPredictionService.js';
import {
  handleExpenseCategory, handleIncomeCategory, handleExpenseQuery,
  handleSetBudget, handleBudgetQuery, handleSmartExpense, handleBatchExpense,
  handleCategoryConfirmation, handleSmartCategorySelection,
} from './webhook/transactionHandlers.js';
import {
  handleStockQuery, handleBuyAction, handleBuyQuantityInput,
  handleSellAction, handleSellQuantityInput, handlePortfolioQuery, handleTotalAssets,
} from './webhook/assetHandlers.js';
import {
  handleAccountList, handleCreateAccount, handleAccountSelection,
} from './webhook/accountHandlers.js';
import { handleLedgerLink, handleWebsiteLink, replyText } from './webhook/utilHandlers.js';

export class WebhookController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async handleEvent(event: WebhookEvent): Promise<void> {
    // follow event → welcome card
    if (event.type === 'follow') {
      const userId = event.source.userId;
      if (!userId) return;
      try {
        const profile = await this.client.getProfile(userId);
        await getOrCreateUser(userId, profile.displayName);
        await this.client.pushMessage(userId, createWelcomeCard(profile.displayName));
      } catch (error) {
        console.error('handleEvent follow error:', error);
      }
      return;
    }

    if (event.type !== 'message') return;
    const messageEvent = event as MessageEvent;
    if (messageEvent.message.type !== 'text') return;

    const text = (messageEvent.message as TextMessage).text;
    const lineUserId = messageEvent.source.userId;
    if (!lineUserId) return;

    const dbUser = await getOrCreateUser(lineUserId);
    const convState = await getConversationState(lineUserId);

    if (convState && convState.state !== 'IDLE') {
      await this.handleStateBasedMessage(lineUserId, dbUser.id, text, convState);
    } else {
      await this.handleNormalMessage(lineUserId, dbUser.id, text);
    }
  }

  private async handleNormalMessage(lineUserId: string, userId: string, text: string): Promise<void> {
    const trimmed = text.trim();
    if (trimmed.startsWith('記') || /^[+\-]?\d+/.test(trimmed)) {
      await handleSmartExpense(this.client, lineUserId, userId, trimmed);
      return;
    }

    const intent = parseMessage(text);

    switch (intent.type) {
      case 'EXPENSE':
        try {
          const predicted = await predictExpenseCategory(userId, intent.amount);
          await this.client.pushMessage(lineUserId, createExpenseCategoryQuickReply(intent.amount, predicted));
        } catch {
          await this.client.pushMessage(lineUserId, createExpenseCategoryQuickReply(intent.amount));
        }
        await updateConversationState(lineUserId, 'WAITING_EXPENSE_CATEGORY', { amount: intent.amount, note: intent.note });
        break;

      case 'INCOME':
        try {
          const predicted = await predictIncomeCategory(userId, intent.amount);
          await this.client.pushMessage(lineUserId, createIncomeCategoryQuickReply(intent.amount, predicted));
        } catch {
          await this.client.pushMessage(lineUserId, createIncomeCategoryQuickReply(intent.amount));
        }
        await updateConversationState(lineUserId, 'WAITING_INCOME_CATEGORY', { amount: intent.amount, note: intent.note });
        break;

      case 'STOCK_QUERY':   await handleStockQuery(this.client, lineUserId, userId, intent.symbol, intent.showKelly); break;
      case 'BUY_ACTION':    await handleBuyAction(this.client, lineUserId, userId, intent.symbol, intent.quantity); break;
      case 'SELL_ACTION':   await handleSellAction(this.client, lineUserId, userId, intent.symbol, intent.quantity); break;
      case 'EXPENSE_CATEGORY': await handleExpenseCategory(this.client, lineUserId, userId, intent.category, intent.amount, intent.note, intent.subcategory); break;
      case 'INCOME_CATEGORY':  await handleIncomeCategory(this.client, lineUserId, userId, intent.category, intent.amount, intent.note); break;
      case 'HELP':          await this.client.pushMessage(lineUserId, getHelpCard()); break;
      case 'PORTFOLIO':     await handlePortfolioQuery(this.client, lineUserId, userId); break;
      case 'WEBSITE':       await handleWebsiteLink(this.client, lineUserId); break;
      case 'ACCOUNT_LIST':  await handleAccountList(this.client, lineUserId, userId); break;
      case 'CREATE_ACCOUNT':await handleCreateAccount(this.client, lineUserId, userId); break;
      case 'TOTAL_ASSETS':  await handleTotalAssets(this.client, lineUserId, userId); break;
      case 'LEDGER':        await handleLedgerLink(this.client, lineUserId); break;
      case 'EXPENSE_QUERY': await handleExpenseQuery(this.client, lineUserId, userId, intent.period, intent.category); break;
      case 'BUDGET_QUERY':  await handleBudgetQuery(this.client, lineUserId, userId); break;
      case 'SET_BUDGET':    await handleSetBudget(this.client, lineUserId, userId, intent.category, intent.amount); break;
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

  private async handleStateBasedMessage(
    lineUserId: string,
    userId: string,
    text: string,
    convState: { state: string; context: Record<string, unknown> }
  ): Promise<void> {
    if (/^(取消|cancel|exit)$/i.test(text.trim())) {
      await clearConversationState(lineUserId);
      await replyText(this.client, convState.context['replyToken'] as string ?? '', '已取消操作');
      return;
    }

    switch (convState.state) {
      case 'WAITING_EXPENSE_CATEGORY':   await handleExpenseCategorySelection(this.client, lineUserId, userId, text, convState.context); break;
      case 'WAITING_INCOME_CATEGORY':    await handleIncomeCategorySelection(this.client, lineUserId, userId, text, convState.context); break;
      case 'WAITING_ACCOUNT_SELECT':     await handleAccountSelection(this.client, lineUserId, userId, text, convState.context); break;
      case 'WAITING_BUY_QUANTITY':       await handleBuyQuantityInput(this.client, lineUserId, userId, text, convState.context); break;
      case 'WAITING_SELL_QUANTITY':      await handleSellQuantityInput(this.client, lineUserId, userId, text, convState.context); break;
      case 'WAITING_CATEGORY_CONFIRMATION': await handleCategoryConfirmation(this.client, lineUserId, userId, text, convState.context); break;
      case 'WAITING_CATEGORY_SELECTION': await handleSmartCategorySelection(this.client, lineUserId, userId, text, convState.context); break;
    }
  }
}
```

Note: `handleExpenseCategorySelection` and `handleIncomeCategorySelection` (lines 352–456) should also be moved to `transactionHandlers.ts` before this step.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run tests**

```bash
cd server && npm run test:run
```
Expected: 114 tests pass

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/
git commit -m "refactor: split webhookController into domain handler modules"
```
