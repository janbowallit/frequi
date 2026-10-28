import humanizeDuration from 'humanize-duration';
import { BotStates } from '@/types';
import type { PairHistory } from '@/types';

/**
 * How close every whitelisted pair is to an entry, and the earliest time the next trade can
 * start. Reads per-condition columns a strategy publishes in its dataframe:
 *   entry_check__<name>   1 if the condition holds on the latest closed candle (required)
 *   entry_gap__<name>     % price move still needed (optional)
 *   entry_target__<name>  price level to reach (optional)
 *   entry_at__<name>      epoch ms of the next re-check, when not every candle (optional)
 *
 * Shared: the status strip and the Next entry panel read the same data (one fetch per minute).
 */

export interface EntryCondition {
  key: string;
  label: string;
  met: boolean;
  gap: number | null;
  target: number | null;
  at: number | null;
}

export interface PairReadiness {
  pair: string;
  conditions: EntryCondition[];
  signal: boolean;
  inTrade: boolean;
  candleTs: number;
}

/** waiting = brass, ready = profit green, blocked = bot can't enter (paused, slots full) */
export type EntryTone = 'ready' | 'waiting' | 'blocked';

const PREFIX = 'entry_check__';
const REFRESH_MS = 60_000;
const ACRONYMS = new Set(['btc', 'eth', 'ema', 'sma', 'rsi', 'macd', 'adx', 'atr', 'bb', 'vwap']);

function label(key: string): string {
  const words = key.split('_').map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w));
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sameValue(a: number | null, b: number | null) {
  return a === b || (a !== null && b !== null && Math.abs(a - b) < 1e-9);
}

export function fmtGap(gap: number): string {
  return `${gap > 0 ? '+' : ''}${gap.toFixed(gap !== 0 && Math.abs(gap) < 1 ? 2 : 1)}%`;
}

export function fmtEntryPrice(value: number): string {
  return Number(value.toPrecision(5)).toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export function needText(c: EntryCondition): string {
  if (c.gap === null) return 'not on the latest candle';
  const target = c.target !== null ? ` (to ${fmtEntryPrice(c.target)})` : '';
  return c.gap > 0 ? `needs ${fmtGap(c.gap)}${target}` : `at the level${target}`;
}

export function unmetConditions(r: PairReadiness) {
  return r.conditions.filter((c) => !c.met);
}

export function durationText(ms: number): string {
  return humanizeDuration(Math.max(ms, 0), { largest: 2, round: true, units: ['d', 'h', 'm'] });
}

function useNextEntryState() {
  const botStore = useBotStore();
  const now = useNow({ interval: 30_000 });

  const results = ref<PairReadiness[]>([]);
  const failedPairs = ref<string[]>([]);
  const loading = ref(false);
  const loaded = ref(false);

  const bot = computed(() => botStore.activeBotorUndefined);
  const whitelist = computed(() => bot.value?.whitelist ?? []);
  const timeframe = computed(() => bot.value?.timeframe ?? '');
  const timeframeMs = computed(() => (bot.value?.botState?.timeframe_min ?? 0) * 60_000);

  function parse(pair: string, analysis: PairHistory): PairReadiness | null {
    const lastRow = analysis.data[analysis.data.length - 1] as unknown[] | undefined;
    if (!lastRow) return null;
    const row = Object.fromEntries(analysis.columns.map((col, i) => [col, lastRow[i]]));
    const conditions = analysis.columns
      .filter((col) => col.startsWith(PREFIX))
      .map((col) => {
        const key = col.slice(PREFIX.length);
        return {
          key,
          label: label(key),
          met: row[col] === 1,
          gap: num(row[`entry_gap__${key}`]),
          target: num(row[`entry_target__${key}`]),
          at: num(row[`entry_at__${key}`]),
        };
      });
    return {
      pair,
      conditions,
      signal: row.enter_long === 1 && row.exit_long !== 1,
      inTrade: bot.value?.openTrades.some((t) => t.pair === pair) ?? false,
      candleTs: row.__date_ts as number,
    };
  }

  async function refresh() {
    const activeBot = bot.value;
    if (!activeBot?.isBotOnline || !timeframe.value || whitelist.value.length === 0) return;
    loading.value = true;
    const pairs = [...whitelist.value];
    // Two rows are enough - only the latest closed candle matters
    const settled = await Promise.allSettled(
      pairs.map((pair) => activeBot.getPairAnalysis(pair, timeframe.value, 2)),
    );
    const next: PairReadiness[] = [];
    const failed: string[] = [];
    settled.forEach((res, i) => {
      const parsed = res.status === 'fulfilled' ? parse(pairs[i]!, res.value) : null;
      if (parsed) next.push(parsed);
      else failed.push(pairs[i]!);
    });
    results.value = next;
    failedPairs.value = failed;
    loading.value = false;
    loaded.value = true;
  }

  watch([whitelist, timeframe, () => bot.value?.isBotOnline], refresh, { immediate: true });
  useIntervalFn(refresh, REFRESH_MS);

  const supported = computed(() => results.value.some((r) => r.conditions.length > 0));

  /** Conditions with the same state on every pair (e.g. a BTC market filter) are shown once */
  const marketKeys = computed(() => {
    const rows = results.value;
    if (rows.length < 2) return new Set<string>();
    const first = rows[0]!.conditions;
    return new Set(
      first
        .filter((c) =>
          rows.every((r) => {
            const other = r.conditions.find((o) => o.key === c.key);
            return other && other.met === c.met && sameValue(other.gap, c.gap);
          }),
        )
        .map((c) => c.key),
    );
  });

  const marketConditions = computed(() =>
    (results.value[0]?.conditions ?? []).filter((c) => marketKeys.value.has(c.key)),
  );

  /** Missing conditions first, then the total price move still needed */
  function distance(r: PairReadiness) {
    const missing = unmetConditions(r);
    const gapSum = missing.reduce((sum, c) => sum + Math.max(c.gap ?? 0, 0), 0);
    return missing.length * 1000 + gapSum;
  }

  const pairs = computed(() =>
    [...results.value].sort((a, b) => {
      if (a.inTrade !== b.inTrade) return a.inTrade ? 1 : -1;
      return distance(a) - distance(b);
    }),
  );
  const candidates = computed(() => pairs.value.filter((r) => !r.inTrade));

  const latestCandleTs = computed(() => Math.max(0, ...results.value.map((r) => r.candleTs || 0)));
  /** The bot checks entries again when the next candle closes */
  const nextCandleClose = computed(() =>
    latestCandleTs.value ? latestCandleTs.value + 2 * timeframeMs.value : null,
  );

  /** Unmet market conditions that only get re-checked at a set time (e.g. a daily close) */
  const blockers = computed(() =>
    marketConditions.value.filter((c) => !c.met && (c.gap !== null || c.at !== null)),
  );

  const earliest = computed<number | null>(() => {
    const times = blockers.value.map((c) => c.at).filter((t): t is number => t !== null);
    const base = nextCandleClose.value;
    if (times.length) return Math.max(...times, base ?? 0);
    return base;
  });

  const state = computed(() => bot.value?.botState);
  const slotsFull = computed(() => {
    const max = state.value?.max_open_trades ?? -1;
    return max >= 0 && (bot.value?.openTradeCount ?? 0) >= max;
  });

  const verdict = computed<{ title: string; detail: string; tone: EntryTone }>(() => {
    const st = state.value;
    if (st && st.state !== BotStates.RUNNING) {
      return {
        title: st.state === BotStates.PAUSED ? 'New entries are paused' : `Bot is ${st.state}`,
        detail: 'No new trades start until the bot is running.',
        tone: 'blocked',
      };
    }
    if (slotsFull.value) {
      return {
        title: 'All trade slots in use',
        detail: `${bot.value?.openTradeCount} of ${st?.max_open_trades} slots are taken. The next trade starts after one closes.`,
        tone: 'blocked',
      };
    }
    const ready = candidates.value.filter((r) => r.signal);
    if (ready.length) {
      return {
        title: `Entry signal on ${ready.map((r) => r.pair).join(', ')}`,
        detail: 'Every condition holds on the latest candle. The bot should open a trade now.',
        tone: 'ready',
      };
    }
    if (blockers.value.length) {
      const what = blockers.value.map((c) => `${c.label} ${needText(c)}`).join(', ');
      return {
        title: `Waiting for ${blockers.value.map((c) => c.label).join(' and ')}`,
        detail: `Blocks every pair: ${what}.`,
        tone: 'waiting',
      };
    }
    const closest = candidates.value[0];
    if (!closest) {
      return {
        title: 'No free pair',
        detail: 'Every pair already has an open trade.',
        tone: 'blocked',
      };
    }
    const missing = unmetConditions(closest);
    return {
      title: `Closest: ${closest.pair}`,
      detail: `${missing.length} condition${missing.length === 1 ? '' : 's'} left: ${missing
        .map((c) => `${c.label} ${needText(c)}`)
        .join(', ')}.`,
      tone: 'waiting',
    };
  });

  const showEarliest = computed(
    () => !slotsFull.value && verdict.value.tone === 'waiting' && earliest.value !== null,
  );

  function fmtTime(ts: number): string {
    const d = new Date(ts);
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const sameDay = d.toDateString() === now.value.toDateString();
    return sameDay ? time : `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${time}`;
  }

  /** "in 7 hours, 31 minutes" / "now" */
  function untilText(ts: number): string {
    return ts > now.value.getTime() ? `in ${durationText(ts - now.value.getTime())}` : 'now';
  }

  return {
    now,
    loading,
    loaded,
    failedPairs,
    whitelist,
    timeframe,
    supported,
    marketKeys,
    marketConditions,
    pairs,
    latestCandleTs,
    earliest,
    verdict,
    showEarliest,
    fmtTime,
    untilText,
    refresh,
  };
}

export const useNextEntry = createSharedComposable(useNextEntryState);
