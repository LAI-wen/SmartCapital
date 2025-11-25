/**
 * Category Prediction Service - 智能分類預測服務
 * 使用規則基礎的方法預測交易分類
 */

import { getUserTransactions } from './databaseService.js';

/**
 * 預測支出分類
 */
export async function predictExpenseCategory(
  userId: string,
  amount: number,
  timestamp: Date = new Date()
): Promise<string> {
  const hour = timestamp.getHours();
  const dayOfWeek = timestamp.getDay();

  // 規則 1: 時間 + 金額規則（最高優先級）
  // 用餐時間 + 小額支出 → 飲食
  if ((hour >= 6 && hour <= 9) || (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 20)) {
    if (amount < 500) {
      return '飲食';
    }
  }

  // 規則 2: 金額門檻規則
  if (amount > 10000) {
    // 大額支出 → 居住（房租、水電等）
    return '居住';
  } else if (amount > 5000 && amount <= 10000) {
    // 中大額支出 → 購物
    return '購物';
  } else if (amount > 2000 && amount <= 5000) {
    // 中額支出 → 娛樂或購物
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // 週末 → 娛樂
      return '娛樂';
    }
    return '購物';
  } else if (amount > 500 && amount <= 2000) {
    // 中小額支出 → 交通或娛樂
    if (hour >= 7 && hour <= 9) {
      // 早上通勤時間 → 交通
      return '交通';
    }
    if (hour >= 17 && hour <= 19) {
      // 晚上下班時間 → 交通
      return '交通';
    }
    return '娛樂';
  } else if (amount <= 500) {
    // 小額支出 → 飲食或交通
    if (hour >= 11 && hour <= 14) {
      // 午餐時間 → 飲食
      return '飲食';
    }
    if (amount < 200) {
      // 超小額 → 飲食（咖啡、零食等）
      return '飲食';
    }
    return '交通';
  }

  // 規則 3: 歷史規則（最低優先級）
  try {
    const historicalCategory = await predictFromHistory(userId, amount);
    if (historicalCategory) {
      return historicalCategory;
    }
  } catch (error) {
    console.warn('歷史預測失敗:', error);
  }

  // 預設值
  return '其他';
}

/**
 * 預測收入分類
 */
export async function predictIncomeCategory(
  userId: string,
  amount: number,
  timestamp: Date = new Date()
): Promise<string> {
  const dayOfMonth = timestamp.getDate();

  // 規則 1: 月初大額 → 薪資
  if (dayOfMonth >= 1 && dayOfMonth <= 10 && amount > 30000) {
    return '薪資';
  }

  // 規則 2: 金額門檻
  if (amount > 50000) {
    return '薪資';
  } else if (amount > 10000 && amount <= 50000) {
    // 中大額 → 獎金或兼職
    if (dayOfMonth >= 1 && dayOfMonth <= 10) {
      return '薪資';
    }
    return '獎金';
  } else if (amount > 1000 && amount <= 10000) {
    // 中額 → 兼職或投資獲利
    return '兼職';
  } else if (amount <= 1000) {
    // 小額 → 股息或其他
    return '股息';
  }

  // 歷史規則
  try {
    const historicalCategory = await predictFromHistory(userId, amount, 'income');
    if (historicalCategory) {
      return historicalCategory;
    }
  } catch (error) {
    console.warn('歷史預測失敗:', error);
  }

  return '其他';
}

/**
 * 根據歷史交易預測分類
 * 找出相似金額（±20%）的最常用分類
 */
async function predictFromHistory(
  userId: string,
  amount: number,
  type: 'expense' | 'income' = 'expense',
  limit: number = 50
): Promise<string | null> {
  try {
    // 取得最近的交易記錄
    const transactions = await getUserTransactions(userId, limit);

    // 過濾出相同類型的交易
    const relevantTransactions = transactions.filter(
      tx => tx.type === type && tx.category !== '其他' && tx.category !== 'investment'
    );

    if (relevantTransactions.length === 0) {
      return null;
    }

    // 計算金額範圍（±20%）
    const minAmount = amount * 0.8;
    const maxAmount = amount * 1.2;

    // 找出相似金額的交易
    const similarTransactions = relevantTransactions.filter(
      tx => tx.amount >= minAmount && tx.amount <= maxAmount
    );

    if (similarTransactions.length === 0) {
      return null;
    }

    // 計算每個分類的出現次數
    const categoryCount: Record<string, number> = {};
    similarTransactions.forEach(tx => {
      categoryCount[tx.category] = (categoryCount[tx.category] || 0) + 1;
    });

    // 找出最常用的分類
    let maxCount = 0;
    let predictedCategory: string | null = null;

    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCount = count;
        predictedCategory = category;
      }
    });

    // 如果至少有 2 筆相似交易，才返回預測結果
    if (maxCount >= 2) {
      return predictedCategory;
    }

    return null;
  } catch (error) {
    console.error('歷史預測錯誤:', error);
    return null;
  }
}

/**
 * 取得預測的可信度（0-1）
 */
export async function getPredictionConfidence(
  userId: string,
  amount: number,
  predictedCategory: string,
  type: 'expense' | 'income' = 'expense'
): Promise<number> {
  try {
    const transactions = await getUserTransactions(userId, 50);
    const relevantTransactions = transactions.filter(
      tx => tx.type === type && tx.category === predictedCategory
    );

    if (relevantTransactions.length === 0) {
      return 0.5; // 基礎可信度
    }

    // 計算金額範圍（±20%）
    const minAmount = amount * 0.8;
    const maxAmount = amount * 1.2;

    // 計算相似金額的比例
    const similarCount = relevantTransactions.filter(
      tx => tx.amount >= minAmount && tx.amount <= maxAmount
    ).length;

    const confidence = Math.min(0.9, 0.5 + (similarCount / relevantTransactions.length) * 0.4);

    return confidence;
  } catch (error) {
    return 0.5;
  }
}
