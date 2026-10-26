<script setup lang="ts">
import humanizeDuration from 'humanize-duration';
import { BotStates } from '@/types';
import type { PairHistory } from '@/types';

/**
 * Explains why the bot did (not) enter a trade for the selected pair, following the
 * same checks freqtrade runs before opening a trade (see FreqtradeBot.enter_positions).
 */

type CheckStatus = 'pass' | 'fail' | 'warn';

interface Check {
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
    error.value = 'Could not load the analyzed candles for this pair.';
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch([pair, timeframe], refresh, { immediate: true });
useIntervalFn(refresh, REFRESH_MS);

function ago(ms: number): string {
  return humanizeDuration(Math.max(ms, 0), { largest: 2, round: true, units: ['d', 'h', 'm'] });
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
  return wait > 0 ? `Next candle closes in ${ago(wait)}.` : 'Next candle is closing now.';
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
      label: `${timestampms(row.__date_ts as number)}${enter ? ' · entry signal' : ''}${exit ? ' · exit signal' : ''}`,
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
    result.push({ label: 'Bot is running', status: 'pass', detail: 'Entries are allowed.' });
  } else if (state.state === BotStates.PAUSED) {
    result.push({
      label: 'Bot is paused',
      status: 'fail',
      detail: 'Open trades are managed, but no new trades are entered. Press Resume.',
    });
  } else {
    result.push({
      label: `Bot is ${state.state}`,
      status: 'fail',
      detail: 'The bot does not trade until it is started.',
    });
  }

  // 2. Whitelist
  const inWhitelist = bot.value.whitelist.includes(pair.value);
  result.push({
    label: inWhitelist ? 'Pair is in the whitelist' : 'Pair is not in the whitelist',
    status: inWhitelist ? 'pass' : 'fail',
    detail: inWhitelist
      ? 'The pairlist includes this pair.'
      : 'The bot only enters pairs from its current pairlist.',
  });

  // 3. One trade per pair
  const openTrade = bot.value.openTrades.find((t) => t.pair === pair.value);
  result.push({
    label: openTrade ? 'Already in a trade' : 'No open trade on this pair',
    status: openTrade ? 'fail' : 'pass',
    detail: openTrade
      ? `Trade #${openTrade.trade_id} is open - freqtrade holds one trade per pair.`
      : 'A new trade can be opened.',
  });

  // 4. Free trade slots
  const maxTrades = state.max_open_trades;
  const unlimited = maxTrades < 0;
  const used = bot.value.openTradeCount;
  const hasSlot = unlimited || used < maxTrades;
  result.push({
    label: hasSlot ? 'Trade slot available' : 'All trade slots in use',
    status: hasSlot ? 'pass' : 'fail',
    detail: unlimited ? `${used} open, no limit.` : `${used} of ${maxTrades} slots in use.`,
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
        ? 'All pairs are locked'
        : 'Pair is locked'
      : 'No locks',
    status: longest ? 'fail' : 'pass',
    detail: longest
      ? `Until ${timestampms(longest.lock_end_timestamp)} (in ${ago(longest.lock_end_timestamp - now.value.getTime())}) - ${longest.reason || 'no reason given'}.`
      : 'No protection or manual lock applies.',
  });

  // 6. Data freshness (strategy.get_latest_candle)
  if (latestCandleTs.value !== undefined) {
    const maxAgeMs = (state.timeframe_min * 2 + OUTDATED_OFFSET_MIN) * 60_000;
    const age = now.value.getTime() - latestCandleTs.value;
    const fresh = age <= maxAgeMs;
    result.push({
      label: fresh ? 'Candle data is up to date' : 'Candle data is outdated',
      status: fresh ? 'pass' : 'fail',
      detail: fresh
        ? `Last candle closed ${ago(age - timeframeMs.value)} ago. ${nextCheckText.value}`
        : `Latest candle is ${ago(age)} old - freqtrade ignores signals on outdated data. Check the exchange connection.`,
    });
  }

  // 7. Entry signal on the latest closed candle
  const sig = latestSignal.value;
  if (sig.signal) {
    result.push({
      label: `Entry signal (${sig.signal})`,
      status: 'pass',
      detail: sig.tag ? `Tag: ${sig.tag}` : 'The strategy signals an entry on the latest candle.',
    });
  } else if (sig.conflict) {
    result.push({
      label: 'Conflicting signals',
      status: 'fail',
      detail: 'Entry and exit are both set on the latest candle - freqtrade ignores the entry.',
    });
  } else {
    result.push({
      label: 'No entry signal',
      status: 'fail',
      detail: "The strategy's entry conditions are not met on the latest closed candle.",
    });
  }

  // 8. Stake - approximation, the bot also applies tradable_balance_ratio and exchange minimums
  const free = bot.value.balance?.currencies?.find(
    (c) => c.currency === state.stake_currency,
  )?.free;
  if (free !== undefined) {
    const fixedStake = Number(state.stake_amount);
    const enough = Number.isNaN(fixedStake) ? free > 0 : free >= fixedStake;
    result.push({
      label: enough ? 'Balance available' : 'Balance may be too low',
      status: enough ? 'pass' : 'warn',
      detail: `${formatPriceCurrency(free, state.stake_currency, state.stake_currency_decimals ?? 3)} free${
        Number.isNaN(fixedStake) ? ' (stake: unlimited)' : `, stake per trade ${state.stake_amount}`
      }.`,
    });
  }
  return result;
});

const verdict = computed<{ title: string; detail: string; tone: 'success' | 'neutral' | 'error' }>(
  () => {
    const failing = checks.value.filter((c) => c.status === 'fail');
    if (failing.length === 0) {
      return {
        title: 'Ready to enter',
        detail: 'Every check passes - the bot should open a trade on its next loop.',
        tone: 'success',
      };
    }
    const onlySignal = failing.length === 1 && failing[0]!.label === 'No entry signal';
    if (onlySignal) {
      return {
        title: 'Waiting for an entry signal',
        detail: `Nothing blocks a trade - the strategy just has not signalled an entry yet. ${nextCheckText.value}`,
        tone: 'neutral',
      };
    }
    const blockers = failing.filter((c) => c.label !== 'No entry signal');
    return {
      title: `Blocked: ${blockers[0]!.label.toLowerCase()}`,
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
  pass: 'mdi:check-circle',
  fail: 'mdi:close-circle',
  warn: 'mdi:alert-circle',
};
const statusColor: Record<CheckStatus, string> = {
  pass: 'text-success',
  fail: 'text-error',
  warn: 'text-warning',
};
</script>

<template>
  <div class="flex flex-col gap-3 p-3 text-left">
    <div class="flex items-center gap-2">
      <USelect
        v-model="pair"
        :items="botStore.activeBot.whitelist"
        placeholder="Select a pair"
        aria-label="Pair to inspect"
        class="min-w-0 flex-1"
      />
      <UButton
        color="neutral"
        variant="outline"
        icon="mdi:refresh"
        aria-label="Re-check"
        title="Re-check"
        :loading="loading"
        :disabled="!pair"
        @click="refresh"
      />
    </div>

    <EmptyState
      v-if="!pair"
      title="Pick a pair"
      description="Choose a pair to see whether the bot can enter it, and why not."
      icon="mdi:radar"
    />
    <UAlert v-else-if="error" color="error" icon="mdi:alert-circle-outline" :title="error" />
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
            :aria-label="check.status"
          />
          <div class="min-w-0">
            <p class="text-sm font-medium text-highlighted">{{ check.label }}</p>
            <p class="text-sm text-muted">{{ check.detail }}</p>
          </div>
        </li>
      </ul>

      <!-- Signal history -->
      <section aria-labelledby="signal-history-heading" class="flex flex-col gap-2">
        <h3
          id="signal-history-heading"
          class="text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Signal history
        </h3>
        <div
          class="flex h-6 items-stretch gap-px"
          role="img"
          :aria-label="`Last ${timeline.length} candles: ${timeline.filter((c) => c.enter).length} entry and ${timeline.filter((c) => c.exit).length} exit signals`"
        >
          <span
            v-for="candle in timeline"
            :key="candle.ts"
            class="flex-1 rounded-[2px]"
            :class="
              candle.enter && candle.exit
                ? 'bg-warning'
                : candle.enter
                  ? 'bg-(--color-profit)'
                  : candle.exit
                    ? 'bg-(--color-loss)'
                    : 'bg-elevated'
            "
            :title="candle.label"
          />
        </div>
        <div class="flex justify-between text-xs text-muted">
          <span>{{ timeline.length }} candles ago</span>
          <span class="flex items-center gap-3">
            <span class="flex items-center gap-1"
              ><span class="size-2 rounded-[2px] bg-(--color-profit)" />Entry</span
            >
            <span class="flex items-center gap-1"
              ><span class="size-2 rounded-[2px] bg-(--color-loss)" />Exit</span
            >
          </span>
          <span>Latest</span>
        </div>
        <p class="text-sm text-muted">
          <template v-if="lastEntrySignal">
            Last entry signal
            <strong class="text-highlighted">{{
              lastEntrySignal.candlesAgo === 0
                ? 'on the latest candle'
                : `${lastEntrySignal.candlesAgo} candle${lastEntrySignal.candlesAgo === 1 ? '' : 's'} ago`
            }}</strong>
            ({{ timestampms(lastEntrySignal.ts)
            }}{{ lastEntrySignal.tag ? `, ${lastEntrySignal.tag}` : '' }}).
          </template>
          <template v-else>
            <strong class="text-highlighted">No entry signal</strong> in the last
            {{ rows.length }} candles ({{ timeframe }}).
          </template>
        </p>
      </section>

      <!-- Indicators -->
      <BaseCollapsible :title="`Indicators on the latest candle (${indicators.length})`">
        <div class="flex flex-col gap-2 p-2">
          <UInput
            v-model="indicatorFilter"
            type="search"
            icon="mdi:magnify"
            size="sm"
            placeholder="Filter indicators"
            aria-label="Filter indicators"
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
                  :name="ind.change > 0 ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                  class="size-3.5 text-muted"
                  :aria-label="
                    ind.change > 0 ? 'up from previous candle' : 'down from previous candle'
                  "
                />
              </dd>
            </div>
          </dl>
          <p v-if="indicators.length === 0" class="py-2 text-center text-sm text-muted">
            No matching indicators.
          </p>
        </div>
      </BaseCollapsible>

      <p class="text-xs text-muted">
        Latest closed candle {{ latestCandleTs ? timestampms(latestCandleTs) : '–' }}
        <template v-if="analysis.last_analyzed_ts">
          · analyzed {{ ago(now.getTime() - analysis.last_analyzed_ts * 1000) }} ago
        </template>
        · rechecks every minute. Exchange minimums and strategy callbacks such as
        <code>confirm_trade_entry</code> can still prevent a trade.
      </p>
    </template>
  </div>
</template>
