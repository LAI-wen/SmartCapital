/**
 * 智能記帳解析器服務
 * 解析 LINE 指令並智能識別分類
 */

import { prisma } from './databaseService.js';
import { parseWithGemini, isGeminiEnabled } from './geminiParserService.js';

// 預設關鍵字映射（系統內建）
const DEFAULT_KEYWORDS = {
  // 飲食相關
  飲食: ['吃', '喝', '午餐', '晚餐', '早餐', '便當', '餐廳', '食物'],
  下午茶: ['下午茶', '咖啡', '茶', '甜點', '蛋糕', '星巴克', 'starbucks', '85度c', 'cama'],
  零食: ['零食', '餅乾', '糖果', '巧克力', '洋芋片', '點心'],
  宵夜: ['宵夜', '消夜', '夜市', '鹽酥雞'],
  飲料: ['飲料', '手搖', '珍奶', '奶茶', '果汁', '可樂'],

  // 交通相關
  交通: ['車', '油', '停車', '公車', '捷運', 'mrt', '高鐵', '台鐵', '火車'],
  計程車: ['uber', 'taxi', '計程車', '小黃'],

  // 居住相關
  居住: ['房租', '租金', '水費', '電費', '瓦斯', '網路費', '管理費'],

  // 娛樂相關
  娛樂: ['電影', '看片', '唱歌', 'ktv', '遊戲', '旅遊', '旅行'],

  // 購物相關
  購物: ['衣服', '鞋子', '買', '蝦皮', 'momo', 'pchome', '網購'],

  // 醫療相關
  醫療: ['藥', '看病', '醫院', '診所', '口罩', '藥局'],

  // 其他
  其他: ['其他', '雜費', '維修']
};

// 主分類
const MAIN_CATEGORIES = ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '投資', '其他'];

/**
 * 解析結果介面
 */
export interface ParseResult {
  amount: number;
  category: string;
  subcategory?: string;
  note?: string;
  type?: 'income' | 'expense'; // 交易類型
  confidence: 'high' | 'medium' | 'low'; // 識別信心度
  needConfirmation: boolean; // 是否需要用戶確認
}

/**
 * 解析單筆記帳指令
 *
 * 支援格式：
 * - 100 (可選：記 100)
 * - 100 交通 (可選：記 100 交通)
 * - 100午餐
 * - 100 下午茶
 * - 100 飲食 下午茶 星巴克
 */
export async function parseExpenseCommand(
  userId: string,
  command: string
): Promise<ParseResult | null> {
  // 移除可選的 "記" 關鍵字，提取內容
  const content = command.replace(/^記\s*/, '').trim();

  if (!content) return null;

  // 智能分割：支援「記100午餐」「記 100 午餐」「+ 100 午餐」「- 100 午餐」
  // 符號後允許空格，例如 "+ 770 電影票"
  const match = content.match(/^([+\-])?\s*(\d+(?:\.\d+)?)\s*(.*)$/);

  if (!match) return null;

  const sign = match[1] || '';
  const numStr = match[2];
  const remainingText = match[3].trim();

  const amount = parseFloat(numStr);
  if (isNaN(amount) || amount === 0) {
    return null;
  }

  // 判斷類型：+ 或純正數 → 收入（需明確 +），負數或 - → 支出，無符號 → 支出
  const isIncome = sign === '+';
  const absAmount = amount;

  // 如果只有金額，預設為飲食（支出）或其他（收入）
  if (!remainingText) {
    return {
      amount: absAmount,
      category: isIncome ? '其他' : '飲食',
      type: isIncome ? 'income' : 'expense',
      confidence: 'low',
      needConfirmation: false // 預設行為，不需確認
    };
  }

  // 取得剩餘部分（可能有空格分隔，也可能沒有）
  const keywords = remainingText.split(/\s+/);

  // 情況 1: 記 100 交通 (第一個關鍵字是主分類)
  if (MAIN_CATEGORIES.includes(keywords[0])) {
    const category = keywords[0];
    const subcategory = keywords[1] || undefined;
    const note = keywords.slice(2).join(' ') || subcategory;

    return {
      amount: absAmount,
      category,
      subcategory,
      note,
      type: isIncome ? 'income' : 'expense',
      confidence: 'high',
      needConfirmation: false
    };
  }

  // 情況 2: 智能識別關鍵字
  const recognized = await recognizeKeywords(userId, keywords);

  if (recognized) {
    return {
      amount: absAmount,
      category: recognized.category,
      subcategory: recognized.subcategory,
      note: recognized.note || keywords.join(' '),
      type: isIncome ? 'income' : 'expense',
      confidence: recognized.confidence,
      needConfirmation: recognized.confidence === 'low'
    };
  }

  // 嘗試 Gemini fallback
  if (isGeminiEnabled()) {
    const geminiResult = await parseWithGemini(remainingText, absAmount);
    if (geminiResult) {
      return {
        amount: absAmount,
        category: geminiResult.category,
        note: geminiResult.note,
        type: geminiResult.type,
        confidence: 'medium',
        needConfirmation: false
      };
    }
  }

  // 無法識別 — 較長的文字可能是商品名，預設購物；短的預設飲食
  const fallbackCategory = isIncome ? '其他' : (remainingText.length > 8 ? '購物' : '飲食');
  return {
    amount: absAmount,
    category: fallbackCategory,
    note: keywords.join(' '),
    type: isIncome ? 'income' : 'expense',
    confidence: 'low',
    needConfirmation: true
  };
}

/**
 * 識別關鍵字
 */
async function recognizeKeywords(
  userId: string,
  keywords: string[]
): Promise<{
  category: string;
  subcategory?: string;
  note?: string;
  confidence: 'high' | 'medium' | 'low';
} | null> {
  const keyword = keywords.join(' ').toLowerCase();

  // 1. 先查詢用戶自定義的關鍵字映射
  const userMapping = await prisma.keywordMapping.findFirst({
    where: {
      userId,
      keyword: {
        contains: keyword,
        mode: 'insensitive'
      }
    },
    orderBy: {
      usageCount: 'desc' // 優先使用次數多的
    }
  });

  if (userMapping) {
    // 更新使用次數
    await prisma.keywordMapping.update({
      where: { id: userMapping.id },
      data: { usageCount: { increment: 1 } }
    });

    return {
      category: userMapping.category,
      subcategory: userMapping.subcategory || undefined,
      note: keywords.join(' '),
      confidence: 'high'
    };
  }

  // 2. 商品格式（以【開頭，例如【TP-Link】Tapo L920）
  if (/^【/.test(keyword.trim())) {
    return { category: '購物', note: keywords.join(' '), confidence: 'medium' };
  }

  // 3. 使用預設關鍵字映射
  for (const [cat, kws] of Object.entries(DEFAULT_KEYWORDS)) {
    const matched = kws.some(kw => keyword.includes(kw.toLowerCase()));

    if (matched) {
      const isMainCategory = MAIN_CATEGORIES.includes(cat);
      return {
        category: isMainCategory ? cat : '飲食',
        subcategory: isMainCategory ? undefined : cat,
        note: keywords.join(' '),
        confidence: 'medium'
      };
    }
  }

  return null;
}

/**
 * 批次解析多筆記帳（換行分隔）
 */
export async function parseBatchExpenseCommands(
  userId: string,
  text: string
): Promise<ParseResult[]> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const results: ParseResult[] = [];

  for (const line of lines) {
    // 支援「記 100 午餐」或直接「100 午餐」格式
    if (/^記?\s*[+\-]?\d/.test(line)) {
      const result = await parseExpenseCommand(userId, line);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * 學習新關鍵字
 * 當用戶確認分類後，將關鍵字存入資料庫
 */
export async function learnKeyword(
  userId: string,
  keyword: string,
  category: string,
  subcategory?: string
): Promise<void> {
  await prisma.keywordMapping.upsert({
    where: {
      userId_keyword: {
        userId,
        keyword: keyword.toLowerCase()
      }
    },
    update: {
      category,
      subcategory,
      usageCount: { increment: 1 }
    },
    create: {
      userId,
      keyword: keyword.toLowerCase(),
      category,
      subcategory,
      isDefault: false,
      usageCount: 1
    }
  });

  console.log(`✅ 學習新關鍵字: "${keyword}" → ${category}${subcategory ? ` (${subcategory})` : ''}`);
}

/**
 * 格式化解析結果為用戶友好的訊息
 */
export function formatParseResult(result: ParseResult): string {
  let message = `💰 金額: $${result.amount}\n`;
  message += `📁 分類: ${result.category}`;

  if (result.subcategory) {
    message += ` > ${result.subcategory}`;
  }

  if (result.note) {
    message += `\n📝 備註: ${result.note}`;
  }

  if (result.needConfirmation) {
    message += '\n\n⚠️ 無法確定分類，請確認是否正確？';
  }

  return message;
}
