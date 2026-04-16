
import { Asset, Transaction, Account } from './types';

export const MOCK_EXCHANGE_RATE = 32.5; // 1 USD = 32.5 TWD

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc_1',
    name: '我的錢包',
    type: 'CASH',
    currency: 'TWD',
    balance: 5000,
    isDefault: true
  },
  {
    id: 'acc_2',
    name: '台新銀行 (交割/薪轉)',
    type: 'BANK',
    currency: 'TWD',
    balance: 120000
  },
  {
    id: 'acc_3',
    name: '國泰證券 (複委託)',
    type: 'BROKERAGE',
    currency: 'TWD',
    balance: 300000,
    isSub: true
  },
  {
    id: 'acc_4',
    name: 'Firstrade (美股)',
    type: 'BROKERAGE',
    currency: 'USD',
    balance: 520.50
  }
];

export const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    type: 'Stock',
    quantity: 15,
    avgPrice: 210.00,
    currentPrice: 240.50,
    currency: 'USD',
    change24h: 5.2,
    history: [220, 225, 218, 230, 235, 238, 240.50]
  },
  {
    id: '2',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'Stock',
    quantity: 5,
    avgPrice: 175.00,
    currentPrice: 182.30,
    currency: 'USD',
    change24h: -0.45,
    history: [185, 184, 183, 182, 181, 182, 182.30]
  },
  {
    id: '3',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'Crypto',
    quantity: 0.05,
    avgPrice: 42000,
    currentPrice: 65000,
    currency: 'USD',
    change24h: 2.1,
    history: [60000, 61000, 60500, 62000, 64000, 63500, 65000]
  },
  {
    id: '4',
    symbol: '2330.TW',
    name: '台積電',
    type: 'Stock',
    quantity: 200,
    avgPrice: 550,
    currentPrice: 580,
    currency: 'TWD',
    change24h: 1.5,
    history: [560, 565, 570, 575, 572, 578, 580]
  },
  {
    id: '5',
    symbol: '0050.TW',
    name: '元大台灣50',
    type: 'ETF',
    quantity: 1000,
    avgPrice: 130,
    currentPrice: 145.3,
    currency: 'TWD',
    change24h: 0.8,
    history: [140, 142, 141, 143, 144, 145, 145.3]
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2023-10-25',
    type: 'expense',
    amount: 120,
    category: '飲食',
    accountId: 'acc_1',
    note: '午餐 - 雞腿便當'
  },
  {
    id: '2',
    date: '2023-10-24',
    type: 'income',
    amount: 50000,
    category: '薪資',
    accountId: 'acc_2',
    note: '十月份薪資'
  },
  {
    id: '3',
    date: '2023-10-24',
    type: 'expense',
    amount: 1200,
    category: '交通',
    accountId: 'acc_1',
    note: '加油'
  },
  {
    id: '4',
    date: '2023-10-22',
    type: 'income',
    amount: 3500,
    category: '股息',
    accountId: 'acc_2',
    note: '0050 配息'
  },
  {
    id: '5',
    date: '2023-10-20',
    type: 'expense',
    amount: 15000,
    category: '居住',
    accountId: 'acc_2',
    note: '11月份房租'
  }
];

export const TRANSACTION_CATEGORIES = {
  expense: ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '投資', '其他'],
  income: ['薪資', '獎金', '股息', '投資獲利', '兼職', '其他'],
  transfer: ['轉帳', '儲蓄'],
  invest: ['買入', '加碼']
};

// Morandi Palette
export const COLORS = {
  profit: '#84A98C', // Sage Green
  loss: '#D68C92',   // Dusty Rose
  brand: '#64748B',  // Slate Blue
  card: '#FFFFFF',
  textMain: '#44403C', // Warm Charcoal
  textMuted: '#78716C', // Stone Grey
  chart: ['#84A98C', '#A5A58D', '#D68C92', '#64748B', '#E6B8A2'] // Sage, Olive, Rose, Slate, Peach
};
