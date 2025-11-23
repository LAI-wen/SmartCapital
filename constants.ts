

import { Asset, Transaction, Notification } from './types';

export const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    type: 'Stock',
    quantity: 150,
    avgPrice: 210.00,
    currentPrice: 240.50,
    change24h: 5.2,
    history: [220, 225, 218, 230, 235, 238, 240.50]
  },
  {
    id: '2',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'Stock',
    quantity: 50,
    avgPrice: 175.00,
    currentPrice: 182.30,
    change24h: -0.45,
    history: [185, 184, 183, 182, 181, 182, 182.30]
  },
  {
    id: '3',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'Crypto',
    quantity: 0.45,
    avgPrice: 42000,
    currentPrice: 65000,
    change24h: 2.1,
    history: [60000, 61000, 60500, 62000, 64000, 63500, 65000]
  },
  {
    id: '4',
    symbol: 'USD',
    name: '現金儲備 (Cash)',
    type: 'Cash',
    quantity: 25000,
    avgPrice: 1,
    currentPrice: 1,
    change24h: 0,
    history: [1, 1, 1, 1, 1, 1, 1]
  },
  {
    id: '5',
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    type: 'Stock',
    quantity: 20,
    avgPrice: 450,
    currentPrice: 890,
    change24h: 3.5,
    history: [850, 860, 870, 865, 880, 885, 890]
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2023-10-25',
    type: 'expense',
    amount: 120,
    category: '飲食',
    note: '午餐 - 雞腿便當'
  },
  {
    id: '2',
    date: '2023-10-24',
    type: 'income',
    amount: 50000,
    category: '薪資',
    note: '十月份薪資'
  },
  {
    id: '3',
    date: '2023-10-24',
    type: 'expense',
    amount: 1200,
    category: '交通',
    note: '加油'
  },
  {
    id: '4',
    date: '2023-10-22',
    type: 'income',
    amount: 3500,
    category: '股息',
    note: '0050 配息'
  },
  {
    id: '5',
    date: '2023-10-20',
    type: 'expense',
    amount: 15000,
    category: '居住',
    note: '11月份房租'
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: '價格預警：TSLA',
    message: 'Tesla 股價已突破 $240，達到您的設定目標。',
    time: '10 分鐘前',
    type: 'alert',
    read: false
  },
  {
    id: '2',
    title: '配息入帳通知',
    message: '0050 季度配息 $3,500 已存入您的現金帳戶。',
    time: '2 小時前',
    type: 'success',
    read: false
  },
  {
    id: '3',
    title: '週報生成',
    message: '您的上週資產分析報告已準備就緒，點擊查看。',
    time: '昨天',
    type: 'info',
    read: true
  },
  {
    id: '4',
    title: '系統更新',
    message: '策略實驗室新增「價值平均法」計算器，歡迎試用。',
    time: '2 天前',
    type: 'info',
    read: true
  }
];

export const TRANSACTION_CATEGORIES = {
  expense: ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '投資', '其他'],
  income: ['薪資', '獎金', '股息', '投資獲利', '兼職', '其他']
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