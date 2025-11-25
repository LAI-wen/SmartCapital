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
  note?: string,
  accountId?: string,
  originalCurrency?: string,
  exchangeRate?: number
) {
  // 如果有指定帳戶，更新帳戶餘額
  if (accountId) {
    const account = await getAccount(accountId);
    if (!account) {
      throw new Error('帳戶不存在');
    }

    if (account.userId !== userId) {
      throw new Error('無權限操作此帳戶');
    }

    // ⚠️ 記帳功能不檢查餘額，允許負數（信用卡、借貸等情況）
    // 只有投資操作（買股票）才需要檢查餘額

    // 使用 transaction 確保原子性
    return prisma.$transaction(async (tx) => {
      // 1. 更新帳戶餘額
      const newBalance = type === 'income'
        ? account.balance + amount
        : account.balance - amount;

      await tx.account.update({
        where: { id: accountId },
        data: { balance: newBalance }
      });

      // 2. 創建交易記錄（包含原始幣別和匯率）
      return tx.transaction.create({
        data: {
          userId,
          accountId,
          type,
          amount,
          category,
          note: note || '',
          originalCurrency, // 儲存原始幣別
          exchangeRate      // 儲存匯率快取
        }
      });
    });
  } else {
    // 沒有指定帳戶，僅創建記錄（向後兼容）
    return prisma.transaction.create({
      data: {
        userId,
        type,
        amount,
        category,
        note: note || '',
        originalCurrency,
        exchangeRate
      }
    });
  }
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
 * 創建通知
 */
export async function createNotification(
  userId: string,
  type: 'info' | 'alert' | 'success',
  title: string,
  message: string
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message
    }
  });
}

/**
 * 取得用戶通知列表
 */
export async function getUserNotifications(userId: string, limit: number = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * 標記通知為已讀
 */
export async function markNotificationRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  });
}

/**
 * 標記所有通知為已讀
 */
export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true }
  });
}

/**
 * 刪除通知
 */
export async function deleteNotification(notificationId: string) {
  return prisma.notification.delete({
    where: { id: notificationId }
  });
}

/**
 * 取得未讀通知數量
 */
export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false }
  });
}

/**
 * ============================================================
 * Account Management Functions
 * ============================================================
 */

/**
 * 取得用戶所有帳戶
 */
export async function getUserAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' }
    ]
  });
}

/**
 * 取得單一帳戶
 */
export async function getAccount(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId }
  });
}

/**
 * 創建新帳戶
 */
export async function createAccount(
  userId: string,
  name: string,
  type: 'CASH' | 'BANK' | 'BROKERAGE' | 'EXCHANGE',
  currency: 'TWD' | 'USD',
  balance: number = 0,
  isDefault: boolean = false,
  isSub: boolean = false
) {
  // 如果設為預設，先將其他帳戶的 isDefault 設為 false
  if (isDefault) {
    await prisma.account.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false }
    });
  }

  return prisma.account.create({
    data: {
      userId,
      name,
      type,
      currency,
      balance,
      isDefault,
      isSub
    }
  });
}

/**
 * 更新帳戶餘額
 */
export async function updateAccountBalance(
  accountId: string,
  amount: number,
  operation: 'add' | 'subtract' = 'add'
) {
  const account = await getAccount(accountId);
  if (!account) {
    throw new Error('帳戶不存在');
  }

  const newBalance = operation === 'add' 
    ? account.balance + amount 
    : account.balance - amount;

  if (newBalance < 0) {
    throw new Error('餘額不足');
  }

  return prisma.account.update({
    where: { id: accountId },
    data: { balance: newBalance }
  });
}

/**
 * 更新帳戶資訊
 */
export async function updateAccount(
  accountId: string,
  data: {
    name?: string;
    isDefault?: boolean;
  }
) {
  const account = await getAccount(accountId);
  if (!account) {
    throw new Error('帳戶不存在');
  }

  // 如果設為預設，先將其他帳戶的 isDefault 設為 false
  if (data.isDefault) {
    await prisma.account.updateMany({
      where: { userId: account.userId, isDefault: true },
      data: { isDefault: false }
    });
  }

  return prisma.account.update({
    where: { id: accountId },
    data
  });
}

/**
 * 刪除帳戶
 */
export async function deleteAccount(accountId: string) {
  const account = await getAccount(accountId);
  if (!account) {
    throw new Error('帳戶不存在');
  }

  // 檢查是否有相關交易
  const transactionCount = await prisma.transaction.count({
    where: { 
      OR: [
        { accountId },
        { toAccountId: accountId }
      ]
    }
  });

  if (transactionCount > 0) {
    throw new Error('此帳戶有相關交易記錄，無法刪除');
  }

  return prisma.account.delete({
    where: { id: accountId }
  });
}

/**
 * 創建帳戶間轉帳記錄
 */
export async function createTransfer(
  userId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  exchangeRate?: number,
  fee?: number,
  note?: string
) {
  const fromAccount = await getAccount(fromAccountId);
  const toAccount = await getAccount(toAccountId);

  if (!fromAccount || !toAccount) {
    throw new Error('帳戶不存在');
  }

  if (fromAccount.userId !== userId || toAccount.userId !== userId) {
    throw new Error('無權限操作此帳戶');
  }

  // 檢查餘額
  const totalDeduction = amount + (fee || 0);
  if (fromAccount.balance < totalDeduction) {
    throw new Error(`轉出帳戶餘額不足 (需要 ${totalDeduction}，僅有 ${fromAccount.balance})`);
  }

  // 計算實際轉入金額（考慮匯率）
  const actualAmount = exchangeRate ? amount * exchangeRate : amount;

  // 使用 transaction 確保原子性
  return prisma.$transaction(async (tx) => {
    // 1. 扣除來源帳戶餘額
    await tx.account.update({
      where: { id: fromAccountId },
      data: { balance: fromAccount.balance - totalDeduction }
    });

    // 2. 增加目標帳戶餘額
    await tx.account.update({
      where: { id: toAccountId },
      data: { balance: toAccount.balance + actualAmount }
    });

    // 3. 創建轉帳記錄
    const transfer = await tx.transfer.create({
      data: {
        userId,
        fromAccountId,
        toAccountId,
        amount,
        exchangeRate,
        fee,
        note,
        date: new Date()
      }
    });

    // 4. 創建兩筆交易記錄（轉出和轉入）
    await tx.transaction.create({
      data: {
        userId,
        accountId: fromAccountId,
        toAccountId,
        type: 'expense',
        amount: totalDeduction,
        category: 'transfer',
        note: `轉出至 ${toAccount.name}${note ? ` - ${note}` : ''}`,
        date: new Date()
      }
    });

    await tx.transaction.create({
      data: {
        userId,
        accountId: toAccountId,
        type: 'income',
        amount: actualAmount,
        category: 'transfer',
        note: `從 ${fromAccount.name} 轉入${note ? ` - ${note}` : ''}`,
        date: new Date()
      }
    });

    return transfer;
  });
}

/**
 * 取得用戶轉帳記錄
 */
export async function getUserTransfers(userId: string, limit: number = 20) {
  return prisma.transfer.findMany({
    where: { userId },
    include: {
      fromAccount: { select: { name: true, currency: true } },
      toAccount: { select: { name: true, currency: true } }
    },
    orderBy: { date: 'desc' },
    take: limit
  });
}

/**
 * 關閉資料庫連線 (應用程式關閉時調用)
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
