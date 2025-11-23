
export type Currency = 'TWD' | 'USD';
export type AccountType = 'CASH' | 'BANK' | 'BROKERAGE';

export interface InvestmentScope {
  tw: boolean;     // 台股
  us: boolean;     // 美股/海外
  crypto: boolean; // 加密貨幣
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'Stock' | 'Crypto' | 'Cash' | 'ETF';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency: Currency; // 新增幣別
  change24h: number; // Percentage
  history: number[]; // Simple array for sparklines
}

export interface Account {
  id: string;
  name: string;      // 例如："我的錢包", "台新銀行", "Firstrade"
  type: AccountType;
  currency: Currency;
  balance: number;   // 當前餘額
  isDefault?: boolean;
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

// Ledger (Bookkeeping) Types
export type TransactionType = 'income' | 'expense' | 'transfer' | 'invest';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  category: string;
  accountId: string; // Source of fund
  toAccountId?: string; // For transfer
  note: string;
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
