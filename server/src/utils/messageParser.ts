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
  | { type: 'EXPENSE_QUERY'; period: 'today' | 'week' | 'month'; category?: string }
  | { type: 'BUDGET_QUERY' }
  | { type: 'SET_BUDGET'; category: string; amount: number }
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
  const dollarAmountMatch = trimmed.match(/^([\u4e00-\u9fa5a-zA-Z][\u4e00-\u9fa5a-zA-Z0-9（）()\-—–、\s]*?)\$(\d+(?:\.\d{1,2})?)(.*)$/);
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

  // 預算指令要在記帳 pattern 之前，否則「設預算 飲食 5000」會被誤認為記帳
  if (/^(預算|查預算|本月預算|我的預算|budget)$/i.test(trimmed)) {
    return { type: 'BUDGET_QUERY' };
  }
  const _setBudgetEarly = trimmed.match(/^(?:設定?預算|預算設定?)\s+([\u4e00-\u9fa5]+)\s+(\d+(?:\.\d+)?)$/) ||
    trimmed.match(/^([\u4e00-\u9fa5]+)預算\s+(\d+(?:\.\d+)?)$/);
  if (_setBudgetEarly) {
    const VALID_BUDGET_CATS = ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '其他', '總計'];
    const cat = _setBudgetEarly[1];
    if (VALID_BUDGET_CATS.includes(cat)) {
      return { type: 'SET_BUDGET', category: cat, amount: parseFloat(_setBudgetEarly[2]) };
    }
  }

  // 3. 中文開頭 + 金額：「摩斯漢堡 99」「高鐵（台北-桃園） 155」
  const chineseFirstMatch = trimmed.match(/^([\u4e00-\u9fa5][\u4e00-\u9fa5a-zA-Z0-9（）()\-—–、]*(?:\s+[\u4e00-\u9fa5a-zA-Z0-9（）()\-—–、]+)*)\s+(\d+(?:\.\d{1,2})?)(.*)$/);
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

  // 預算查詢：「預算」「查預算」「本月預算」
  if (/^(預算|查預算|本月預算|我的預算|budget)$/i.test(trimmed)) {
    return { type: 'BUDGET_QUERY' };
  }

  // 設定預算：「設預算 飲食 3000」「設定預算 飲食 3000」「飲食預算 3000」
  const setBudgetMatch = trimmed.match(/^(?:設定?預算|預算設定?)\s+([\u4e00-\u9fa5]+)\s+(\d+(?:\.\d+)?)$/) ||
    trimmed.match(/^([\u4e00-\u9fa5]+)預算\s+(\d+(?:\.\d+)?)$/);
  if (setBudgetMatch) {
    const VALID_BUDGET_CATS = ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '其他', '總計'];
    const cat = setBudgetMatch[1];
    if (VALID_BUDGET_CATS.includes(cat)) {
      return { type: 'SET_BUDGET', category: cat, amount: parseFloat(setBudgetMatch[2]) };
    }
  }

  // 費用查詢：今天 / 這週 / 本月（可選帶分類）
  // 支援：「今天花了多少」「我今天花了多少」「本月餐飲花多少」「這週交通」
  const CATEGORIES_RE = '(飲食|早餐|午餐|晚餐|下午茶|宵夜|交通|居住|娛樂|購物|醫療|投資|其他)';
  const categoryMatch = trimmed.match(new RegExp(CATEGORIES_RE));
  const queriedCategory = categoryMatch?.[1];

  if (/(今天|今日|今日花|today)/.test(trimmed) && /(花|多少|支出|花費|消費|查|看)/.test(trimmed)) {
    return { type: 'EXPENSE_QUERY', period: 'today', category: queriedCategory };
  }
  if (/(今天|今日|today)/.test(trimmed) && !queriedCategory) {
    // 只有「今天」但沒有動詞，也視為查詢
    return { type: 'EXPENSE_QUERY', period: 'today' };
  }
  if (/(這週|本週|this\s*week|week)/.test(trimmed) && /(花|多少|支出|花費|消費|查|看)?/.test(trimmed)) {
    return { type: 'EXPENSE_QUERY', period: 'week', category: queriedCategory };
  }
  if (/(本月|這個月|this\s*month|month)/.test(trimmed) && /(花|多少|支出|花費|消費|查|看)?/.test(trimmed)) {
    return { type: 'EXPENSE_QUERY', period: 'month', category: queriedCategory };
  }
  // 純分類查詢：「本月餐飲」「這週交通」
  if (queriedCategory && /(本月|這個月|這週|本週)/.test(trimmed)) {
    const period = /(這週|本週)/.test(trimmed) ? 'week' : 'month';
    return { type: 'EXPENSE_QUERY', period, category: queriedCategory };
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

// 幫助卡片輔助：生成指令範例行
function helpRow(cmd: string, desc: string): object {
  return {
    type: 'box',
    layout: 'horizontal',
    paddingAll: '10px',
    contents: [
      { type: 'text', text: cmd, size: 'sm', color: '#44403C', weight: 'bold', flex: 5, wrap: true },
      { type: 'text', text: desc, size: 'xs', color: '#A8A29E', flex: 4, align: 'end', wrap: true, gravity: 'center' }
    ]
  };
}

function helpDivider(): object {
  return { type: 'separator', color: '#F5F2EE' };
}

/**
 * 生成幫助訊息卡片 (Flex Message) - 3 張卡片 carousel
 */
export function getHelpCard(): FlexMessage {
  const card = (
    headerColor: string,
    headerText: string,
    subText: string,
    rows: object[],
    btnLabel: string,
    btnText: string
  ) => ({
    type: 'bubble' as const,
    size: 'mega' as const,
    header: {
      type: 'box' as const,
      layout: 'vertical' as const,
      backgroundColor: headerColor,
      paddingAll: '20px',
      paddingBottom: '18px',
      contents: [
        { type: 'text' as const, text: headerText, size: 'lg' as const, color: '#FFFFFF', weight: 'bold' as const },
        { type: 'text' as const, text: subText, size: 'xs' as const, color: '#FFFFFF80', margin: 'xs' as const }
      ]
    },
    body: {
      type: 'box' as const,
      layout: 'vertical' as const,
      paddingAll: 'none' as const,
      contents: rows as any[]
    },
    footer: {
      type: 'box' as const,
      layout: 'vertical' as const,
      paddingAll: '14px' as const,
      contents: [{
        type: 'button' as const,
        style: 'primary' as const,
        color: headerColor,
        height: 'sm' as const,
        action: { type: 'message' as const, label: btnLabel, text: btnText }
      }]
    }
  });

  return {
    type: 'flex',
    altText: '📖 SmartCapital 使用指南',
    contents: {
      type: 'carousel',
      contents: [
        // Card 1 - 記帳
        card(
          '#44403C',
          '💸  記帳',
          '直接說就好，自動分類',
          [
            helpRow('午餐 120', '飲食·午餐 支出'),
            helpDivider(),
            helpRow('咖啡$80', '飲食·下午茶 支出'),
            helpDivider(),
            helpRow('計程車 250', '交通 支出'),
            helpDivider(),
            helpRow('薪水 50000', '薪資 收入'),
            helpDivider(),
            helpRow('+1000 獎金', '收入'),
            helpDivider(),
            {
              type: 'box',
              layout: 'vertical',
              paddingAll: '12px',
              backgroundColor: '#FAFAF9',
              contents: [{
                type: 'text',
                text: '💡 支援口語化輸入，說什麼都懂',
                size: 'xs',
                color: '#A8A29E',
                align: 'center',
                wrap: true
              }]
            }
          ],
          '試試看：午餐 120',
          '午餐 120'
        ),
        // Card 2 - 查詢 & 預算
        card(
          '#769F86',
          '📊  查詢 & 預算',
          '掌握每分錢的去向',
          [
            helpRow('今天花了多少', '今日支出統計'),
            helpDivider(),
            helpRow('本月花多少', '本月收支總覽'),
            helpDivider(),
            helpRow('這週飲食', '分類篩選查詢'),
            helpDivider(),
            helpRow('預算', '查看預算使用狀況'),
            helpDivider(),
            helpRow('設預算 飲食 5000', '設定分類月預算'),
            helpDivider(),
            {
              type: 'box',
              layout: 'vertical',
              paddingAll: '12px',
              backgroundColor: '#FAFAF9',
              contents: [{
                type: 'text',
                text: '📱 輸入「帳本」開啟完整記帳頁面',
                size: 'xs',
                color: '#A8A29E',
                align: 'center',
                wrap: true
              }]
            }
          ],
          '查今天花費',
          '今天花了多少'
        ),
        // Card 3 - 投資
        card(
          '#8FA5B5',
          '📈  投資',
          '即時股價、記錄買賣',
          [
            helpRow('TSLA', '查美股即時股價'),
            helpDivider(),
            helpRow('2330', '查台股即時股價'),
            helpDivider(),
            helpRow('TSLA kelly', '股價 + 凱利倉位建議'),
            helpDivider(),
            helpRow('買 TSLA 10', '記錄買入 10 股'),
            helpDivider(),
            helpRow('賣 2330 100', '記錄賣出 100 股'),
            helpDivider(),
            helpRow('持倉', '查看投資組合'),
            helpDivider(),
            {
              type: 'box',
              layout: 'vertical',
              paddingAll: '12px',
              backgroundColor: '#FAFAF9',
              contents: [{
                type: 'text',
                text: '🌐 輸入「網站」開啟完整版',
                size: 'xs',
                color: '#A8A29E',
                align: 'center',
                wrap: true
              }]
            }
          ],
          '查詢 TSLA',
          'TSLA'
        )
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
