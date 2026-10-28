import type { Trade } from '@/types';

/**
 * Where each open trade will be sold: the strategy's exit levels (`exit_target__<name>`, read
 * from the same candles as the Next entry panel) plus the stoploss freqtrade enforces itself.
 */

export interface ExitLine {
  key: string;
  label: string;
  help: string | null;
  price: number;
  /** Price move from the current price to the level, as a ratio (-0.04 = 4% lower) */
  fromNow: number | null;
}

export interface TradeExitPlan {
  trade: Trade;
  current: number | null;
  lines: ExitLine[];
  stop: { price: number; fromNow: number | null; fromEntry: number } | null;
  /** The latest candle already carries an exit signal: the bot sells now */
  exitSignal: boolean;
  /** When the exit lines are checked next (the next candle close) */
  nextCheck: number | null;
}

/** Plain-language text for the exit levels BitpinBreakout publishes */
const KNOWN: Record<string, { label: string; help: string }> = {
  channel_low: {
    label: 'Exit line',
    help: 'Sells when a candle closes below the lowest close of the last 48 hours.',
  },
};

function label(key: string) {
  if (KNOWN[key]) return KNOWN[key].label;
  const text = key.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function move(from: number | null, to: number) {
  return from ? to / from - 1 : null;
}

export function useExitPlan() {
  const botStore = useBotStore();
  const { byPair, timeframeMs, fmtTime, untilText } = useNextEntry();

  const plans = computed<TradeExitPlan[]>(() =>
    (botStore.activeBotorUndefined?.openTrades ?? []).map((trade) => {
      const current = trade.current_rate ?? null;
      const analysis = byPair.value.get(trade.pair);
      const lines = (analysis?.exits ?? []).map((e) => ({
        key: e.key,
        label: label(e.key),
        help: KNOWN[e.key]?.help ?? null,
        price: e.price,
        fromNow: move(current, e.price),
      }));
      return {
        trade,
        current,
        lines,
        stop: trade.stop_loss_abs
          ? {
              price: trade.stop_loss_abs,
              fromNow: move(current, trade.stop_loss_abs),
              fromEntry: trade.stop_loss_abs / trade.open_rate - 1,
            }
          : null,
        exitSignal: analysis?.exitSignal ?? false,
        nextCheck: analysis?.candleTs ? analysis.candleTs + 2 * timeframeMs.value : null,
      };
    }),
  );

  return { plans, fmtTime, untilText };
}
