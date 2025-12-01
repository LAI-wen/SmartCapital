/**
 * Profit/Loss Calculation Utilities - 損益計算工具
 */

export interface ProfitLossResult {
  profit: number;           // 絕對損益金額
  profitPercent: number;    // 損益百分比
  cost: number;             // 總成本
  currentValue: number;     // 當前市值
}

/**
 * 計算損益
 * @param avgPrice - 平均買入價格
 * @param quantity - 持有數量
 * @param currentPrice - 當前價格
 */
export function calculateProfitLoss(
  avgPrice: number,
  quantity: number,
  currentPrice: number
): ProfitLossResult {
  const cost = avgPrice * quantity;
  const currentValue = currentPrice * quantity;
  const profit = currentValue - cost;
  const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;

  return {
    profit,
    profitPercent,
    cost,
    currentValue,
  };
}

/**
 * 判斷是否為獲利
 */
export function isProfitable(profitPercent: number): boolean {
  return profitPercent > 0;
}

/**
 * 判斷是否為虧損
 */
export function isLoss(profitPercent: number): boolean {
  return profitPercent < 0;
}

/**
 * 取得損益狀態
 */
export function getProfitLossStatus(
  profitPercent: number
): 'profit' | 'loss' | 'neutral' {
  if (profitPercent > 0) return 'profit';
  if (profitPercent < 0) return 'loss';
  return 'neutral';
}

/**
 * 取得損益顏色（Tailwind class）
 */
export function getProfitLossColor(profitPercent: number): string {
  if (profitPercent > 0) return 'text-morandi-sage'; // 綠色
  if (profitPercent < 0) return 'text-morandi-clay'; // 紅色
  return 'text-ink-600'; // 中性
}

/**
 * 取得損益背景顏色（Tailwind class）
 */
export function getProfitLossBgColor(profitPercent: number): string {
  if (profitPercent > 0) return 'bg-morandi-sage/10';
  if (profitPercent < 0) return 'bg-morandi-clay/10';
  return 'bg-stone-100';
}

/**
 * 計算投資報酬率 (ROI)
 */
export function calculateROI(
  initialInvestment: number,
  currentValue: number
): number {
  if (initialInvestment === 0) return 0;
  return ((currentValue - initialInvestment) / initialInvestment) * 100;
}

/**
 * 計算年化報酬率 (Annualized Return)
 */
export function calculateAnnualizedReturn(
  initialInvestment: number,
  currentValue: number,
  years: number
): number {
  if (initialInvestment === 0 || years === 0) return 0;
  return (Math.pow(currentValue / initialInvestment, 1 / years) - 1) * 100;
}
