<script setup lang="ts">
import { BotStates } from '@/types';
import type { PairHistory } from '@/types';
import { botStateLabel, t } from '@/i18n';

/**
 * Explains why the bot did (not) enter a trade for the selected pair, following the
 * same checks freqtrade runs before opening a trade (see FreqtradeBot.enter_positions).
 */

type CheckStatus = 'pass' | 'fail' | 'warn';

interface Check {
  /** Set on the check the verdict looks for */
  id?: 'noSignal';
  label: string;
  status: CheckStatus;
  detail: string;
}

/** Columns that are not strategy indicators */
const BASE_COLUMNS = new Set([
  'date',
  'open',
  'high',
  'low',
  'close',
  'volume',
  'enter_long',
  'exit_long',
  'enter_short',
  'exit_short',
  'enter_tag',
  'exit_tag',
]);
const TIMELINE_CANDLES = 48;
const REFRESH_MS = 60_000;
// freqtrade's exchange.outdated_offset default
const OUTDATED_OFFSET_MIN = 5;

const botStore = useBotStore();
const now = useNow({ interval: 30_000 });

const analysis = ref<PairHistory | null>(null);
const loading = ref(false);
const error = ref('');
const indicatorFilter = ref('');

const bot = computed(() => botStore.activeBot);
// Like the chart, fall back to the first whitelisted pair when none is selected
const pair = computed({
  get: () => bot.value.selectedPair || bot.value.whitelist[0] || '',
  set: (value: string) => {
    bot.value.selectedPair = value;
  },
});
const timeframe = computed(() => bot.value.timeframe);

async function refresh() {
  if (!pair.value || !timeframe.value) return;
  loading.value = true;
  error.value = '';
  try {
    analysis.value = await bot.value.getPairAnalysis(pair.value, timeframe.value);
  } catch (e) {
    analysis.value = null;
    error.value = t('signals.loadError');
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch([pair, timeframe], refresh, { immediate: true });
useIntervalFn(refresh, REFRESH_MS);

function ago(ms: number): string {
  return humanizeMs(Math.max(ms, 0), { largest: 2, round: true, units: ['d', 'h', 'm'] });
}

/** Candle rows as objects keyed by column name, oldest first */
const rows = computed<Record<string, unknown>[]>(() => {
  const a = analysis.value;
  if (!a?.data?.length) return [];
  return a.data.map((row) =>
    Object.fromEntries(a.columns.map((col, i) => [col, (row as unknown[])[i]])),
  );
});

const latest = computed(() => rows.value[rows.value.length - 1]);
const previous = computed(() => rows.value[rows.value.length - 2]);

function isSet(row: Record<string, unknown> | undefined, col: string) {
  return row?.[col] === 1;
}

const canShort = computed(
  () => bot.value.botState?.trading_mode !== 'spot' && !!bot.value.botState?.short_allowed,
);

/** Signal on the latest closed candle, with freqtrade's conflict rules */
const latestSignal = computed(() => {
  const row = latest.value;
  const enterLong = isSet(row, 'enter_long');
  const exitLong = isSet(row, 'exit_long');
  const enterShort = isSet(row, 'enter_short');
  const exitShort = isSet(row, 'exit_short');
  const long = enterLong && !exitLong && !enterShort;
  const short = canShort.value && enterShort && !exitShort && !enterLong;
  return {
    signal: long ? 'long' : short ? 'short' : null,
    conflict: (enterLong && (exitLong || enterShort)) || (enterShort && (exitShort || enterLong)),
    tag: typeof row?.enter_tag === 'string' && row.enter_tag ? row.enter_tag : null,
  };
});

const latestCandleTs = computed(() => latest.value?.__date_ts as number | undefined);
const timeframeMs = computed(() => (bot.value.botState?.timeframe_min ?? 0) * 60_000);
/** The bot re-evaluates entries when the next candle closes */
const nextCandleCloseMs = computed(() =>
  latestCandleTs.value !== undefined ? latestCandleTs.value + 2 * timeframeMs.value : undefined,
);
const nextCheckText = computed(() => {
  if (nextCandleCloseMs.value === undefined) return '';
  const wait = nextCandleCloseMs.value - now.value.getTime();
  return wait > 0 ? t('signals.nextCloseIn', { time: ago(wait) }) : t('signals.nextClosingNow');
});

const lastEntrySignal = computed(() => {
  for (let i = rows.value.length - 1; i >= 0; i--) {
    const row = rows.value[i]!;
    if (isSet(row, 'enter_long') || (canShort.value && isSet(row, 'enter_short'))) {
      return {
        candlesAgo: rows.value.length - 1 - i,
        ts: row.__date_ts as number,
        tag: typeof row.enter_tag === 'string' ? row.enter_tag : '',
      };
    }
  }
  return null;
});

const timeline = computed(() =>
  rows.value.slice(-TIMELINE_CANDLES).map((row) => {
    const enter = isSet(row, 'enter_long') || isSet(row, 'enter_short');
    const exit = isSet(row, 'exit_long') || isSet(row, 'exit_short');
    return {
      ts: row.__date_ts as number,
      enter,
      exit,
      label: `${timestampms(row.__date_ts as number)}${enter ? t('signals.entrySignalMark') : ''}${exit ? t('signals.exitSignalMark') : ''}`,
    };
  }),
);

const activeLocks = computed(() =>
  bot.value.activeLocks.filter((l) => l.lock_end_timestamp > now.value.getTime()),
);

const checks = computed<Check[]>(() => {
  const state = bot.value.botState;
  const result: Check[] = [];
  if (!state) return result;

  // 1. Bot state - entries only happen while running
  if (state.state === BotStates.RUNNING) {
    result.push({
      label: t('signals.running'),
      status: 'pass',
      detail: t('signals.runningDetail'),
    });
  } else if (state.state === BotStates.PAUSED) {
    result.push({
      label: t('signals.paused'),
      status: 'fail',
      detail: t('signals.pausedDetail'),
    });
  } else {
    result.push({
      label: t('signals.botIs', { state: botStateLabel(state.state) }),
      status: 'fail',
      detail: t('signals.notStartedDetail'),
    });
  }

  // 2. Whitelist
  const inWhitelist = bot.value.whitelist.includes(pair.value);
  result.push({
    label: inWhitelist ? t('signals.inWhitelist') : t('signals.notInWhitelist'),
    status: inWhitelist ? 'pass' : 'fail',
    detail: inWhitelist ? t('signals.inWhitelistDetail') : t('signals.notInWhitelistDetail'),
  });

  // 3. One trade per pair
  const openTrade = bot.value.openTrades.find((t) => t.pair === pair.value);
  result.push({
    label: openTrade ? t('signals.inTrade') : t('signals.noTrade'),
    status: openTrade ? 'fail' : 'pass',
    detail: openTrade
      ? t('signals.inTradeDetail', { id: openTrade.trade_id })
      : t('signals.noTradeDetail'),
  });

  // 4. Free trade slots
  const maxTrades = state.max_open_trades;
  const unlimited = maxTrades < 0;
  const used = bot.value.openTradeCount;
  const hasSlot = unlimited || used < maxTrades;
  result.push({
    label: hasSlot ? t('signals.slotFree') : t('signals.slotsFull'),
    status: hasSlot ? 'pass' : 'fail',
    detail: unlimited
      ? t('signals.unlimited', { used })
      : t('signals.slotsUsed', { used, max: maxTrades }),
  });

  // 5. Locks - global ('*') or for this pair, on both sides or the long side
  const blocking = activeLocks.value.filter(
    (l) =>
      (l.pair === '*' || l.pair === pair.value) &&
      (!l.side || l.side === '*' || l.side === 'long' || canShort.value),
  );
  const longest = blocking.sort((a, b) => b.lock_end_timestamp - a.lock_end_timestamp)[0];
  result.push({
    label: longest
      ? longest.pair === '*'
        ? t('signals.allLocked')
        : t('signals.pairLocked')
      : t('signals.noLocks'),
    status: longest ? 'fail' : 'pass',
    detail: longest
      ? t('signals.lockDetail', {
          until: timestampms(longest.lock_end_timestamp),
          wait: ago(longest.lock_end_timestamp - now.value.getTime()),
          reason: longest.reason || t('signals.noReason'),
        })
      : t('signals.noLocksDetail'),
  });

  // 6. Data freshness (strategy.get_latest_candle)
  if (latestCandleTs.value !== undefined) {
    const maxAgeMs = (state.timeframe_min * 2 + OUTDATED_OFFSET_MIN) * 60_000;
    const age = now.value.getTime() - latestCandleTs.value;
    const fresh = age <= maxAgeMs;
    result.push({
      label: fresh ? t('signals.fresh') : t('signals.outdated'),
      status: fresh ? 'pass' : 'fail',
      detail: fresh
        ? t('signals.freshDetail', { ago: ago(age - timeframeMs.value), next: nextCheckText.value })
        : t('signals.outdatedDetail', { age: ago(age) }),
    });
  }

  // 7. Entry signal on the latest closed candle
  const sig = latestSignal.value;
  if (sig.signal) {
    result.push({
      label: t('signals.entrySignal', {
        side: sig.signal === 'short' ? t('trades.short') : t('trades.long'),
      }),
      status: 'pass',
      detail: sig.tag ? t('signals.tag', { tag: sig.tag }) : t('signals.entrySignalDetail'),
    });
  } else if (sig.conflict) {
    result.push({
      label: t('signals.conflict'),
      status: 'fail',
      detail: t('signals.conflictDetail'),
    });
  } else {
    result.push({
      id: 'noSignal',
      label: t('signals.noSignal'),
      status: 'fail',
      detail: t('signals.noSignalDetail'),
    });
  }

  // 8. Stake - approximation, the bot also applies tradable_balance_ratio and exchange minimums
  const free = bot.value.balance?.currencies?.find(
    (c) => c.currency === state.stake_currency,
  )?.free;
  if (free !== undefined) {
    const fixedStake = Number(state.stake_amount);
    const enough = Number.isNaN(fixedStake) ? free > 0 : free >= fixedStake;
    const freeText = formatPriceCurrency(
      free,
      state.stake_currency,
      state.stake_currency_decimals ?? 3,
    );
    result.push({
      label: enough ? t('signals.balanceOk') : t('signals.balanceLow'),
      status: enough ? 'pass' : 'warn',
      detail: Number.isNaN(fixedStake)
        ? t('signals.balanceUnlimited', { free: freeText })
        : t('signals.balanceStake', { free: freeText, stake: state.stake_amount }),
    });
  }
  return result;
});

const verdict = computed<{ title: string; detail: string; tone: 'success' | 'neutral' | 'error' }>(
  () => {
    const failing = checks.value.filter((c) => c.status === 'fail');
    if (failing.length === 0) {
      return {
        title: t('signals.ready'),
        detail: t('signals.readyDetail'),
        tone: 'success',
      };
    }
    const onlySignal = failing.length === 1 && failing[0]!.id === 'noSignal';
    if (onlySignal) {
      return {
        title: t('signals.waiting'),
        detail: t('signals.waitingDetail', { next: nextCheckText.value }),
        tone: 'neutral',
      };
    }
    const blockers = failing.filter((c) => c.id !== 'noSignal');
    return {
      title: t('signals.blocked', { what: blockers[0]!.label.toLowerCase() }),
      detail: blockers[0]!.detail,
      tone: 'error',
    };
  },
);

const indicators = computed(() => {
  const a = analysis.value;
  if (!a || !latest.value) return [];
  const term = indicatorFilter.value.trim().toLowerCase();
  return a.columns
    .filter((c) => !BASE_COLUMNS.has(c) && !c.startsWith('_'))
    .filter((c) => !term || c.toLowerCase().includes(term))
    .map((c) => {
      const value = latest.value![c];
      const prev = previous.value?.[c];
      const change =
        typeof value === 'number' && typeof prev === 'number' && value !== prev
          ? Math.sign(value - prev)
          : 0;
      return { name: c, value: formatValue(value), change };
    });
});

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '–';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return value.toLocaleString();
    return Number(value.toPrecision(6)).toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return timestampms(new Date(value));
  }
  return String(value);
}

const statusIcon: Record<CheckStatus, string> = {
  pass: 'lucide:circle-check',
  fail: 'lucide:circle-x',
  warn: 'lucide:circle-alert',
};
const statusColor: Record<CheckStatus, string> = {
  pass: 'text-success',
  fail: 'text-error',
  warn: 'text-warning',
};
</script>

<template>
  <div class="flex flex-col gap-3 p-3 text-start">
    <div class="flex items-center gap-2">
      <USelect
        v-model="pair"
        :items="botStore.activeBot.whitelist"
        :placeholder="$t('signals.selectPair')"
        :aria-label="$t('signals.pairToInspect')"
        class="min-w-0 flex-1"
      />
      <UButton
        color="neutral"
        variant="outline"
        icon="lucide:refresh-cw"
        :aria-label="$t('signals.recheck')"
        :title="$t('signals.recheck')"
        :loading="loading"
        :disabled="!pair"
        @click="refresh"
      />
    </div>

    <EmptyState
      v-if="!pair"
      :title="$t('signals.pickPair')"
      :description="$t('signals.pickPairHelp')"
      icon="lucide:radar"
    />
    <UAlert v-else-if="error" color="error" icon="lucide:circle-alert" :title="error" />
    <div v-else-if="!analysis && loading" class="flex flex-col gap-2" aria-busy="true">
      <USkeleton class="h-16 w-full" />
      <USkeleton v-for="i in 5" :key="i" class="h-8 w-full" />
    </div>

    <template v-else-if="analysis">
      <!-- Verdict -->
      <div
        role="status"
        class="rounded-lg border p-3"
        :class="{
          'border-success/40 bg-success/10': verdict.tone === 'success',
          'border-default bg-elevated/50': verdict.tone === 'neutral',
          'border-error/40 bg-error/10': verdict.tone === 'error',
        }"
      >
        <p
          class="font-semibold"
          :class="{
            'text-success': verdict.tone === 'success',
            'text-highlighted': verdict.tone === 'neutral',
            'text-error': verdict.tone === 'error',
          }"
        >
          {{ verdict.title }}
        </p>
        <p class="text-sm text-muted">{{ verdict.detail }}</p>
      </div>

      <!-- Checks -->
      <ul class="flex flex-col divide-y divide-default rounded-lg border border-default">
        <li v-for="check in checks" :key="check.label" class="flex gap-2.5 px-3 py-2">
          <UIcon
            :name="statusIcon[check.status]"
            class="mt-0.5 size-4 shrink-0"
            :class="statusColor[check.status]"
            :aria-label="$t(`signals.${check.status}`)"
          />
          <div class="flex flex-col gap-1 min-w-0">
            <p class="text-sm font-medium text-highlighted">{{ check.label }}</p>
            <p class="text-sm text-muted">{{ check.detail }}</p>
          </div>
        </li>
      </ul>

      <!-- Signal history -->
      <section aria-labelledby="signal-history-heading" class="flex flex-col gap-2">
        <h3 id="signal-history-heading" class="text-sm font-medium text-muted">
          {{ $t('signals.history') }}
        </h3>
        <div
          class="flex h-6 items-stretch gap-px"
          role="img"
          dir="ltr"
          :aria-label="
            $t('signals.historyLabel', {
              n: timeline.length,
              entries: timeline.filter((c) => c.enter).length,
              exits: timeline.filter((c) => c.exit).length,
            })
          "
        >
          <span
            v-for="candle in timeline"
            :key="candle.ts"
            class="flex-1 rounded-[2px]"
            :class="
              candle.enter && candle.exit
                ? 'bg-warning'
                : candle.enter
                  ? 'bg-profit'
                  : candle.exit
                    ? 'bg-loss'
                    : 'bg-elevated'
            "
            :title="candle.label"
          />
        </div>
        <div class="flex justify-between text-xs text-muted" dir="ltr">
          <span>{{ $t('signals.candlesAgo', { n: timeline.length }) }}</span>
          <span class="flex items-center gap-3">
            <span class="flex items-center gap-1"
              ><span class="size-2 rounded-[2px] bg-profit" />{{ $t('signals.entry') }}</span
            >
            <span class="flex items-center gap-1"
              ><span class="size-2 rounded-[2px] bg-loss" />{{ $t('signals.exit') }}</span
            >
          </span>
          <span>{{ $t('signals.latest') }}</span>
        </div>
        <p class="text-sm text-muted">
          <I18nT
            v-if="lastEntrySignal"
            :keypath="lastEntrySignal.tag ? 'signals.lastEntryTag' : 'signals.lastEntry'"
            scope="global"
          >
            <template #when>
              <strong class="text-highlighted">{{
                lastEntrySignal.candlesAgo === 0
                  ? $t('signals.onLatest')
                  : $t(
                      'signals.nCandlesAgo',
                      { n: lastEntrySignal.candlesAgo },
                      lastEntrySignal.candlesAgo,
                    )
              }}</strong>
            </template>
            <template #time>{{ timestampms(lastEntrySignal.ts) }}</template>
            <template #tag>{{ lastEntrySignal.tag }}</template>
          </I18nT>
          <I18nT v-else keypath="signals.noSignalIn" scope="global">
            <template #none>
              <strong class="text-highlighted">{{ $t('signals.noSignal') }}</strong>
            </template>
            <template #n>{{ rows.length }}</template>
            <template #timeframe>{{ timeframe }}</template>
          </I18nT>
        </p>
      </section>

      <!-- Indicators -->
      <BaseCollapsible :title="$t('signals.indicators', { n: indicators.length })">
        <div class="flex flex-col gap-2 p-2">
          <UInput
            v-model="indicatorFilter"
            type="search"
            icon="lucide:search"
            size="sm"
            :placeholder="$t('signals.filterIndicators')"
            :aria-label="$t('signals.filterIndicators')"
          />
          <dl class="divide-y divide-default text-sm">
            <div
              v-for="ind in indicators"
              :key="ind.name"
              class="flex items-baseline justify-between gap-3 py-1.5"
            >
              <dt class="min-w-0 truncate font-mono text-muted" :title="ind.name">
                {{ ind.name }}
              </dt>
              <dd
                class="flex shrink-0 items-center gap-1 font-medium text-highlighted tabular-nums"
              >
                {{ ind.value }}
                <UIcon
                  v-if="ind.change !== 0"
                  :name="ind.change > 0 ? 'lucide:arrow-up' : 'lucide:arrow-down'"
                  class="size-3.5 text-muted"
                  :aria-label="ind.change > 0 ? $t('signals.up') : $t('signals.down')"
                />
              </dd>
            </div>
          </dl>
          <p v-if="indicators.length === 0" class="py-2 text-center text-sm text-muted">
            {{ $t('signals.noIndicators') }}
          </p>
        </div>
      </BaseCollapsible>

      <p class="text-xs text-muted">
        {{ $t('signals.footLatest', { time: latestCandleTs ? timestampms(latestCandleTs) : '–' }) }}
        <template v-if="analysis.last_analyzed_ts">
          {{
            $t('signals.footAnalyzed', {
              ago: ago(now.getTime() - analysis.last_analyzed_ts * 1000),
            })
          }}
        </template>
        <I18nT keypath="signals.footRest" scope="global">
          <template #fn><code>confirm_trade_entry</code></template>
        </I18nT>
      </p>
    </template>
  </div>
</template>
