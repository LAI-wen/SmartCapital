import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://smartcapital:EPpzhrpZ1qx7BpZREBV0SPj15kB32ilF@dpg-d4he9t7diees73bg9qi0-a.singapore-postgres.render.com/smartcapitalsmartcapital'
    }
  }
});

async function checkAccounts() {
  console.log('🔍 查詢所有用戶...');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      lineUserId: true,
      displayName: true,
      _count: {
        select: { accounts: true }
      }
    }
  });

  console.log('\n📊 用戶列表:');
  users.forEach(user => {
    console.log(`  - ${user.displayName} (${user.lineUserId})`);
    console.log(`    內部 ID: ${user.id}`);
    console.log(`    帳戶數量: ${user._count.accounts}`);
  });

  console.log('\n💰 查詢所有帳戶...');
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      name: true,
      userId: true,
      balance: true,
      currency: true,
      user: {
        select: {
          lineUserId: true,
          displayName: true
        }
      }
    }
  });

  console.log('\n📊 帳戶列表:');
  accounts.forEach(acc => {
    console.log(`  - ${acc.name}: ${acc.currency} ${acc.balance}`);
    console.log(`    擁有者: ${acc.user.displayName} (${acc.user.lineUserId})`);
    console.log(`    userId: ${acc.userId}`);
  });

  await prisma.$disconnect();
}

checkAccounts().catch(console.error);
