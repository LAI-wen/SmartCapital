/**
 * Message Parser - 訊息解析器
 * 判斷用戶輸入的意圖：記帳模式 or 投資模式
 */

import { isValidStockSymbol, formatTaiwanStockSymbol } from '../services/stockService.js';
import { FlexMessage } from '@line/bot-sdk';

export type MessageIntent =
  | { type: 'EXPENSE'; amount: number }
  | { type: 'INCOME'; amount: number }
  | { type: 'STOCK_QUERY'; symbol: string }
  | { type: 'BUY_ACTION'; symbol: string }
  | { type: 'SELL_ACTION'; symbol: string }
  | { type: 'EXPENSE_CATEGORY'; category: string; amount: number }
  | { type: 'INCOME_CATEGORY'; category: string; amount: number }
  | { type: 'QUANTITY_INPUT'; quantity: number }
  | { type: 'HELP' }
  | { type: 'PORTFOLIO' }
  | { type: 'WEBSITE' }
  | { type: 'ACCOUNT_LIST' }
  | { type: 'CREATE_ACCOUNT' }
  | { type: 'TOTAL_ASSETS' }
  | { type: 'UNKNOWN' };

/**
 * 解析用戶訊息，判斷意圖
 */
export function parseMessage(text: string): MessageIntent {
  const trimmed = text.trim();

  // 1. 一步式記帳 - 支出描述 + 金額 (例如: "午餐 120", "咖啡 80", "計程車 200")
  // 支援常見消費場景的關鍵字
  const oneStepExpenseMatch = trimmed.match(/^(午餐|早餐|晚餐|飲料|咖啡|零食|飲食|計程車|公車|捷運|Uber|交通|房租|水電|瓦斯|居住|電影|KTV|遊戲|娛樂|衣服|鞋子|包包|購物|看病|藥品|醫療|其他支出)\s*(\d+(\.\d{1,2})?)$/);
  if (oneStepExpenseMatch) {
    const description = oneStepExpenseMatch[1];
    const amount = parseFloat(oneStepExpenseMatch[2]);

    // 映射到標準分類
    let category = '其他';
    if (/午餐|早餐|晚餐|飲料|咖啡|零食|飲食/.test(description)) category = '飲食';
    else if (/計程車|公車|捷運|Uber|交通/.test(description)) category = '交通';
    else if (/房租|水電|瓦斯|居住/.test(description)) category = '居住';
    else if (/電影|KTV|遊戲|娛樂/.test(description)) category = '娛樂';
    else if (/衣服|鞋子|包包|購物/.test(description)) category = '購物';
    else if (/看病|藥品|醫療/.test(description)) category = '醫療';

    return {
      type: 'EXPENSE_CATEGORY',
      category,
      amount
    };
  }

  // 2. 一步式記帳 - 收入描述 + 金額 (例如: "薪水 50000", "獎金 10000")
  const oneStepIncomeMatch = trimmed.match(/^(薪水|薪資|獎金|紅利|股息|配息|投資獲利|兼職|副業|其他收入)\s*(\d+(\.\d{1,2})?)$/);
  if (oneStepIncomeMatch) {
    const description = oneStepIncomeMatch[1];
    const amount = parseFloat(oneStepIncomeMatch[2]);

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
      amount
    };
  }

  // 3. 優先檢查是否為股票代碼（避免與記帳金額衝突）
  // 台股代碼特徵：4位數（2330）或 0 開頭的 4-5 位數（0050, 00878）
  const upperText = trimmed.toUpperCase();
  if (isValidStockSymbol(upperText)) {
    // 自動轉換台股代碼格式 (2330 -> 2330.TW)
    const formattedSymbol = formatTaiwanStockSymbol(upperText);
    return { type: 'STOCK_QUERY', symbol: formattedSymbol };
  }

  // 4. 傳統兩步式 - 只輸入金額 (例如: "-120" 或 "120")
  // 注意：必須在股票查詢之後，避免 2330 被誤判為金額
  if (/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    const amount = parseFloat(trimmed);
    if (amount < 0) {
      return { type: 'EXPENSE', amount: Math.abs(amount) };
    } else if (amount > 0) {
      return { type: 'INCOME', amount };
    }
  }

  // 5. 收入快捷方式 (例如: "+5000")
  if (/^\+\d+(\.\d{1,2})?$/.test(trimmed)) {
    const amount = parseFloat(trimmed.substring(1));
    return { type: 'INCOME', amount };
  }

  // 6. 檢查是否為買入操作 (例如: "買入 TSLA", "買 TSLA", "買入 2330")
  const buyMatch = trimmed.match(/^(買入|買)\s+([A-Z0-9]+)$/i);
  if (buyMatch) {
    const formattedSymbol = formatTaiwanStockSymbol(buyMatch[2].toUpperCase());
    return { type: 'BUY_ACTION', symbol: formattedSymbol };
  }

  // 7. 檢查是否為賣出操作 (例如: "賣出 TSLA", "賣 TSLA", "賣出 2330")
  const sellMatch = trimmed.match(/^(賣出|賣)\s+([A-Z0-9]+)$/i);
  if (sellMatch) {
    const formattedSymbol = formatTaiwanStockSymbol(sellMatch[2].toUpperCase());
    return { type: 'SELL_ACTION', symbol: formattedSymbol };
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
