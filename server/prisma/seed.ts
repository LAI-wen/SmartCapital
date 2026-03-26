/**
 * Seed Script - 為用戶初始化預設帳戶
 * 執行: npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始種子資料初始化...');

  // 取得所有現有用戶
  const users = await prisma.user.findMany();
  console.log(`📊 找到 ${users.length} 位用戶`);

  for (const user of users) {
    console.log(`\n👤 處理用戶: ${user.displayName} (${user.lineUserId})`);

    // 檢查是否已有帳戶
    const existingAccounts = await prisma.account.findMany({
      where: { userId: user.id }
    });

    if (existingAccounts.length > 0) {
      console.log(`   ✓ 已有 ${existingAccounts.length} 個帳戶，跳過`);
      continue;
    }

    // 創建預設帳戶
    const defaultAccounts = [
      {
        userId: user.id,
        name: '錢包',
        type: 'CASH',
        currency: 'TWD',
        balance: user.bankroll || 10000, // 將原本的 bankroll 移到錢包
        isDefault: true,
        isSub: false
      },
      {
        userId: user.id,
        name: '主要銀行',
        type: 'BANK',
        currency: 'TWD',
        balance: 0,
        isDefault: false,
        isSub: false
      }
    ];

    for (const accountData of defaultAccounts) {
      const account = await prisma.account.create({
        data: accountData
      });
      console.log(`   ✓ 創建帳戶: ${account.name} (餘額: ${account.balance})`);
    }

    // 更新 User 的 enableTW (預設啟用台股)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        enableTWStock: true,
        enableUSStock: false,
        enableCrypto: false
      }
    });
    console.log(`   ✓ 更新投資範圍設定 (預設啟用台股)`);
  }

  console.log('\n✅ 種子資料初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 種子資料初始化失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
