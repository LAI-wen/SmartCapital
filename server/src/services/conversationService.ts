/**
 * 對話狀態管理服務
 * 處理 LINE Bot 的多輪對話
 */

import { prisma } from './databaseService.js';

export type ConversationState =
  | 'IDLE'
  | 'WAITING_CATEGORY_CONFIRMATION'
  | 'WAITING_CATEGORY_SELECTION';

export interface ConversationContext {
  amount?: number;
  keyword?: string;
  category?: string;
  subcategory?: string;
  note?: string;
  pendingTransactions?: Array<{
    amount: number;
    keyword: string;
  }>;
}

/**
 * 取得用戶對話狀態
 */
export async function getConversationState(lineUserId: string): Promise<{
  state: ConversationState;
  context: ConversationContext;
}> {
  const conversation = await prisma.conversationState.findUnique({
    where: { lineUserId }
  });

  if (!conversation) {
    return {
      state: 'IDLE',
      context: {}
    };
  }

  return {
    state: conversation.state as ConversationState,
    context: conversation.context ? JSON.parse(conversation.context) : {}
  };
}

/**
 * 更新用戶對話狀態
 */
export async function setConversationState(
  lineUserId: string,
  state: ConversationState,
  context: ConversationContext = {}
): Promise<void> {
  await prisma.conversationState.upsert({
    where: { lineUserId },
    update: {
      state,
      context: JSON.stringify(context)
    },
    create: {
      lineUserId,
      state,
      context: JSON.stringify(context)
    }
  });
}

/**
 * 清除用戶對話狀態（回到 IDLE）
 */
export async function clearConversationState(lineUserId: string): Promise<void> {
  await setConversationState(lineUserId, 'IDLE', {});
}

/**
 * 生成分類確認訊息
 */
export function generateCategoryConfirmationMessage(
  amount: number,
  keyword: string,
  suggestedCategory: string
): string {
  return `我識別到：
💰 金額: $${amount}
📝 關鍵字: ${keyword}
📁 建議分類: ${suggestedCategory}

這樣分類正確嗎？
✅ 回覆「是」確認
❌ 回覆「否」重新選擇分類`;
}

/**
 * 生成分類選擇訊息
 */
export function generateCategorySelectionMessage(
  amount: number,
  keyword: string
): string {
  return `請選擇「${keyword}」的分類：

1️⃣ 飲食
2️⃣ 交通
3️⃣ 居住
4️⃣ 娛樂
5️⃣ 購物
6️⃣ 醫療
7️⃣ 投資
8️⃣ 其他

請回覆數字 1-8`;
}

/**
 * 將數字轉換為分類
 */
export function numberToCategory(num: number): string | null {
  const categories = ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '投資', '其他'];
  if (num >= 1 && num <= 8) {
    return categories[num - 1];
  }
  return null;
}

/**
 * 生成批次記帳確認訊息
 */
export function generateBatchConfirmationMessage(
  results: Array<{
    amount: number;
    category: string;
    subcategory?: string;
    note?: string;
  }>
): string {
  let message = `📋 批次記帳確認：\n\n`;

  results.forEach((result, index) => {
    message += `${index + 1}. $${result.amount} - ${result.category}`;
    if (result.subcategory) {
      message += ` > ${result.subcategory}`;
    }
    if (result.note) {
      message += ` (${result.note})`;
    }
    message += '\n';
  });

  message += `\n共 ${results.length} 筆交易\n`;
  message += `✅ 回覆「確認」送出\n`;
  message += `❌ 回覆「取消」放棄`;

  return message;
}
