/**
 * Database Service - 資料庫操作服務
 * 使用 Prisma ORM 處理所有資料庫操作
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };

/**
 * 取得或建立用戶
 */
export async function getOrCreateUser(lineUserId: string, displayName?: string) {
  let user = await prisma.user.findUnique({
    where: { lineUserId }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        lineUserId,
        displayName: displayName || 'User',
        bankroll: 10000 // 預設本金
      }
    });

    // 同時建立預設設定
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        kellyWinProbability: 55.0,
        kellyOdds: 2.0,
        martingaleMultiplier: 2.0
      }
    });
  }

  return user;
}

/**
 * 取得用戶設定
 */
export async function getUserSettings(userId: string) {
  let settings = await prisma.userSettings.findUnique({
    where: { userId }
  });

  if (!settings) {
    // 如果沒有設定，建立預設值
    settings = await prisma.userSettings.create({
      data: {
        userId,
        kellyWinProbability: 55.0,
        kellyOdds: 2.0,
        martingaleMultiplier: 2.0
      }
    });
  }

  return settings;
}

/**
 * 新增交易記錄
 */
export async function createTransaction(
  userId: string,
  type: 'income' | 'expense',
  amount: number,
  category: string,
  note?: string
) {
  return prisma.transaction.create({
    data: {
      userId,
      type,
      amount,
      category,
      note: note || ''
    }
  });
}

/**
 * 取得用戶交易記錄
 */
export async function getUserTransactions(userId: string, limit: number = 10) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit
  });
}

/**
 * 新增或更新資產持倉
 */
export async function upsertAsset(
  userId: string,
  symbol: string,
  name: string,
  type: 'Stock' | 'Crypto' | 'ETF',
  quantity: number,
  price: number
) {
  const existing = await prisma.asset.findUnique({
    where: {
      userId_symbol: {
        userId,
        symbol
      }
    }
  });

  if (existing) {
    // 更新平均成本
    const totalQuantity = existing.quantity + quantity;
    const totalCost = (existing.quantity * existing.avgPrice) + (quantity * price);
    const newAvgPrice = totalCost / totalQuantity;

    return prisma.asset.update({
      where: {
        userId_symbol: {
          userId,
          symbol
        }
      },
      data: {
        quantity: totalQuantity,
        avgPrice: newAvgPrice
      }
    });
  } else {
    // 建立新持倉
    return prisma.asset.create({
      data: {
        userId,
        symbol,
        name,
        type,
        quantity,
        avgPrice: price
      }
    });
  }
}

/**
 * 減少資產持倉 (賣出)
 */
export async function reduceAsset(
  userId: string,
  symbol: string,
  quantity: number
) {
  const existing = await prisma.asset.findUnique({
    where: {
      userId_symbol: {
        userId,
        symbol
      }
    }
  });

  if (!existing) {
    throw new Error('未找到該資產持倉');
  }

  if (existing.quantity < quantity) {
    throw new Error(`持倉不足 (僅有 ${existing.quantity})`);
  }

  const newQuantity = existing.quantity - quantity;

  if (newQuantity === 0) {
    // 完全賣出，刪除記錄
    return prisma.asset.delete({
      where: {
        userId_symbol: {
          userId,
          symbol
        }
      }
    });
  } else {
    // 減少數量
    return prisma.asset.update({
      where: {
        userId_symbol: {
          userId,
          symbol
        }
      },
      data: {
        quantity: newQuantity
      }
    });
  }
}

/**
 * 取得用戶所有資產
 */
export async function getUserAssets(userId: string) {
  return prisma.asset.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' }
  });
}

/**
 * 取得特定資產
 */
export async function getAsset(userId: string, symbol: string) {
  return prisma.asset.findUnique({
    where: {
      userId_symbol: {
        userId,
        symbol
      }
    }
  });
}

/**
 * 取得或建立對話狀態
 */
export async function getConversationState(lineUserId: string) {
  let state = await prisma.conversationState.findUnique({
    where: { lineUserId }
  });

  if (!state) {
    state = await prisma.conversationState.create({
      data: {
        lineUserId,
        state: 'IDLE',
        context: null
      }
    });
  }

  return state;
}

/**
 * 更新對話狀態
 */
export async function updateConversationState(
  lineUserId: string,
  state: string,
  context?: any
) {
  return prisma.conversationState.upsert({
    where: { lineUserId },
    update: {
      state,
      context: context ? JSON.stringify(context) : null
    },
    create: {
      lineUserId,
      state,
      context: context ? JSON.stringify(context) : null
    }
  });
}

/**
 * 清除對話狀態 (回到 IDLE)
 */
export async function clearConversationState(lineUserId: string) {
  return updateConversationState(lineUserId, 'IDLE', null);
}

/**
 * 關閉資料庫連線 (應用程式關閉時調用)
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
