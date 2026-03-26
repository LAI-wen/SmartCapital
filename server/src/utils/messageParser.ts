/**
 * Message Parser - 訊息解析器
 * 判斷用戶輸入的意圖：記帳模式 or 投資模式
 */

import { isValidStockSymbol, formatTaiwanStockSymbol } from '../services/stockService.js';
import { FlexMessage } from '@line/bot-sdk';

export type MessageIntent =
  | { type: 'EXPENSE'; amount: number; note?: string }
  | { type: 'INCOME'; amount: number; note?: string }
  | { type: 'STOCK_QUERY'; symbol: string; showKelly: boolean }
  | { type: 'BUY_ACTION'; symbol: string; quantity?: number }
  | { type: 'SELL_ACTION'; symbol: string; quantity?: number }
  | { type: 'EXPENSE_CATEGORY'; category: string; subcategory?: string; amount: number; note?: string }
  | { type: 'INCOME_CATEGORY'; category: string; amount: number; note?: string }
  | { type: 'QUANTITY_INPUT'; quantity: number }
  | { type: 'HELP' }
  | { type: 'PORTFOLIO' }
  | { type: 'WEBSITE' }
  | { type: 'ACCOUNT_LIST' }
  | { type: 'CREATE_ACCOUNT' }
  | { type: 'TOTAL_ASSETS' }
  | { type: 'LEDGER' }
  | { type: 'UNKNOWN' };

/**
 * 從文字猜測支出分類
 */
function guessExpenseCategory(text: string): string {
  const t = text.toLowerCase();
  if (/餐|飯|麵|便當|漢堡|壽司|披薩|pizza|拉麵|牛肉|雞肉|豬肉|吃|喝|早餐|午餐|晚餐|宵夜|飲食|食物|摩斯|麥當勞|肯德基|subway|全家|7-?eleven|超商/.test(t)) return '飲食';
  if (/咖啡|星巴克|starbucks|cama|85度|手搖|珍奶|奶茶|飲料|可樂|果汁|下午茶/.test(t)) return '飲食';
  if (/計程車|taxi|uber|捷運|公車|火車|高鐵|台鐵|停車|油費|加油|交通/.test(t)) return '交通';
  if (/電影|ktv|唱歌|遊戲|旅遊|旅行|娛樂/.test(t)) return '娛樂';
  if (/衣|鞋|包|購物|蝦皮|momo|pchome|網購/.test(t)) return '購物';
  if (/房租|租金|水費|電費|瓦斯|網路費|居住/.test(t)) return '居住';
  if (/藥|醫院|診所|看病|醫療/.test(t)) return '醫療';
  return '其他';
}

// 餐別關鍵字 → subcategory（手動覆蓋用）
const MEAL_KEYWORDS: Record<string, string> = {
  早餐: '早餐', 早午餐: '早餐',
  午餐: '午餐', 中餐: '午餐',
  下午茶: '下午茶', 點心: '下午茶', 甜點: '下午茶',
  晚餐: '晚餐', 晚飯: '晚餐',
  宵夜: '宵夜', 消夜: '宵夜', 夜市: '宵夜'
};

/**
 * 從文字偵測餐別關鍵字（手動覆蓋）
 * 回傳 subcategory 或 undefined
 */
function detectMealKeyword(text: string): string | undefined {
  for (const [kw, sub] of Object.entries(MEAL_KEYWORDS)) {
    if (text.includes(kw)) return sub;
  }
  return undefined;
}

/**
 * 解析用戶訊息，判斷意圖
 */
export function parseMessage(text: string): MessageIntent {
  const trimmed = text.trim();

  // 1. 支援 $金額 格式：「午餐摩斯$99」「星巴克$180」「宵夜鹹酥雞$150」
  const dollarAmountMatch = trimmed.match(/^([\u4e00-\u9fa5a-zA-Z][\u4e00-\u9fa5a-zA-Z0-9\s]*?)\$(\d+(?:\.\d{1,2})?)(.*)$/);
  if (dollarAmountMatch) {
    const noteText = dollarAmountMatch[1].trim();
    const amount = parseFloat(dollarAmountMatch[2]);
    const extra = dollarAmountMatch[3].trim();
    if (amount > 0) {
      const category = guessExpenseCategory(noteText);
      const subcategory = category === '飲食' ? detectMealKeyword(noteText) : undefined;
      return {
        type: 'EXPENSE_CATEGORY',
        category,
        subcategory,
        amount,
        note: extra ? `${noteText} ${extra}` : noteText
      };
    }
  }

  // 2. 一步式記帳 - 支出描述 + 金額 + 備註 (例如: "午餐 120", "宵夜 150", "咖啡 80 星巴克")
  const oneStepExpenseMatch = trimmed.match(/^(午餐|早餐|晚餐|宵夜|消夜|下午茶|點心|飲料|咖啡|零食|飲食|計程車|公車|捷運|Uber|交通|房租|水電|瓦斯|居住|電影|KTV|遊戲|娛樂|衣服|鞋子|包包|購物|看病|藥品|醫療|其他支出)\s*(\d+(\.\d{1,2})?)\s*(.*)$/i);
  if (oneStepExpenseMatch) {
    const description = oneStepExpenseMatch[1];
    const amount = parseFloat(oneStepExpenseMatch[2]);
    const note = oneStepExpenseMatch[4]?.trim() || undefined;

    let category = '其他';
    let subcategory: string | undefined;
    if (/午餐|早餐|晚餐|宵夜|消夜|下午茶|點心|飲料|咖啡|零食|飲食/.test(description)) {
      category = '飲食';
      subcategory = detectMealKeyword(description);
    }
    else if (/計程車|公車|捷運|Uber|交通/.test(description)) category = '交通';
    else if (/房租|水電|瓦斯|居住/.test(description)) category = '居住';
    else if (/電影|KTV|遊戲|娛樂/.test(description)) category = '娛樂';
    else if (/衣服|鞋子|包包|購物/.test(description)) category = '購物';
    else if (/看病|藥品|醫療/.test(description)) category = '醫療';

    return {
      type: 'EXPENSE_CATEGORY',
      category,
      subcategory,
      amount,
      note
    };
  }

  // 3. 中文開頭 + 金額：「摩斯漢堡 99」「宵夜鹹酥雞 150」
  const chineseFirstMatch = trimmed.match(/^([\u4e00-\u9fa5][\u4e00-\u9fa5a-zA-Z0-9]*(?:\s+[\u4e00-\u9fa5a-zA-Z0-9]+)*)\s+(\d+(?:\.\d{1,2})?)(.*)$/);
  if (chineseFirstMatch) {
    const noteText = chineseFirstMatch[1].trim();
    const amount = parseFloat(chineseFirstMatch[2]);
    const extra = chineseFirstMatch[3]?.trim();
    if (amount > 0) {
      const category = guessExpenseCategory(noteText);
      const subcategory = category === '飲食' ? detectMealKeyword(noteText) : undefined;
      return {
        type: 'EXPENSE_CATEGORY',
        category,
        subcategory,
        amount,
        note: extra ? `${noteText} ${extra}` : noteText
      };
    }
  }

  // 2. 一步式記帳 - 收入描述 + 金額 + 備註 (例如: "薪水 50000", "獎金 10000 年終")
  const oneStepIncomeMatch = trimmed.match(/^(薪水|薪資|獎金|紅利|股息|配息|投資獲利|兼職|副業|其他收入)\s*(\d+(\.\d{1,2})?)\s*(.*)$/);
  if (oneStepIncomeMatch) {
    const description = oneStepIncomeMatch[1];
    const amount = parseFloat(oneStepIncomeMatch[2]);
    const note = oneStepIncomeMatch[4]?.trim() || undefined; // 備註（可選）

    // 映射到標準分類
    let category = '其他';
    if (/薪水|薪資/.test(description)) category = '薪資';
    else if (/獎金|紅利/.test(description)) category = '獎金';
    else if (/股息|配息/.test(description)) category = '股息';
    else if (/投資獲利/.test(description)) category = '投資獲利';
    else if (/兼職|副業/.test(description)) category = '兼職';

    return {
      type: 'INCOME_CATEGORY',
      category,
      amount,
      note
    };
  }

  // 3. 傳統兩步式 - 純數字 + 備註 (例如: "100 牛肉麵", "-120 計程車")
  // 優先級提高：純數字應該是記帳，而非股票查詢
  const numberWithNoteMatch = trimmed.match(/^(-?\d+(\.\d{1,2})?)\s*(.*)$/);
  if (numberWithNoteMatch) {
    const amount = parseFloat(numberWithNoteMatch[1]);
    const note = numberWithNoteMatch[3]?.trim() || undefined;

    if (amount < 0) {
      return { type: 'EXPENSE', amount: Math.abs(amount), note };
    } else if (amount > 0) {
      return { type: 'INCOME', amount, note };
    }
  }

  // 4. 收入快捷方式 + 備註 (例如: "+5000", "+100 牛肉麵")
  const incomeWithNoteMatch = trimmed.match(/^\+(\d+(\.\d{1,2})?)\s*(.*)$/);
  if (incomeWithNoteMatch) {
    const amount = parseFloat(incomeWithNoteMatch[1]);
    const note = incomeWithNoteMatch[3]?.trim() || undefined;
    return { type: 'INCOME', amount, note };
  }

  // 5. 查股指令
  // 「TSLA kelly」「TSLA 凱利」→ 顯示 Kelly 建議
  // 「TSLA」「查詢 2330」「股 2330」→ 只顯示股價
  const kellyQueryMatch = trimmed.match(/^([A-Z0-9]+(?:\.[A-Z]+)?)\s+(kelly|凱利|kel)$/i);
  if (kellyQueryMatch) {
    return { type: 'STOCK_QUERY', symbol: formatTaiwanStockSymbol(kellyQueryMatch[1].toUpperCase()), showKelly: true };
  }
  const stockQueryMatch = trimmed.match(/^(?:股票查詢|查詢|股票|股)\s+([A-Z0-9]+)$/i);
  if (stockQueryMatch) {
    return { type: 'STOCK_QUERY', symbol: formatTaiwanStockSymbol(stockQueryMatch[1].toUpperCase()), showKelly: false };
  }

  // 6. 買入：「買 TSLA 10」「買入 2330 1000」（含股數）或「買 TSLA」（不含股數）
  const buyMatch = trimmed.match(/^(買入|買)\s+([A-Z0-9]+(?:\.[A-Z]+)?)\s*(\d+(?:\.\d+)?)?$/i);
  if (buyMatch) {
    const symbol = formatTaiwanStockSymbol(buyMatch[2].toUpperCase());
    const quantity = buyMatch[3] ? parseFloat(buyMatch[3]) : undefined;
    return { type: 'BUY_ACTION', symbol, quantity };
  }

  // 7. 賣出：「賣 TSLA 5」「賣出 2330 500」或「賣 TSLA」
  const sellMatch = trimmed.match(/^(賣出|賣)\s+([A-Z0-9]+(?:\.[A-Z]+)?)\s*(\d+(?:\.\d+)?)?$/i);
  if (sellMatch) {
    const symbol = formatTaiwanStockSymbol(sellMatch[2].toUpperCase());
    const quantity = sellMatch[3] ? parseFloat(sellMatch[3]) : undefined;
    return { type: 'SELL_ACTION', symbol, quantity };
  }

  // 8. 檢查是否為支出分類選擇 (例如: "飲食 120") - 兼容舊格式
  const expenseCategoryMatch = trimmed.match(/^(飲食|交通|居住|娛樂|購物|醫療|其他)\s+(\d+(\.\d{1,2})?)$/);
  if (expenseCategoryMatch) {
    return {
      type: 'EXPENSE_CATEGORY',
      category: expenseCategoryMatch[1],
      amount: parseFloat(expenseCategoryMatch[2])
    };
  }

  // 9. 檢查是否為收入分類選擇 (例如: "薪資 50000") - 兼容舊格式
  const incomeCategoryMatch = trimmed.match(/^(薪資|獎金|股息|投資獲利|兼職|其他)\s+(\d+(\.\d{1,2})?)$/);
  if (incomeCategoryMatch) {
    return {
      type: 'INCOME_CATEGORY',
      category: incomeCategoryMatch[1],
      amount: parseFloat(incomeCategoryMatch[2])
    };
  }

  // 10. 檢查指令 - 擴充支援更多關鍵字
  if (/(說明|幫助|指令|help|說說|教學)/i.test(trimmed)) {
    return { type: 'HELP' };
  }

  if (/(我的投資組合|投資組合|持倉|股票|portfolio)/i.test(trimmed)) {
    return { type: 'PORTFOLIO' };
  }

  if (/(網站|查看|website|web|app|連結|網頁)/i.test(trimmed)) {
    return { type: 'WEBSITE' };
  }

  // 帳戶管理指令 - 擴充支援更多關鍵字
  if (/(帳戶列表|帳戶|我的帳戶|查看帳戶|accounts)/i.test(trimmed)) {
    return { type: 'ACCOUNT_LIST' };
  }

  if (/(建立帳戶|新增帳戶|新帳戶|create\s*account)/i.test(trimmed)) {
    return { type: 'CREATE_ACCOUNT' };
  }

  // 資產查詢指令 - 擴充支援更多關鍵字
  if (/(總資產|資產總覽|資產|我的資產|total\s*assets)/i.test(trimmed)) {
    return { type: 'TOTAL_ASSETS' };
  }

  // 記帳頁面指令
  if (/(記帳|帳本|記錄|ledger|bookkeeping|book)/i.test(trimmed)) {
    return { type: 'LEDGER' };
  }

  // 未知訊息
  return { type: 'UNKNOWN' };
}

/**
 * 生成幫助訊息 (純文字版 - 備用)
 */
export function getHelpMessage(): string {
  return `📖 SmartCapital 使用說明

【快速記帳】✨ 新！一行搞定
• "午餐 120" → 自動記錄飲食支出
• "咖啡 80" → 快速記錄飲料花費
• "薪水 50000" → 記錄收入

【傳統記帳】
• 輸入 "120" → 選擇支出分類
• 輸入 "+5000" → 選擇收入分類

【投資助理】
• "TSLA" 或 "2330" → 查詢股價
• "買 TSLA" → 開始買入流程

【查詢指令】
• "帳戶" → 查看所有帳戶
• "資產" → 查看總資產
• "持倉" → 查看投資組合

💡 提示：支援更多口語化關鍵字！`;
}

/**
 * 生成幫助訊息卡片 (Flex Message)
 */
export function getHelpCard(): FlexMessage {
  return {
    type: 'flex',
    altText: '📖 SmartCapital 快速指南',
    contents: {
      type: 'carousel',
      contents: [
        // 第一張卡片 - 記帳功能（整合生活記帳）
        {
          type: 'bubble',
          size: 'mega',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: '✨',
                    size: '3xl',
                    align: 'center'
                  },
                  {
                    type: 'text',
                    text: '快速記帳',
                    weight: 'bold',
                    size: 'xl',
                    align: 'center',
                    color: '#44403C',
                    margin: 'md'
                  },
                  {
                    type: 'text',
                    text: '一行輸入，自動分類',
                    size: 'xs',
                    align: 'center',
                    color: '#A8A29E',
                    margin: 'sm'
                  }
                ],
                spacing: 'none',
                margin: 'none',
                paddingBottom: 'md'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '💰',
                        size: 'sm',
                        flex: 0,
                        margin: 'none'
                      },
                      {
                        type: 'text',
                        text: '記支出（新功能）',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0,
                        margin: 'sm'
                      }
                    ],
                    margin: 'lg',
                    spacing: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '「午餐 120」「咖啡 80」',
                        size: 'sm',
                        color: '#8FA5B5',
                        wrap: true,
                        weight: 'bold'
                      },
                      {
                        type: 'text',
                        text: '「計程車 200」「電影 300」',
                        size: 'xs',
                        color: '#D6D3D1',
                        margin: 'xs',
                        wrap: true
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md',
                    paddingAll: 'sm',
                    backgroundColor: '#E6ECF0',
                    cornerRadius: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '💵',
                        size: 'sm',
                        flex: 0
                      },
                      {
                        type: 'text',
                        text: '記收入',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0,
                        margin: 'sm'
                      }
                    ],
                    margin: 'md',
                    spacing: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '「薪水 50000」「獎金 10000」',
                        size: 'sm',
                        color: '#8FA5B5',
                        wrap: true,
                        weight: 'bold'
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md',
                    paddingAll: 'sm',
                    backgroundColor: '#E6ECF0',
                    cornerRadius: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '⚡',
                        size: 'sm',
                        flex: 0
                      },
                      {
                        type: 'text',
                        text: '傳統方式',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0,
                        margin: 'sm'
                      }
                    ],
                    margin: 'md',
                    spacing: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '「120」→ 選擇分類',
                        size: 'xs',
                        color: '#A8A29E',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '「+5000」→ 選擇收入類別',
                        size: 'xs',
                        color: '#A8A29E',
                        margin: 'xs',
                        wrap: true
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md'
                  }
                ],
                spacing: 'none'
              }
            ],
            paddingAll: 'lg',
            backgroundColor: '#F9F7F2'
          },
          styles: {
            body: {
              separator: true
            }
          }
        },
        // 第二張卡片 - 投資與查詢（整合投資助理、策略實驗室、快捷指令）
        {
          type: 'bubble',
          size: 'mega',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: '📈',
                    size: '3xl',
                    align: 'center'
                  },
                  {
                    type: 'text',
                    text: '投資 & 查詢',
                    weight: 'bold',
                    size: 'xl',
                    align: 'center',
                    color: '#44403C',
                    margin: 'md'
                  },
                  {
                    type: 'text',
                    text: '交易、分析、資產管理',
                    size: 'xs',
                    align: 'center',
                    color: '#A8A29E',
                    margin: 'sm'
                  }
                ],
                spacing: 'none',
                margin: 'none',
                paddingBottom: 'md'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '📊',
                        size: 'sm',
                        flex: 0
                      },
                      {
                        type: 'text',
                        text: '查詢股價',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0,
                        margin: 'sm'
                      }
                    ],
                    margin: 'lg',
                    spacing: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '「TSLA」「2330」「AAPL」',
                        size: 'sm',
                        color: '#8FA5B5',
                        wrap: true,
                        weight: 'bold'
                      },
                      {
                        type: 'text',
                        text: '→ 顯示即時股價、凱利建議',
                        size: 'xs',
                        color: '#D6D3D1',
                        margin: 'xs'
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md',
                    paddingAll: 'sm',
                    backgroundColor: '#E6ECF0',
                    cornerRadius: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '💼',
                        size: 'sm',
                        flex: 0
                      },
                      {
                        type: 'text',
                        text: '買賣交易',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0,
                        margin: 'sm'
                      }
                    ],
                    margin: 'md',
                    spacing: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '「買 TSLA」「賣 2330」',
                        size: 'sm',
                        color: '#8FA5B5',
                        wrap: true,
                        weight: 'bold'
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md',
                    paddingAll: 'sm',
                    backgroundColor: '#E6ECF0',
                    cornerRadius: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '🎯',
                        size: 'sm',
                        flex: 0
                      },
                      {
                        type: 'text',
                        text: '常用指令',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0,
                        margin: 'sm'
                      }
                    ],
                    margin: 'md',
                    spacing: 'sm'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '「帳戶」→ 查看所有帳戶',
                        size: 'xs',
                        color: '#A8A29E',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '「資產」→ 查看總資產',
                        size: 'xs',
                        color: '#A8A29E',
                        margin: 'xs',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '「持倉」→ 查看投資組合',
                        size: 'xs',
                        color: '#A8A29E',
                        margin: 'xs',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '「網站」→ 開啟完整版',
                        size: 'xs',
                        color: '#A8A29E',
                        margin: 'xs',
                        wrap: true
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '💡 支援更多口語化關鍵字',
                        size: 'sm',
                        color: '#8FA5B5',
                        weight: 'bold',
                        align: 'center',
                        wrap: true
                      }
                    ],
                    margin: 'lg',
                    paddingAll: 'sm',
                    backgroundColor: '#E6ECF0',
                    cornerRadius: 'md'
                  }
                ],
                spacing: 'none'
              }
            ],
            paddingAll: 'lg',
            backgroundColor: '#F9F7F2'
          },
          styles: {
            body: {
              separator: true
            }
          }
        }
      ]
    }
  };
}

/**
 * 驗證數量輸入
 */
export function validateQuantity(quantity: number): { valid: boolean; error?: string } {
  if (quantity <= 0) {
    return { valid: false, error: '數量必須大於 0' };
  }

  if (quantity > 1000000) {
    return { valid: false, error: '數量過大，請確認輸入' };
  }

  return { valid: true };
}

/**
 * 驗證金額輸入
 */
export function validateAmount(amount: number): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: '金額必須大於 0' };
  }

  if (amount > 10000000) {
    return { valid: false, error: '金額過大，請確認輸入' };
  }

  return { valid: true };
}
