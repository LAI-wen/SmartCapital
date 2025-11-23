

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
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  category: string;
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