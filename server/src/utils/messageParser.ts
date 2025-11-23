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
  | { type: 'UNKNOWN' };

/**
 * 解析用戶訊息，判斷意圖
 */
export function parseMessage(text: string): MessageIntent {
  const trimmed = text.trim();

  // 1. 檢查是否為支出 (例如: "-120" 或 "120")
  if (/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    const amount = parseFloat(trimmed);
    if (amount < 0) {
      return { type: 'EXPENSE', amount: Math.abs(amount) };
    } else if (amount > 0) {
      return { type: 'INCOME', amount };
    }
  }

  // 2. 檢查是否為收入 (例如: "+5000")
  if (/^\+\d+(\.\d{1,2})?$/.test(trimmed)) {
    const amount = parseFloat(trimmed.substring(1));
    return { type: 'INCOME', amount };
  }

  // 3. 檢查是否為股票代碼查詢 (例如: "TSLA", "2330")
  const upperText = trimmed.toUpperCase();
  if (isValidStockSymbol(upperText)) {
    // 自動轉換台股代碼格式 (2330 -> 2330.TW)
    const formattedSymbol = formatTaiwanStockSymbol(upperText);
    return { type: 'STOCK_QUERY', symbol: formattedSymbol };
  }

  // 4. 檢查是否為買入操作 (例如: "買入 TSLA", "買入 2330")
  const buyMatch = trimmed.match(/^買入\s+([A-Z0-9]+)$/i);
  if (buyMatch) {
    const formattedSymbol = formatTaiwanStockSymbol(buyMatch[1].toUpperCase());
    return { type: 'BUY_ACTION', symbol: formattedSymbol };
  }

  // 5. 檢查是否為賣出操作 (例如: "賣出 TSLA", "賣出 2330")
  const sellMatch = trimmed.match(/^賣出\s+([A-Z0-9]+)$/i);
  if (sellMatch) {
    const formattedSymbol = formatTaiwanStockSymbol(sellMatch[1].toUpperCase());
    return { type: 'SELL_ACTION', symbol: formattedSymbol };
  }

  // 6. 檢查是否為支出分類選擇 (例如: "飲食 120")
  const expenseCategoryMatch = trimmed.match(/^(飲食|交通|居住|娛樂|購物|醫療|其他)\s+(\d+(\.\d{1,2})?)$/);
  if (expenseCategoryMatch) {
    return {
      type: 'EXPENSE_CATEGORY',
      category: expenseCategoryMatch[1],
      amount: parseFloat(expenseCategoryMatch[2])
    };
  }

  // 7. 檢查是否為收入分類選擇 (例如: "薪資 50000")
  const incomeCategoryMatch = trimmed.match(/^(薪資|獎金|股息|投資獲利|兼職|其他)\s+(\d+(\.\d{1,2})?)$/);
  if (incomeCategoryMatch) {
    return {
      type: 'INCOME_CATEGORY',
      category: incomeCategoryMatch[1],
      amount: parseFloat(incomeCategoryMatch[2])
    };
  }

  // 8. 檢查是否為數量輸入 (例如: "10", "0.5")
  if (/^\d+(\.\d{1,4})?$/.test(trimmed)) {
    const quantity = parseFloat(trimmed);
    return { type: 'QUANTITY_INPUT', quantity };
  }

  // 9. 檢查指令
  if (/(說明|幫助|help)/i.test(trimmed)) {
    return { type: 'HELP' };
  }

  if (/(資產|持倉|portfolio)/i.test(trimmed)) {
    return { type: 'PORTFOLIO' };
  }

  if (/(網站|查看|website|web|app|連結)/i.test(trimmed)) {
    return { type: 'WEBSITE' };
  }

  // 未知訊息
  return { type: 'UNKNOWN' };
}

/**
 * 生成幫助訊息 (純文字版 - 備用)
 */
export function getHelpMessage(): string {
  return `📖 SmartCapital 使用說明

【生活記帳】
• 支出：輸入 "-120" 或 "120"
• 收入：輸入 "+5000"
→ 系統會跳出分類選單供您選擇

【投資助理】
• 查詢股價：輸入股票代號 (如 "TSLA", "2330")
• 買入/賣出：點擊行情卡片的按鈕

【其他功能】
• 查看資產：輸入 "資產" 或 "持倉"
• 查看說明：輸入 "說明" 或 "help"

🚀 開始記帳與投資吧！`;
}

/**
 * 生成幫助訊息卡片 (Flex Message)
 */
export function getHelpCard(): FlexMessage {
  return {
    type: 'flex',
    altText: '📖 SmartCapital 使用說明',
    contents: {
      type: 'carousel',
      contents: [
        // 第一張卡片 - 生活記帳
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
                    text: '💰',
                    size: '3xl',
                    align: 'center'
                  },
                  {
                    type: 'text',
                    text: '生活記帳',
                    weight: 'bold',
                    size: 'xl',
                    align: 'center',
                    color: '#44403C',
                    margin: 'md'
                  }
                ],
                spacing: 'none',
                margin: 'none',
                paddingBottom: 'lg'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '記錄支出',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0
                      }
                    ],
                    margin: 'lg'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '輸入 "-120" 或 "120"',
                        size: 'sm',
                        color: '#A8A29E',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '系統會跳出分類選單',
                        size: 'xs',
                        color: '#D6D3D1',
                        margin: 'sm'
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '記錄收入',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0
                      }
                    ],
                    margin: 'lg'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '輸入 "+5000"',
                        size: 'sm',
                        color: '#A8A29E',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '選擇收入類別',
                        size: 'xs',
                        color: '#D6D3D1',
                        margin: 'sm'
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md'
                  }
                ],
                spacing: 'none'
              }
            ],
            paddingAll: 'xl',
            backgroundColor: '#F9F7F2'
          },
          styles: {
            body: {
              separator: true
            }
          }
        },
        // 第二張卡片 - 投資助理
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
                    text: '投資助理',
                    weight: 'bold',
                    size: 'xl',
                    align: 'center',
                    color: '#44403C',
                    margin: 'md'
                  }
                ],
                spacing: 'none',
                margin: 'none',
                paddingBottom: 'lg'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '查詢股價',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0
                      }
                    ],
                    margin: 'lg'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '輸入股票代號',
                        size: 'sm',
                        color: '#A8A29E',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '例如：TSLA, AAPL, 2330',
                        size: 'xs',
                        color: '#D6D3D1',
                        margin: 'sm'
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '買入/賣出',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0
                      }
                    ],
                    margin: 'lg'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '查詢股價後點擊按鈕',
                        size: 'sm',
                        color: '#A8A29E',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '系統會引導您完成交易',
                        size: 'xs',
                        color: '#D6D3D1',
                        margin: 'sm'
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md'
                  }
                ],
                spacing: 'none'
              }
            ],
            paddingAll: 'xl',
            backgroundColor: '#F9F7F2'
          },
          styles: {
            body: {
              separator: true
            }
          }
        },
        // 第三張卡片 - 策略實驗室
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
                    text: '🧮',
                    size: '3xl',
                    align: 'center'
                  },
                  {
                    type: 'text',
                    text: '策略實驗室',
                    weight: 'bold',
                    size: 'xl',
                    align: 'center',
                    color: '#44403C',
                    margin: 'md'
                  }
                ],
                spacing: 'none',
                margin: 'none',
                paddingBottom: 'lg'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '凱利公式',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0
                      }
                    ],
                    margin: 'lg'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '智慧倉位建議',
                        size: 'sm',
                        color: '#A8A29E',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '根據勝率與賠率計算',
                        size: 'xs',
                        color: '#D6D3D1',
                        margin: 'sm'
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '馬丁格爾',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0
                      }
                    ],
                    margin: 'lg'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '救援點位計算',
                        size: 'sm',
                        color: '#A8A29E',
                        wrap: true
                      },
                      {
                        type: 'text',
                        text: '規劃加碼策略',
                        size: 'xs',
                        color: '#D6D3D1',
                        margin: 'sm'
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md'
                  }
                ],
                spacing: 'none'
              }
            ],
            paddingAll: 'xl',
            backgroundColor: '#F9F7F2'
          },
          styles: {
            body: {
              separator: true
            }
          }
        },
        // 第四張卡片 - 其他功能
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
                    text: '🎯',
                    size: '3xl',
                    align: 'center'
                  },
                  {
                    type: 'text',
                    text: '快捷指令',
                    weight: 'bold',
                    size: 'xl',
                    align: 'center',
                    color: '#44403C',
                    margin: 'md'
                  }
                ],
                spacing: 'none',
                margin: 'none',
                paddingBottom: 'lg'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '查看資產',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0
                      }
                    ],
                    margin: 'lg'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '輸入「資產」或「持倉」',
                        size: 'sm',
                        color: '#A8A29E',
                        wrap: true
                      }
                    ],
                    margin: 'sm',
                    paddingStart: 'md'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '查看說明',
                        color: '#78716C',
                        size: 'sm',
                        weight: 'bold',
                        flex: 0
                      }
                    ],
                    margin: 'lg'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '輸入「說明」或「help」',
                        size: 'sm',
                        color: '#A8A29E',
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
                        text: '🚀 開始記帳與投資吧！',
                        size: 'md',
                        color: '#8FA5B5',
                        weight: 'bold',
                        align: 'center',
                        wrap: true
                      }
                    ],
                    margin: 'xl',
                    paddingAll: 'md',
                    backgroundColor: '#E6ECF0',
                    cornerRadius: 'md'
                  }
                ],
                spacing: 'none'
              }
            ],
            paddingAll: 'xl',
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
