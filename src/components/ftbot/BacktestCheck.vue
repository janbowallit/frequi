<script setup lang="ts">
import { fmtGap } from '@/composables/useNextEntry';
import { durationText } from '@/composables/useNextEntry';
import { joinList, ltr, t } from '@/i18n';

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
  return ltr(`${(ratio * 100).toFixed(decimals)}%`);
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
    label: t('backtestCheck.trades'),
    live: t('backtestCheck.tradesLive', {
      count: tradeCount,
      duration: durationText(elapsedDays.value * 86_400_000),
    }),
    backtest: t('backtestCheck.perWeek', { n: (perDay * 7).toFixed(1) }),
    note: t('backtestCheck.tradesNote', {
      expected:
        expected < 1
          ? t('backtestCheck.lessThanOne')
          : t('backtestCheck.aboutN', { n: Math.round(expected) }),
      quiet: pct(ref.quietWeekShare, 0),
      days: Math.round(ref.longestWaitDays),
    }),
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
    label: t('backtestCheck.winning'),
    live: closed.value ? pct(winRate, 0) : '-',
    backtest: pct(ref.winRate, 0),
    note: t('backtestCheck.winningNote', { low: pct(lowWin, 0), high: pct(highWin, 0) }),
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
    label: t('backtestCheck.average'),
    live: closed.value ? signedPct(avg) : '-',
    backtest: signedPct(ref.avgProfit),
    note: t('backtestCheck.averageNote', {
      median: pct(Math.abs(ref.medianProfit)),
      best: signedPct(ref.bestTrade),
    }),
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
    label: t('backtestCheck.hold'),
    live: closed.value && hold !== null ? hoursText(hold) : '-',
    backtest: hoursText(ref.avgHoldHours),
    note: t('backtestCheck.holdNote'),
    status:
      closed.value < 5 || hold === null
        ? 'early'
        : hold / ref.avgHoldHours >= 0.5 && hold / ref.avgHoldHours <= 1.5
          ? 'ok'
          : 'watch',
  };

  const streak = lossStreaks.value;
  const streakRow: Row = {
    label: t('backtestCheck.streak'),
    live: closed.value
      ? t('backtestCheck.streakLive', { current: streak.current, longest: streak.longest })
      : '-',
    backtest: t('backtestCheck.upTo', { value: ref.maxLossStreak }),
    note: t('backtestCheck.streakNote'),
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
    label: t('backtestCheck.drawdown'),
    live: closed.value ? pct(drawdown) : '-',
    backtest: t('backtestCheck.upTo', { value: pct(ref.maxDrawdown) }),
    note: t('backtestCheck.drawdownNote', { months: Math.round(ref.drawdownDays / 30) }),
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
      title: t('backtestCheck.worseTitle', {
        what: joinList(worse.map((r) => r.label.toLowerCase())),
      }),
      detail: t('backtestCheck.worseDetail'),
      tone: 'bad',
    };
  }
  if (closed.value < MIN_TRADES && ref) {
    const weeks = Math.round(SETTLED_TRADES / ((ref.trades / ref.days) * 7));
    return {
      title: t('backtestCheck.earlyTitle'),
      detail: t(
        'backtestCheck.earlyDetail',
        { n: closed.value, min: MIN_TRADES, settled: SETTLED_TRADES, weeks },
        closed.value,
      ),
      tone: 'ok',
    };
  }
  const watch = rows.value.filter((r) => r.status === 'watch');
  if (watch.length) {
    return {
      title: t('backtestCheck.watchTitle', {
        what: joinList(watch.map((r) => r.label.toLowerCase())),
      }),
      detail: t('backtestCheck.watchDetail'),
      tone: 'watch',
    };
  }
  return {
    title: t('backtestCheck.okTitle'),
    detail: t('backtestCheck.okDetail'),
    tone: 'ok',
  };
});

const statusBadge = computed<
  Record<Status, { label: string; color: 'neutral' | 'success' | 'warning' | 'error' }>
>(() => ({
  early: { label: t('backtestCheck.statusEarly'), color: 'neutral' },
  ok: { label: t('backtestCheck.statusOk'), color: 'success' },
  better: { label: t('backtestCheck.statusBetter'), color: 'success' },
  watch: { label: t('backtestCheck.statusWatch'), color: 'warning' },
  worse: { label: t('backtestCheck.statusWorse'), color: 'error' },
}));
</script>

<template>
  <div v-if="reference && profit" class="@container flex flex-col gap-4 p-4 text-start">
    <div
      role="status"
      class="border-s-2 ps-3"
      :class="{
        'border-accented': verdict.tone === 'ok',
        'border-primary': verdict.tone === 'watch',
        'border-loss': verdict.tone === 'bad',
      }"
    >
      <p class="text-base font-semibold text-highlighted">{{ verdict.title }}</p>
      <p class="max-w-prose text-sm text-muted">{{ verdict.detail }}</p>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="hidden @lg:table-header-group">
          <tr class="border-b border-default text-start text-[13px] text-muted">
            <th class="py-2 pe-3 font-medium">{{ $t('backtestCheck.what') }}</th>
            <th class="py-2 pe-3 font-medium">{{ $t('backtestCheck.live') }}</th>
            <th class="py-2 pe-3 font-medium">{{ $t('backtestCheck.backtest') }}</th>
            <th class="py-2 pe-3 font-medium">{{ $t('backtestCheck.status') }}</th>
            <th class="py-2 font-medium">{{ $t('backtestCheck.normal') }}</th>
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
              <span class="text-muted @lg:hidden">{{ $t('backtestCheck.live') }} </span
              >{{ row.live }}
            </td>
            <td class="row-start-3 tabular-nums text-muted @lg:py-2.5 @lg:pe-3">
              <span class="@lg:hidden">{{ $t('backtestCheck.backtest') }} </span>{{ row.backtest }}
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
      {{
        $t('backtestCheck.footnote', {
          since: since ? timestampms(since) : '-',
          source: $t(reference.source),
          trades: reference.trades,
          profit: signedPct(reference.totalProfit),
        })
      }}
    </p>
  </div>
</template>
