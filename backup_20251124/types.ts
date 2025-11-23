

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'Stock' | 'Crypto' | 'Cash' | 'ETF';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  change24h: number; // Percentage
  history: number[]; // Simple array for sparklines
  currency: Currency; // 新增：資產的計價幣別
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: Currency;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  dayChangeValue: number;
  dayChangePercent: number;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

// Strategy Lab Types
export interface KellyInput {
  winProbability: number; // 0-100
  odds: number; // e.g. 2.0 (1:1 payout + stake)
  bankroll: number;
}

export interface MartingaleInput {
  initialBet: number;
  lossStreak: number;
  multiplier: number; // Usually 2
}

export interface PyramidInput {
  entryPrice: number;
  initialSize: number;
  priceGapPercent: number; // Add when price rises X%
  sizeMultiplier: number; // e.g. 0.5x previous size
  maxAdds: number;
}

export interface GridInput {
  lowerPrice: number;
  upperPrice: number;
  grids: number;
  totalInvestment: number;
}

export interface VAInput {
  targetGrowthPerPeriod: number; // Expected growth $ per month
  currentPeriod: number; // Month 1, 2, 3...
  currentPortfolioValue: number;
}

// Account & Currency Types
export type Currency = 'TWD' | 'USD' | 'USDT';
export type AccountType = 'CASH' | 'BANK' | 'BROKERAGE' | 'EXCHANGE';

export interface Account {
  id: string;
  name: string;           // "台新銀行", "Firstrade", "國泰複委託"
  type: AccountType;
  currency: Currency;
  balance: number;        // 當前餘額（購買力）
  isDefault?: boolean;    // 記帳時的預設帳戶
  isSub?: boolean;        // 是否為複委託帳戶
  icon?: string;
}

// Investment Scope (Progressive Disclosure)
export type InvestmentScope = 'TW' | 'US' | 'CRYPTO';

export interface UserPreferences {
  enableTWStock: boolean;   // 台股
  enableUSStock: boolean;   // 美股
  enableCrypto: boolean;    // 加密貨幣
  investmentScope: InvestmentScope[];
}

// Ledger (Bookkeeping) Types
export type TransactionType = 'income' | 'expense' | 'transfer' | 'invest';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  
  // 資金來源
  accountId: string;
  // 如果是轉帳，需要目標帳戶
  toAccountId?: string;
}

// Notification Types
export type NotificationType = 'alert' | 'info' | 'success';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: NotificationType;
  read: boolean;
}