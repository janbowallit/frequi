<script setup lang="ts">
import { fmtGap } from '@/composables/useNextEntry';
import { durationText } from '@/composables/useNextEntry';

/**
 * Is the live bot behaving like its backtest? Compares live stats from /profit with the
 * reference numbers in utils/strategyReference.ts. Hidden for strategies without a reference.
 */
type Status = 'early' | 'ok' | 'better' | 'watch' | 'worse';

interface Row {
  label: string;
  live: string;
  backtest: string;
  note: string;
  status: Status;
}

const botStore = useBotStore();
const now = useNow({ interval: 60_000 });

const bot = computed(() => botStore.activeBotorUndefined);
const reference = computed(() => STRATEGY_REFERENCE[bot.value?.botState?.strategy ?? '']);
const profit = computed(() => bot.value?.profit);

/** Enough closed trades for averages to mean something */
const MIN_TRADES = 10;
const SETTLED_TRADES = 20;

const since = computed(() => profit.value?.bot_start_timestamp ?? null);
const elapsedDays = computed(() =>
  since.value ? (now.value.getTime() - since.value) / 86_400_000 : 0,
);
const closed = computed(() => profit.value?.closed_trade_count ?? 0);

function pct(ratio: number, decimals = 1) {
  return `${(ratio * 100).toFixed(decimals)}%`;
}

function signedPct(ratio: number) {
  return fmtGap(ratio * 100);
}

/** freqtrade's "1 day, 3:37:00" / "3:37:00" */
function durationHours(text: string | undefined) {
  const m = text?.match(/(?:(\d+) days?, )?(\d+):(\d+):(\d+)/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 24 + Number(m[2]) + Number(m[3]) / 60;
}

function hoursText(hours: number) {
  return durationText(hours * 3_600_000);
}

/** Losing trades in a row: the current run and the longest so far */
const lossStreaks = computed(() => {
  const trades = [...(bot.value?.closedTrades ?? [])].reverse(); // oldest first
  let run = 0;
  let longest = 0;
  for (const t of trades) {
    run = (t.profit_ratio ?? 0) <= 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { current: run, longest };
});

const rows = computed<Row[]>(() => {
  const ref = reference.value;
  const p = profit.value;
  if (!ref || !p) return [];
  const perDay = ref.trades / ref.days;
  const tradeCount = p.trade_count ?? 0;
  const expected = perDay * elapsedDays.value;

  const tradesRow: Row = {
    label: 'Trades',
    live: `${tradeCount} in ${durationText(elapsedDays.value * 86_400_000)}`,
    backtest: `${(perDay * 7).toFixed(1)} a week`,
    note: `${expected < 1 ? 'Less than one' : `About ${Math.round(expected)}`} expected by now. ${pct(ref.quietWeekShare, 0)} of backtest weeks had no new trade, and the longest wait was ${Math.round(ref.longestWaitDays)} days.`,
    status:
      tradeCount === 0 && elapsedDays.value > ref.longestWaitDays
        ? 'worse'
        : tradeCount >= 6 && tradeCount > expected * 3
          ? 'watch'
          : 'ok',
  };

  const winRate = p.winrate ?? (closed.value ? p.winning_trades / closed.value : 0);
  const [lowWin, highWin] = ref.winRateRange;
  const winRow: Row = {
    label: 'Winning trades',
    live: closed.value ? pct(winRate, 0) : '-',
    backtest: pct(ref.winRate, 0),
    note: `Over any 20 trades the backtest won between ${pct(lowWin, 0)} and ${pct(highWin, 0)}.`,
    status:
      closed.value < MIN_TRADES
        ? 'early'
        : winRate > highWin
          ? 'better'
          : winRate >= lowWin
            ? 'ok'
            : closed.value >= SETTLED_TRADES
              ? 'worse'
              : 'watch',
  };

  const avg = p.profit_closed_ratio_mean ?? 0;
  const avgRow: Row = {
    label: 'Average trade',
    live: closed.value ? signedPct(avg) : '-',
    backtest: signedPct(ref.avgProfit),
    note: `The typical backtest trade lost ${pct(Math.abs(ref.medianProfit))}. A few big winners (best ${signedPct(ref.bestTrade)}) pulled the average up.`,
    status:
      closed.value < MIN_TRADES
        ? 'early'
        : avg >= ref.avgProfit
          ? 'better'
          : avg >= ref.medianProfit
            ? 'watch'
            : closed.value >= SETTLED_TRADES
              ? 'worse'
              : 'watch',
  };

  const hold = durationHours(p.avg_duration);
  const holdRow: Row = {
    label: 'Time in a trade',
    live: closed.value && hold !== null ? hoursText(hold) : '-',
    backtest: hoursText(ref.avgHoldHours),
    note: 'Winners were held about 6 days on average, losers about 2.',
    status:
      closed.value < 5 || hold === null
        ? 'early'
        : hold / ref.avgHoldHours >= 0.5 && hold / ref.avgHoldHours <= 1.5
          ? 'ok'
          : 'watch',
  };

  const streak = lossStreaks.value;
  const streakRow: Row = {
    label: 'Losses in a row',
    live: closed.value ? `${streak.current} now, ${streak.longest} longest` : '-',
    backtest: `up to ${ref.maxLossStreak}`,
    note: 'Long losing runs are part of this strategy: it loses small and often, and wins big rarely.',
    status:
      closed.value === 0
        ? 'early'
        : streak.longest > ref.maxLossStreak
          ? 'worse'
          : streak.current >= ref.maxLossStreak * 0.75
            ? 'watch'
            : 'ok',
  };

  const drawdown = p.max_drawdown ?? 0;
  const drawdownRow: Row = {
    label: 'Biggest drop',
    live: closed.value ? pct(drawdown) : '-',
    backtest: `up to ${pct(ref.maxDrawdown)}`,
    note: `Measured from the highest balance. The biggest backtest drop took ${Math.round(ref.drawdownDays / 30)} months to recover.`,
    status:
      closed.value === 0
        ? 'early'
        : drawdown > ref.maxDrawdown
          ? 'worse'
          : drawdown > ref.maxDrawdown * 0.75
            ? 'watch'
            : 'ok',
  };

  return [tradesRow, winRow, avgRow, holdRow, streakRow, drawdownRow];
});

const verdict = computed<{ title: string; detail: string; tone: 'ok' | 'watch' | 'bad' }>(() => {
  const ref = reference.value;
  const worse = rows.value.filter((r) => r.status === 'worse');
  if (worse.length) {
    return {
      title: `Worse than the backtest: ${worse.map((r) => r.label.toLowerCase()).join(', ')}`,
      detail:
        "This never happened in the backtest. It's worth checking whether the strategy still fits the market before it keeps trading.",
      tone: 'bad',
    };
  }
  if (closed.value < MIN_TRADES && ref) {
    const weeks = Math.round(SETTLED_TRADES / ((ref.trades / ref.days) * 7));
    return {
      title: 'Too early to judge',
      detail: `${closed.value} closed trade${closed.value === 1 ? '' : 's'} so far. The averages start to mean something after ${MIN_TRADES} to ${SETTLED_TRADES} trades, about ${weeks} weeks at the backtest's pace.`,
      tone: 'ok',
    };
  }
  const watch = rows.value.filter((r) => r.status === 'watch');
  if (watch.length) {
    return {
      title: `Mostly in line. Keep an eye on ${watch.map((r) => r.label.toLowerCase()).join(', ')}`,
      detail: 'Still within what the backtest went through, but on the weak side.',
      tone: 'watch',
    };
  }
  return {
    title: 'In line with the backtest',
    detail: 'The live bot is trading the way the backtest said it would.',
    tone: 'ok',
  };
});

const statusBadge: Record<
  Status,
  { label: string; color: 'neutral' | 'success' | 'warning' | 'error' }
> = {
  early: { label: 'Too early', color: 'neutral' },
  ok: { label: 'In line', color: 'success' },
  better: { label: 'Better', color: 'success' },
  watch: { label: 'Watch', color: 'warning' },
  worse: { label: 'Worse', color: 'error' },
};
</script>

<template>
  <div v-if="reference && profit" class="@container flex flex-col gap-4 p-4 text-left">
    <div
      role="status"
      class="border-s-2 ps-3"
      :class="{
        'border-accented': verdict.tone === 'ok',
        'border-primary': verdict.tone === 'watch',
        'border-(--color-loss)': verdict.tone === 'bad',
      }"
    >
      <p class="text-base font-semibold text-highlighted">{{ verdict.title }}</p>
      <p class="max-w-prose text-sm text-muted">{{ verdict.detail }}</p>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="hidden @lg:table-header-group">
          <tr class="border-b border-default text-left text-[13px] text-muted">
            <th class="py-2 pe-3 font-medium">What</th>
            <th class="py-2 pe-3 font-medium">Live</th>
            <th class="py-2 pe-3 font-medium">Backtest</th>
            <th class="py-2 pe-3 font-medium">Status</th>
            <th class="py-2 font-medium">What's normal</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="row in rows"
            :key="row.label"
            class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-2.5 @lg:table-row"
          >
            <td class="font-medium text-highlighted @lg:py-2.5 @lg:pe-3">{{ row.label }}</td>
            <td class="row-start-2 tabular-nums @lg:py-2.5 @lg:pe-3">
              <span class="text-muted @lg:hidden">Live </span>{{ row.live }}
            </td>
            <td class="row-start-3 tabular-nums text-muted @lg:py-2.5 @lg:pe-3">
              <span class="@lg:hidden">Backtest </span>{{ row.backtest }}
            </td>
            <td class="col-start-2 row-start-1 @lg:py-2.5 @lg:pe-3">
              <UBadge
                :color="statusBadge[row.status].color"
                variant="subtle"
                size="sm"
                :label="statusBadge[row.status].label"
              />
            </td>
            <td class="col-span-2 text-muted @lg:py-2.5">{{ row.note }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="max-w-prose text-xs text-muted">
      Live since {{ since ? timestampms(since) : '-' }}. Backtest: {{ reference.source }},
      {{ reference.trades }} trades, {{ signedPct(reference.totalProfit) }} in total. Past results
      don't guarantee future returns.
    </p>
  </div>
</template>
