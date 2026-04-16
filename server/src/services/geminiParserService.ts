/**
 * Gemini AI Parser Service
 * 用於解析無法用規則辨識的自然語言記帳訊息
 * 僅在 rule parser 信心度低時作為 fallback 使用
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const VALID_CATEGORIES = ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '投資', '其他'];
const VALID_INCOME_CATEGORIES = ['薪資', '獎金', '投資收益', '兼職', '其他'];

export interface GeminiParseResult {
  amount: number;
  category: string;
  subcategory?: string;
  note: string;
  type: 'expense' | 'income';
}

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * 用 Gemini 解析自然語言記帳訊息
 * @returns 解析結果，若 API 不可用或解析失敗則回傳 null
 */
export async function parseWithGemini(
  rawText: string,
  amount: number
): Promise<GeminiParseResult | null> {
  const ai = getGenAI();
  if (!ai) return null;

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `你是一個記帳助理，幫我解析以下記帳訊息。

訊息：「${rawText}」
已確認金額：${amount}

請判斷這是支出還是收入，並選擇最合適的分類與子分類。

支出分類（選一個）：${VALID_CATEGORIES.join('、')}
飲食子分類（選一個，若適用）：早餐、午餐、晚餐、下午茶、飲料、零食、宵夜
收入分類（選一個）：${VALID_INCOME_CATEGORIES.join('、')}

判斷規則：
- 咖啡（美式、拿鐵、卡布等）、手搖飲 → 飲料 或 下午茶
- 正餐（飯、麵、便當等）→ 早餐/午餐/晚餐（依時段）
- 甜點、蛋糕 → 下午茶

只回傳 JSON，格式如下，不要加其他文字：
{"type":"expense","category":"飲食","subcategory":"下午茶","note":"檸檬冰美式"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // 提取 JSON（Gemini 有時會加 markdown 格式）
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    const type: 'expense' | 'income' = parsed.type === 'income' ? 'income' : 'expense';
    const validList = type === 'income' ? VALID_INCOME_CATEGORIES : VALID_CATEGORIES;
    const category = validList.includes(parsed.category) ? parsed.category : (type === 'income' ? '其他' : '飲食');

    const VALID_SUBCATEGORIES = ['早餐', '午餐', '晚餐', '下午茶', '飲料', '零食', '宵夜'];
    const subcategory = parsed.subcategory && VALID_SUBCATEGORIES.includes(parsed.subcategory)
      ? parsed.subcategory
      : undefined;

    return {
      amount,
      category,
      subcategory,
      note: String(parsed.note || rawText).slice(0, 50),
      type,
    };
  } catch (err) {
    console.error('❌ [Gemini] 解析失敗:', err);
    return null;
  }
}

export function isGeminiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
