/**
 * Flex Message Templates - LINE Bot 卡片訊息模板
 * 包含行情卡片、分類選單等精美視覺設計
 */

import { FlexMessage, FlexBubble } from '@line/bot-sdk';
import { StockQuote } from '../services/stockService.js';
import { KellyResult, MartingaleResult } from '../services/strategyService.js';

// Morandi 色系配色 (與前端一致)
const COLORS = {
  background: '#F9F8F4',
  profit: '#769F86',      // 漲 (綠色)
  loss: '#C88EA7',        // 跌 (粉紅)
  textMain: '#44403C',
  textMuted: '#78716C',
  separator: '#E5E5E5',
  buttonBuy: '#769F86',
  buttonSell: '#C88EA7'
};

/**
 * 生成股票行情卡片
 * 顯示股價、漲跌、凱利建議、馬丁格爾救援點
 */
export function createStockQuoteCard(
  quote: StockQuote,
  kelly?: KellyResult,
  martingale?: MartingaleResult
): FlexMessage {
  const isPositive = quote.change >= 0;
  const changeColor = isPositive ? COLORS.profit : COLORS.loss;
  const changeSign = isPositive ? '+' : '';

  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: COLORS.background,
      paddingAll: '20px',
      contents: [
        {
          type: 'text',
          text: `${quote.symbol} / ${quote.name}`,
          weight: 'bold',
          size: 'md',
          color: COLORS.textMain,
          wrap: true
        },
        {
          type: 'box',
          layout: 'baseline',
          margin: 'md',
          contents: [
            {
              type: 'text',
              text: `$${quote.price.toFixed(2)}`,
              size: 'xxl',
              weight: 'bold',
              color: COLORS.textMain,
              flex: 0
            },
            {
              type: 'text',
              text: `${changeSign}${quote.changePercent.toFixed(2)}%`,
              size: 'lg',
              weight: 'bold',
              color: changeColor,
              margin: 'md',
              flex: 0
            }
          ]
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      spacing: 'md',
      contents: [
        {
          type: 'separator',
          color: COLORS.separator
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      paddingAll: '15px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: COLORS.buttonBuy,
          action: {
            type: 'message',
            label: '買入',
            text: `買入 ${quote.symbol}`
          },
          height: 'sm'
        },
        {
          type: 'button',
          style: 'primary',
          color: COLORS.buttonSell,
          action: {
            type: 'message',
            label: '賣出',
            text: `賣出 ${quote.symbol}`
          },
          height: 'sm'
        }
      ]
    }
  };

  // 動態添加策略建議到 body
  const bodyContents: any[] = [
    { type: 'separator', color: COLORS.separator }
  ];

  // 凱利建議
  if (kelly) {
    bodyContents.push({
      type: 'box',
      layout: 'baseline',
      margin: 'lg',
      contents: [
        {
          type: 'text',
          text: '💡 凱利建議',
          size: 'sm',
          color: COLORS.textMuted,
          flex: 2
        },
        {
          type: 'text',
          text: `可買入 $${kelly.suggestedAmount.toFixed(0)}`,
          size: 'sm',
          color: COLORS.textMain,
          weight: 'bold',
          flex: 3,
          align: 'end'
        }
      ]
    });
  }

  // 馬丁格爾救援點
  if (martingale) {
    bodyContents.push({
      type: 'box',
      layout: 'baseline',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '🛡️ 救援點位',
          size: 'sm',
          color: COLORS.textMuted,
          flex: 2
        },
        {
          type: 'text',
          text: `$${martingale.recoveryPrice.toFixed(2)}`,
          size: 'sm',
          color: COLORS.loss,
          weight: 'bold',
          flex: 3,
          align: 'end'
        }
      ]
    });
  }

  // 使用非空斷言，因為我們已經在上面定義了 body
  bubble.body!.contents = bodyContents;

  return {
    type: 'flex',
    altText: `${quote.symbol} 行情`,
    contents: bubble
  };
}

/**
 * 生成記帳分類選單 (Quick Reply)
 */
export function createExpenseCategoryQuickReply(amount: number, predictedCategory?: string) {
  const categories = ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '其他'];

  // 如果有預測分類，將其移到第一位
  let orderedCategories = [...categories];
  if (predictedCategory && categories.includes(predictedCategory)) {
    orderedCategories = [
      predictedCategory,
      ...categories.filter(c => c !== predictedCategory)
    ];
  }

  return {
    type: 'text' as const,
    text: predictedCategory
      ? `💡 智能預測：${predictedCategory} (金額: ${amount} 元)\n請選擇類別或確認預測`
      : `請選擇支出類別 (金額: ${amount} 元)`,
    quickReply: {
      items: orderedCategories.map((category, index) => ({
        type: 'action' as const,
        action: {
          type: 'message' as const,
          label: index === 0 && predictedCategory === category ? `🎯 ${category}` : category,
          text: `${category} ${amount}`
        }
      }))
    }
  };
}

/**
 * 生成收入分類選單 (Quick Reply)
 */
export function createIncomeCategoryQuickReply(amount: number, predictedCategory?: string) {
  const categories = ['薪資', '獎金', '股息', '投資獲利', '兼職', '其他'];

  // 如果有預測分類，將其移到第一位
  let orderedCategories = [...categories];
  if (predictedCategory && categories.includes(predictedCategory)) {
    orderedCategories = [
      predictedCategory,
      ...categories.filter(c => c !== predictedCategory)
    ];
  }

  return {
    type: 'text' as const,
    text: predictedCategory
      ? `💡 智能預測：${predictedCategory} (金額: ${amount} 元)\n請選擇類別或確認預測`
      : `請選擇收入類別 (金額: ${amount} 元)`,
    quickReply: {
      items: orderedCategories.map((category, index) => ({
        type: 'action' as const,
        action: {
          type: 'message' as const,
          label: index === 0 && predictedCategory === category ? `🎯 ${category}` : category,
          text: `${category} ${amount}`
        }
      }))
    }
  };
}

/**
 * 生成確認訊息
 */
export function createConfirmMessage(
  title: string,
  message: string,
  yesText: string,
  noText: string = '取消'
) {
  return {
    type: 'template' as const,
    altText: title,
    template: {
      type: 'confirm' as const,
      text: message,
      actions: [
        {
          type: 'message' as const,
          label: yesText,
          text: yesText
        },
        {
          type: 'message' as const,
          label: noText,
          text: noText
        }
      ]
    }
  };
}

/**
 * 生成資產總覽卡片 (簡易版)
 */
export function createPortfolioSummaryCard(
  totalValue: number,
  totalCost: number,
  assets: Array<{ symbol: string; value: number; returnPercent: number }>
): FlexMessage {
  const totalReturn = totalValue - totalCost;
  const totalReturnPercent = (totalReturn / totalCost) * 100;
  const isProfit = totalReturn >= 0;

  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: COLORS.background,
      paddingAll: '20px',
      contents: [
        {
          type: 'text',
          text: '📊 我的資產總覽',
          weight: 'bold',
          size: 'lg',
          color: COLORS.textMain
        },
        {
          type: 'text',
          text: `$${totalValue.toFixed(2)}`,
          size: 'xxl',
          weight: 'bold',
          color: COLORS.textMain,
          margin: 'md'
        },
        {
          type: 'text',
          text: `${isProfit ? '+' : ''}$${totalReturn.toFixed(2)} (${totalReturnPercent.toFixed(2)}%)`,
          size: 'md',
          color: isProfit ? COLORS.profit : COLORS.loss,
          margin: 'sm'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      spacing: 'md',
      contents: assets.slice(0, 5).map(asset => ({
        type: 'box' as const,
        layout: 'baseline' as const,
        contents: [
          {
            type: 'text' as const,
            text: asset.symbol,
            size: 'sm',
            color: COLORS.textMain,
            flex: 2
          },
          {
            type: 'text' as const,
            text: `$${asset.value.toFixed(0)}`,
            size: 'sm',
            color: COLORS.textMuted,
            flex: 2,
            align: 'end' as const
          },
          {
            type: 'text' as const,
            text: `${asset.returnPercent >= 0 ? '+' : ''}${asset.returnPercent.toFixed(1)}%`,
            size: 'sm',
            color: asset.returnPercent >= 0 ? COLORS.profit : COLORS.loss,
            flex: 2,
            align: 'end' as const
          }
        ]
      }))
    }
  };

  return {
    type: 'flex',
    altText: '資產總覽',
    contents: bubble
  };
}

/**
 * 生成記帳成功卡片
 * 顯示本月統計、最近交易和查看完整記帳按鈕
 */
interface TransactionSummary {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  recentTransactions: Array<{
    date: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
  }>;
  liffUrl?: string;
}

export function createTransactionSuccessCard(data: TransactionSummary): FlexMessage {
  const isIncome = data.type === 'income';
  const iconColor = isIncome ? COLORS.profit : COLORS.loss;
  const icon = isIncome ? '💰' : '💸';
  const title = isIncome ? '收入已記錄' : '支出已記錄';

  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: COLORS.background,
      paddingAll: '20px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: icon,
              size: 'xl',
              flex: 0
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: title,
                  size: 'lg',
                  weight: 'bold',
                  color: COLORS.textMain
                },
                {
                  type: 'text',
                  text: data.category,
                  size: 'sm',
                  color: COLORS.textMuted
                }
              ]
            }
          ]
        },
        {
          type: 'text',
          text: `${isIncome ? '+' : '-'}$${data.amount.toFixed(0)}`,
          size: 'xxl',
          weight: 'bold',
          color: iconColor,
          align: 'center',
          margin: 'lg'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: '📊 本月統計',
          size: 'sm',
          weight: 'bold',
          color: COLORS.textMain,
          margin: 'none'
        },
        {
          type: 'separator',
          color: COLORS.separator
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            {
              type: 'text',
              text: '收入',
              size: 'sm',
              color: COLORS.textMuted,
              flex: 1
            },
            {
              type: 'text',
              text: `+$${data.monthlyIncome.toFixed(0)}`,
              size: 'sm',
              color: COLORS.profit,
              weight: 'bold',
              align: 'end',
              flex: 1
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '支出',
              size: 'sm',
              color: COLORS.textMuted,
              flex: 1
            },
            {
              type: 'text',
              text: `-$${data.monthlyExpense.toFixed(0)}`,
              size: 'sm',
              color: COLORS.loss,
              weight: 'bold',
              align: 'end',
              flex: 1
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '結餘',
              size: 'sm',
              color: COLORS.textMain,
              weight: 'bold',
              flex: 1
            },
            {
              type: 'text',
              text: `$${data.monthlyBalance.toFixed(0)}`,
              size: 'sm',
              color: data.monthlyBalance >= 0 ? COLORS.profit : COLORS.loss,
              weight: 'bold',
              align: 'end',
              flex: 1
            }
          ]
        },
        {
          type: 'separator',
          margin: 'lg',
          color: COLORS.separator
        },
        {
          type: 'text',
          text: '📝 最近交易',
          size: 'sm',
          weight: 'bold',
          color: COLORS.textMain,
          margin: 'md'
        }
      ]
    },
    footer: data.liffUrl ? {
      type: 'box',
      layout: 'vertical',
      paddingAll: '15px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#6B9BD1',
          action: {
            type: 'uri',
            label: '📖 查看完整記帳',
            uri: data.liffUrl
          },
          height: 'sm'
        }
      ]
    } : undefined
  };

  // 添加最近交易（最多顯示2筆）
  const recentItems = data.recentTransactions.slice(0, 2).map(tx => ({
    type: 'box' as const,
    layout: 'horizontal' as const,
    margin: 'sm' as const,
    contents: [
      {
        type: 'text' as const,
        text: tx.category,
        size: 'xs' as const,
        color: COLORS.textMuted,
        flex: 2
      },
      {
        type: 'text' as const,
        text: `${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(0)}`,
        size: 'xs' as const,
        color: tx.type === 'income' ? COLORS.profit : COLORS.loss,
        align: 'end' as const,
        flex: 1
      }
    ]
  }));

  bubble.body!.contents.push(...recentItems);

  return {
    type: 'flex',
    altText: `${title} ${data.category} ${isIncome ? '+' : '-'}$${data.amount}`,
    contents: bubble
  };
}
