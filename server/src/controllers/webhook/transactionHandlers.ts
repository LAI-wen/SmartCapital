/**
 * Transaction handlers for webhook controller
 */

import { Client } from '@line/bot-sdk';
import {
  createTransaction,
  getUserTransactions,
  clearConversationState, // clears state in DB (databaseService)
  upsertBudget,
  getUserBudgets
} from '../../services/databaseService.js';
import { createTransactionSuccessCard } from '../../utils/flexMessages.js';
import {
  parseExpenseCommand,
  parseBatchExpenseCommands,
  learnKeyword
} from '../../services/expenseParserService.js';
import {
  setConversationState as setConvState,
  clearConversationState as clearConvState, // clears state via conversationService (different impl)
  generateCategoryConfirmationMessage,
  generateCategorySelectionMessage,
  numberToCategory
} from '../../services/conversationService.js';
import { getOrCreateDefaultCashAccount } from './accountHandlers.js';
import { sendSuccessCard } from './utilHandlers.js';

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

/**
 * 處理支出分類選擇（Quick Reply 回應）
 */
export async function handleExpenseCategorySelection(
  client: Client,
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
      await client.pushMessage(lineUserId, {
        type: 'text',
        text: '請從分類按鈕中選擇，或輸入「取消」'
      });
      return;
    }
  }

  // 呼叫已有的處理函數，傳入備註
  await handleExpenseCategory(client, lineUserId, userId, category, amount, note);
}

/**
 * 處理收入分類選擇（Quick Reply 回應）
 */
export async function handleIncomeCategorySelection(
  client: Client,
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
      await client.pushMessage(lineUserId, {
        type: 'text',
        text: '請從分類按鈕中選擇，或輸入「取消」'
      });
      return;
    }
  }

  // 呼叫已有的處理函數，傳入備註
  await handleIncomeCategory(client, lineUserId, userId, category, amount, note);
}

/**
 * 處理支出分類
 */
export async function handleExpenseCategory(
  client: Client,
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

  const accountId = await getOrCreateDefaultCashAccount(userId);
  await createTransaction(userId, 'expense', amount, category, note, accountId, undefined, undefined, undefined, resolvedSubcategory);
  await clearConversationState(lineUserId);
  await sendSuccessCard(client, lineUserId, userId, category, amount, note || '', resolvedSubcategory, 'expense');
}

/**
 * 處理收入分類
 */
export async function handleIncomeCategory(
  client: Client,
  lineUserId: string,
  userId: string,
  category: string,
  amount: number,
  note?: string
): Promise<void> {
  // 取得預設現金帳戶
  const accountId = await getOrCreateDefaultCashAccount(userId);

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

  await client.pushMessage(lineUserId, card);
}

/**
 * 處理費用查詢（今天/本週/本月花了多少）
 */
export async function handleExpenseQuery(
  client: Client,
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

  await client.pushMessage(lineUserId, { type: 'text', text: msg });
}

/**
 * 設定分類預算
 */
export async function handleSetBudget(client: Client, lineUserId: string, userId: string, category: string, amount: number): Promise<void> {
  await upsertBudget(userId, category, amount);
  await client.pushMessage(lineUserId, {
    type: 'text',
    text: `✅ 已設定${category}月預算：$${amount.toLocaleString()} 元\n\n輸入「預算」可查看所有預算狀況`
  });
}

/**
 * 查詢預算使用狀況
 */
export async function handleBudgetQuery(client: Client, lineUserId: string, userId: string): Promise<void> {
  const budgets = await getUserBudgets(userId);
  if (budgets.length === 0) {
    await client.pushMessage(lineUserId, {
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

  await client.pushMessage(lineUserId, { type: 'text', text: msg });
}

/**
 * 🤖 智能記帳主處理函數
 */
export async function handleSmartExpense(client: Client, lineUserId: string, userId: string, text: string): Promise<void> {
  // 檢查是否為批次記帳（包含換行）
  if (text.includes('\n')) {
    await handleBatchExpense(client, lineUserId, userId, text);
    return;
  }

  // 單筆記帳
  const result = await parseExpenseCommand(userId, text);

  if (!result) {
    await client.pushMessage(lineUserId, {
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

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: message
    });
    return;
  }

  // 直接記帳（信心度高）
  await createSmartExpense(client, lineUserId, userId, result);
}

/**
 * 🤖 批次記帳處理
 */
export async function handleBatchExpense(client: Client, lineUserId: string, userId: string, text: string): Promise<void> {
  const results = await parseBatchExpenseCommands(userId, text);

  if (results.length === 0) {
    await client.pushMessage(lineUserId, {
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
      await createSmartExpense(client, lineUserId, userId, result, false); // 不發送個別成功訊息
      successCount++;
      messages.push(`✅ $${result.amount} - ${result.category}${result.subcategory ? ` > ${result.subcategory}` : ''}`);
    } catch (error) {
      console.error('Batch expense error:', error);
      messages.push(`❌ $${result.amount} - 記帳失敗`);
    }
  }

  // 發送批次結果
  const summary = `📋 批次記帳完成\n\n${messages.join('\n')}\n\n成功：${successCount}/${results.length} 筆`;
  await client.pushMessage(lineUserId, {
    type: 'text',
    text: summary
  });
}

/**
 * 🤖 處理分類確認（是/否）
 */
export async function handleCategoryConfirmation(
  client: Client,
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

    await createSmartExpense(client, lineUserId, userId, result);
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
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: message
    });
    return;
  }

  // 無效回應
  await client.pushMessage(lineUserId, {
    type: 'text',
    text: '請回覆「是」或「否」'
  });
}

/**
 * 🤖 處理分類選擇（數字 1-8）
 */
export async function handleSmartCategorySelection(
  client: Client,
  lineUserId: string,
  userId: string,
  text: string,
  context: any
): Promise<void> {
  const num = parseInt(text.trim());
  const category = numberToCategory(num);

  if (!category) {
    await client.pushMessage(lineUserId, {
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

  await createSmartExpense(client, lineUserId, userId, result);
  await clearConvState(lineUserId);
}

/**
 * 🤖 創建智能記帳交易
 */
export async function createSmartExpense(
  client: Client,
  lineUserId: string,
  userId: string,
  result: { amount: number; category: string; subcategory?: string; note?: string; type?: 'income' | 'expense' },
  sendMessage: boolean = true
): Promise<void> {
  const accountId = await getOrCreateDefaultCashAccount(userId);
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

  await sendSuccessCard(client, lineUserId, userId, result.category, result.amount, fullNote, resolvedSubcategory, transactionType);
}
