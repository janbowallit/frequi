/**
 * Backtest numbers the live bot is compared against on the Dashboard ("Live vs backtest").
 * Keyed by strategy name. Re-run the backtest and update these when the strategy, pairs or
 * slots change:
 *   freqtrade backtesting -c user_data/config_bitpin.json --strategy BitpinBreakout \
 *     --timerange 20250701-20261026 --datadir user_data/data/bitpin --dry-run-wallet 100
 */
export interface StrategyReference {
  /** What the backtest covered, in plain words */
  source: string;
  days: number;
  trades: number;
  /** Share of trades that made money */
  winRate: number;
  /** Range of the win rate over any 20 trades in a row (10th to 90th percentile) */
  winRateRange: [number, number];
  /** Mean and median profit per trade, as ratios */
  avgProfit: number;
  medianProfit: number;
  bestTrade: number;
  avgHoldHours: number;
  /** Longest stretch without any open trade */
  longestWaitDays: number;
  /** Share of weeks without a single new trade */
  quietWeekShare: number;
  maxLossStreak: number;
  maxDrawdown: number;
  /** How long the biggest drop took to recover */
  drawdownDays: number;
  totalProfit: number;
}

export const STRATEGY_REFERENCE: Record<string, StrategyReference> = {
  BitpinBreakout: {
    source: 'Bitpin data, Jul 2025 to Oct 2026, same 7 pairs and 3 slots',
    days: 482,
    trades: 124,
    winRate: 0.274,
    winRateRange: [0.2, 0.4],
    avgProfit: 0.0092,
    medianProfit: -0.0214,
    bestTrade: 0.795,
    avgHoldHours: 75.6,
    longestWaitDays: 66.7,
    quietWeekShare: 30 / 69,
    maxLossStreak: 16,
    maxDrawdown: 0.2545,
    drawdownDays: 309,
    totalProfit: 0.2323,
  },
};
