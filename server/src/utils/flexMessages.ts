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
export function createExpenseCategoryQuickReply(amount: number) {
  const categories = ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '其他'];

  return {
    type: 'text' as const,
    text: `請選擇支出類別 (金額: ${amount} 元)`,
    quickReply: {
      items: categories.map(category => ({
        type: 'action' as const,
        action: {
          type: 'message' as const,
          label: category,
          text: `${category} ${amount}`
        }
      }))
    }
  };
}

/**
 * 生成收入分類選單 (Quick Reply)
 */
export function createIncomeCategoryQuickReply(amount: number) {
  const categories = ['薪資', '獎金', '股息', '投資獲利', '兼職', '其他'];

  return {
    type: 'text' as const,
    text: `請選擇收入類別 (金額: ${amount} 元)`,
    quickReply: {
      items: categories.map(category => ({
        type: 'action' as const,
        action: {
          type: 'message' as const,
          label: category,
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
