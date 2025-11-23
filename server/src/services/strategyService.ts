/**
 * Strategy Service - 投資策略計算服務
 * 實作凱利公式、馬丁格爾等策略計算
 */

export interface KellyResult {
  kellyPercentage: number;  // 建議投資比例 (%)
  suggestedAmount: number;  // 建議投資金額 ($)
}

export interface MartingaleResult {
  nextBet: number;          // 下次建議加碼金額
  totalRisk: number;        // 累計風險金額
  recoveryPrice: number;    // 救援價格點位
}

/**
 * 凱利公式計算
 * Kelly % = (p * b - q) / b
 *
 * @param winProbability - 勝率 (0-100)
 * @param odds - 賠率 (例如 2.0 代表 1:1)
 * @param bankroll - 總本金
 */
export function calculateKelly(
  winProbability: number,
  odds: number,
  bankroll: number
): KellyResult {
  // 轉換勝率為小數
  const p = winProbability / 100;
  const q = 1 - p;

  // 淨賠率 (例如 2.0 賠率，淨賠率為 1.0)
  const b = odds - 1;

  // 凱利公式
  let kellyFraction = (p * b - q) / b;

  // 安全係數: 使用半凱利 (Half Kelly) 降低風險
  kellyFraction = kellyFraction * 0.5;

  // 限制範圍: 0-25% (避免過度集中)
  kellyFraction = Math.max(0, Math.min(0.25, kellyFraction));

  const kellyPercentage = kellyFraction * 100;
  const suggestedAmount = bankroll * kellyFraction;

  return {
    kellyPercentage: parseFloat(kellyPercentage.toFixed(2)),
    suggestedAmount: parseFloat(suggestedAmount.toFixed(2))
  };
}

/**
 * 馬丁格爾策略計算
 * 每次虧損後加倍投注，用於攤平成本
 *
 * @param initialBet - 初始投資金額
 * @param lossStreak - 連續虧損次數
 * @param currentPrice - 當前價格
 * @param avgPrice - 平均成本
 * @param multiplier - 倍數 (預設 2)
 */
export function calculateMartingale(
  initialBet: number,
  lossStreak: number,
  currentPrice: number,
  avgPrice: number,
  multiplier: number = 2
): MartingaleResult {
  // 下次建議加碼金額 = 初始投資 * (倍數 ^ 虧損次數)
  const nextBet = initialBet * Math.pow(multiplier, lossStreak);

  // 累計風險 = 所有已投入的資金總和
  let totalRisk = 0;
  for (let i = 0; i <= lossStreak; i++) {
    totalRisk += initialBet * Math.pow(multiplier, i);
  }

  // 救援價格 (Break-even price)
  // 假設已虧損 X%，計算需要漲回多少才能回本
  const lossPercent = ((avgPrice - currentPrice) / avgPrice) * 100;
  const recoveryPrice = avgPrice * (1 - lossPercent / 200); // 保守估計

  return {
    nextBet: parseFloat(nextBet.toFixed(2)),
    totalRisk: parseFloat(totalRisk.toFixed(2)),
    recoveryPrice: parseFloat(recoveryPrice.toFixed(2))
  };
}

/**
 * 計算持倉報酬率
 */
export function calculateReturn(
  avgPrice: number,
  currentPrice: number
): {
  returnAmount: number;
  returnPercent: number;
} {
  const returnAmount = currentPrice - avgPrice;
  const returnPercent = (returnAmount / avgPrice) * 100;

  return {
    returnAmount: parseFloat(returnAmount.toFixed(2)),
    returnPercent: parseFloat(returnPercent.toFixed(2))
  };
}

/**
 * 計算建議賣出價格 (止盈/止損)
 */
export function calculateTargetPrices(
  avgPrice: number,
  takeProfitPercent: number = 20,  // 預設止盈 20%
  stopLossPercent: number = 10     // 預設止損 10%
): {
  takeProfit: number;
  stopLoss: number;
} {
  return {
    takeProfit: parseFloat((avgPrice * (1 + takeProfitPercent / 100)).toFixed(2)),
    stopLoss: parseFloat((avgPrice * (1 - stopLossPercent / 100)).toFixed(2))
  };
}
