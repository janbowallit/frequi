<script setup lang="ts">
import humanizeDuration from 'humanize-duration';
import { BotStates } from '@/types';
import type { PairHistory } from '@/types';

/**
 * Shows how close every whitelisted pair is to an entry, and the earliest time the next
 * trade can start. Reads per-condition columns a strategy publishes in its dataframe:
 *   entry_check__<name>   1 if the condition holds on the latest closed candle (required)
 *   entry_gap__<name>     % price move still needed (optional)
 *   entry_target__<name>  price level to reach (optional)
 *   entry_at__<name>      epoch ms of the next re-check, when not every candle (optional)
 */

interface Condition {
  key: string;
  label: string;
  met: boolean;
  gap: number | null;
  target: number | null;
  at: number | null;
}

interface PairReadiness {
  pair: string;
  conditions: Condition[];
  signal: boolean;
  inTrade: boolean;
  candleTs: number;
}

const PREFIX = 'entry_check__';
const REFRESH_MS = 60_000;
const ACRONYMS = new Set(['btc', 'eth', 'ema', 'sma', 'rsi', 'macd', 'adx', 'atr', 'bb', 'vwap']);

const botStore = useBotStore();
const route = useRoute();
const router = useRouter();
const now = useNow({ interval: 30_000 });

const results = ref<PairReadiness[]>([]);
const failedPairs = ref<string[]>([]);
const loading = ref(false);
const loaded = ref(false);

const bot = computed(() => botStore.activeBot);
const whitelist = computed(() => bot.value.whitelist);
const timeframe = computed(() => bot.value.timeframe);
const timeframeMs = computed(() => (bot.value.botState?.timeframe_min ?? 0) * 60_000);

function label(key: string): string {
  const words = key.split('_').map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w));
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

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
    inTrade: bot.value.openTrades.some((t) => t.pair === pair),
    candleTs: row.__date_ts as number,
  };
}

async function refresh() {
  if (!timeframe.value || whitelist.value.length === 0) return;
  loading.value = true;
  const pairs = [...whitelist.value];
  // Two rows are enough - only the latest closed candle matters
  const settled = await Promise.allSettled(
    pairs.map((pair) => bot.value.getPairAnalysis(pair, timeframe.value, 2)),
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

watch([whitelist, timeframe], refresh, { immediate: true });
useIntervalFn(refresh, REFRESH_MS);

const supported = computed(() => results.value.some((r) => r.conditions.length > 0));

function sameValue(a: number | null, b: number | null) {
  return a === b || (a !== null && b !== null && Math.abs(a - b) < 1e-9);
}

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

function unmet(r: PairReadiness) {
  return r.conditions.filter((c) => !c.met);
}

/** Missing conditions first, then the total price move still needed */
function distance(r: PairReadiness) {
  const missing = unmet(r);
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

const state = computed(() => bot.value.botState);
const slotsFull = computed(() => {
  const max = state.value?.max_open_trades ?? -1;
  return max >= 0 && bot.value.openTradeCount >= max;
});

function ago(ms: number): string {
  return humanizeDuration(Math.max(ms, 0), { largest: 2, round: true, units: ['d', 'h', 'm'] });
}

function fmtGap(gap: number): string {
  return `${gap > 0 ? '+' : ''}${gap.toFixed(gap !== 0 && Math.abs(gap) < 1 ? 2 : 1)}%`;
}

function fmtPrice(value: number): string {
  return Number(value.toPrecision(5)).toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === now.value.toDateString();
  return sameDay ? time : `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${time}`;
}

function needText(c: Condition): string {
  if (c.gap === null) return 'not on the latest candle';
  const target = c.target !== null ? ` (to ${fmtPrice(c.target)})` : '';
  return c.gap > 0 ? `needs ${fmtGap(c.gap)}${target}` : `at the level${target}`;
}

const verdict = computed<{
  title: string;
  detail: string;
  tone: 'success' | 'neutral' | 'warning';
}>(() => {
  const st = state.value;
  if (st && st.state !== BotStates.RUNNING) {
    return {
      title: `Bot is ${st.state}`,
      detail: 'No new trades start until the bot is running.',
      tone: 'warning',
    };
  }
  if (slotsFull.value) {
    return {
      title: 'All trade slots in use',
      detail: `${bot.value.openTradeCount} of ${st?.max_open_trades} slots are taken - the next trade starts after one closes.`,
      tone: 'warning',
    };
  }
  const ready = candidates.value.filter((r) => r.signal);
  if (ready.length) {
    return {
      title: `Entry signal on ${ready.map((r) => r.pair).join(', ')}`,
      detail: 'Every condition holds on the latest candle - the bot should open a trade now.',
      tone: 'success',
    };
  }
  if (blockers.value.length) {
    const what = blockers.value.map((c) => `${c.label} ${needText(c)}`).join(', ');
    return {
      title: `Waiting for ${blockers.value.map((c) => c.label).join(' and ')}`,
      detail: `Blocks every pair: ${what}.`,
      tone: 'neutral',
    };
  }
  const closest = candidates.value[0];
  if (!closest) {
    return {
      title: 'No free pair',
      detail: 'Every pair already has an open trade.',
      tone: 'neutral',
    };
  }
  const missing = unmet(closest);
  return {
    title: `Closest: ${closest.pair}`,
    detail: `${missing.length} condition${missing.length === 1 ? '' : 's'} left - ${missing
      .map((c) => `${c.label} ${needText(c)}`)
      .join(', ')}.`,
    tone: 'neutral',
  };
});

const showEarliest = computed(
  () => !slotsFull.value && verdict.value.tone === 'neutral' && earliest.value !== null,
);

function selectPair(pair: string) {
  bot.value.selectedPair = pair;
  if (route.path !== '/trade') router.push('/trade');
}
</script>

<template>
  <div class="flex flex-col gap-3 p-3 text-left @container">
    <div v-if="!loaded" class="flex flex-col gap-2" aria-busy="true">
      <USkeleton class="h-16 w-full" />
      <USkeleton v-for="i in 4" :key="i" class="h-9 w-full" />
    </div>

    <EmptyState
      v-else-if="whitelist.length === 0"
      title="No pairs"
      description="The bot has no whitelisted pairs to check."
      icon="mdi:format-list-bulleted"
    />

    <EmptyState
      v-else-if="!supported"
      title="Strategy does not publish entry conditions"
      icon="mdi:radar"
    >
      <p class="max-w-sm text-sm text-muted">
        Add <code>entry_check__&lt;name&gt;</code> columns (and optionally <code>entry_gap__</code>,
        <code>entry_target__</code>, <code>entry_at__</code>) in <code>populate_indicators</code> to
        see how close each pair is to a trade.
      </p>
    </EmptyState>

    <template v-else>
      <!-- Verdict -->
      <div
        role="status"
        class="flex flex-col gap-2 rounded-lg border p-3 @md:flex-row @md:items-start @md:justify-between"
        :class="{
          'border-success/40 bg-success/10': verdict.tone === 'success',
          'border-default bg-elevated/50': verdict.tone === 'neutral',
          'border-warning/40 bg-warning/10': verdict.tone === 'warning',
        }"
      >
        <div class="min-w-0">
          <p
            class="font-semibold"
            :class="{
              'text-success': verdict.tone === 'success',
              'text-highlighted': verdict.tone === 'neutral',
              'text-warning': verdict.tone === 'warning',
            }"
          >
            {{ verdict.title }}
          </p>
          <p class="text-sm text-muted">{{ verdict.detail }}</p>
        </div>
        <div v-if="showEarliest && earliest" class="shrink-0 @md:text-right">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">
            Earliest possible entry
          </p>
          <p class="font-semibold text-highlighted tabular-nums">
            {{ fmtTime(earliest) }}
            <span class="text-sm font-normal text-muted">
              {{ earliest > now.getTime() ? `in ${ago(earliest - now.getTime())}` : 'now' }}
            </span>
          </p>
        </div>
      </div>

      <!-- Conditions shared by every pair -->
      <section
        v-if="marketConditions.length"
        aria-labelledby="next-entry-market"
        class="flex flex-col gap-1.5"
      >
        <h3 id="next-entry-market" class="text-xs font-semibold uppercase tracking-wide text-muted">
          Market
        </h3>
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="c in marketConditions"
            :key="c.key"
            :color="c.met ? 'success' : 'error'"
            variant="subtle"
            :icon="c.met ? 'mdi:check' : 'mdi:close'"
            :label="c.met ? c.label : `${c.label} · ${needText(c)}`"
            :title="c.at && !c.met ? `Re-checked at ${fmtTime(c.at)}` : undefined"
          />
        </div>
      </section>

      <!-- Per pair -->
      <section aria-labelledby="next-entry-pairs" class="flex flex-col gap-1.5">
        <h3 id="next-entry-pairs" class="text-xs font-semibold uppercase tracking-wide text-muted">
          Pairs, closest first
        </h3>
        <ul class="flex flex-col divide-y divide-default rounded-lg border border-default">
          <li
            v-for="r in pairs"
            :key="r.pair"
            class="flex flex-col gap-1.5 px-3 py-2 @md:flex-row @md:items-center"
          >
            <div class="flex shrink-0 items-center gap-2 @md:w-44">
              <UButton
                variant="link"
                color="neutral"
                class="p-0 font-medium text-highlighted"
                :label="r.pair"
                :title="`Show ${r.pair} on the trade chart`"
                @click="selectPair(r.pair)"
              />
              <UBadge
                v-if="r.inTrade"
                color="primary"
                variant="subtle"
                size="sm"
                label="In trade"
              />
              <UBadge
                v-else-if="r.signal"
                color="success"
                variant="subtle"
                size="sm"
                label="Signal"
              />
              <span v-else class="text-xs text-muted tabular-nums">
                {{ r.conditions.filter((c) => c.met).length }}/{{ r.conditions.length }} met
              </span>
            </div>
            <div class="flex min-w-0 flex-wrap gap-1.5">
              <UBadge
                v-for="c in r.conditions.filter((c) => !marketKeys.has(c.key))"
                :key="c.key"
                :color="c.met ? 'success' : c.gap === null ? 'neutral' : 'error'"
                variant="subtle"
                size="sm"
                :icon="c.met ? 'mdi:check' : 'mdi:close'"
                :label="c.met || c.gap === null ? c.label : `${c.label} ${fmtGap(c.gap)}`"
                :title="c.met ? `${c.label}: met` : `${c.label}: ${needText(c)}`"
              />
            </div>
          </li>
        </ul>
      </section>

      <UAlert
        v-if="failedPairs.length"
        color="warning"
        variant="subtle"
        icon="mdi:alert-circle-outline"
        :title="`Could not load ${failedPairs.join(', ')}`"
      />

      <p class="text-xs text-muted">
        A trade starts when every condition holds on the same closed {{ timeframe }} candle.
        Percentages are the price move still needed; grey conditions have to happen on that candle
        itself. Updated every minute
        <template v-if="latestCandleTs"> · latest candle {{ timestampms(latestCandleTs) }}</template
        >.
        <UIcon v-if="loading" name="mdi:loading" class="ml-1 size-3 animate-spin align-middle" />
      </p>
    </template>
  </div>
</template>
