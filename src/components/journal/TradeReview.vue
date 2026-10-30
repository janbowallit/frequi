<script setup lang="ts">
/** Review of a closed trade: why it entered and exited, what fees cost, the chart, and notes. */
import { i18n, t } from '@/i18n';
import type { BotSubStore } from '@/stores/ftbotwrapper';
import type { ClosedTrade, EntrySnapshot } from '@/types';
import { feeSplit } from '@/utils/journal';

const props = defineProps<{ trade: ClosedTrade; bot: BotSubStore }>();

/** Snapshots per bot and trade - they never change once saved */
const snapshots = new Map<string, EntrySnapshot | null>();
const snapshot = ref<EntrySnapshot | null | undefined>(undefined);

async function loadSnapshot() {
  const key = `${props.bot.botId}:${props.trade.trade_id}`;
  if (!snapshots.has(key)) {
    try {
      snapshots.set(key, await props.bot.getEntrySnapshot(props.trade.trade_id));
    } catch {
      snapshots.set(key, null);
    }
  }
  snapshot.value = snapshots.get(key);
}
watch(() => [props.bot.botId, props.trade.trade_id], loadSnapshot, { immediate: true });

const strategy = computed(() => props.bot.botState?.strategy ?? '');
const checks = computed(() =>
  Object.entries(snapshot.value?.checks ?? {}).map(([key, check]) => ({
    key,
    label: checkLabel(strategy.value, key),
    help: checkHelp(strategy.value, key),
    ...check,
  })),
);
const values = computed(() =>
  Object.entries(snapshot.value?.values ?? {}).filter(([, v]) => v !== null) as [string, number][],
);

const exitReason = computed(() => {
  const reason = props.trade.exit_reason ?? '';
  const key = `journal.exitReasons.${reason}`;
  return reason && i18n.global.te(key) ? t(key as 'journal.exitReasons.roi') : reason;
});

const fees = computed(() => feeSplit(props.trade));
const currency = computed(() => props.bot.stakeCurrency);
</script>

<template>
  <div class="flex flex-col gap-6 text-start">
    <section class="flex flex-col gap-2" aria-labelledby="review-entry">
      <h3 id="review-entry" class="text-sm font-semibold text-highlighted">
        {{ $t('journal.whyEntered') }}
      </h3>
      <USkeleton v-if="snapshot === undefined" class="h-16 w-full" />
      <p v-else-if="!snapshot" class="text-sm text-muted">
        <template v-if="trade.enter_tag">{{ $t('journal.enterTag', { tag: trade.enter_tag }) }}<br /></template>
        {{ $t('journal.noSnapshot') }}
      </p>
      <template v-else>
        <ul class="flex flex-col gap-1.5">
          <li v-for="c in checks" :key="c.key" class="flex items-start gap-2 text-sm">
            <UIcon
              :name="c.met ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
              class="mt-0.5 size-4 shrink-0"
              :class="c.met ? 'text-profit' : 'text-muted'"
              :aria-label="c.met ? $t('journal.checkMet') : $t('journal.checkNotMet')"
            />
            <div class="min-w-0">
              <span class="font-medium">{{ c.label }}</span>
              <span v-if="c.gap !== null && !c.met" class="text-muted">
                · {{ fmtGap(c.gap) }}</span
              >
              <p v-if="c.help" class="text-xs text-muted">{{ c.help }}</p>
            </div>
          </li>
        </ul>
        <p class="text-xs text-muted">
          {{ $t('journal.snapshotCandle', { tag: snapshot.enter_tag ?? '–' }) }}
          <DateTimeTZ :date="Date.parse(snapshot.candle)" />
        </p>
        <dl v-if="values.length" class="divide-y divide-default">
          <ValuePair v-for="[name, value] in values" :key="name" :description="name">
            {{ formatPrice(value, 6) }}
          </ValuePair>
        </dl>
      </template>
    </section>

    <section class="flex flex-col gap-1" aria-labelledby="review-exit">
      <h3 id="review-exit" class="text-sm font-semibold text-highlighted">
        {{ $t('journal.whyExited') }}
      </h3>
      <dl class="divide-y divide-default">
        <ValuePair :description="$t('trades.exitReason')">{{ exitReason }}</ValuePair>
        <ValuePair :description="$t('trades.entryPrice')">
          {{ formatPrice(trade.open_rate, 8) }}
        </ValuePair>
        <ValuePair :description="$t('trades.exitPrice')">
          {{ formatPrice(trade.close_rate ?? null, 8) }}
        </ValuePair>
        <ValuePair v-if="trade.stop_loss_abs" :description="$t('journal.stoplossAtExit')">
          {{ formatPrice(trade.stop_loss_abs, 8) }}
        </ValuePair>
      </dl>
    </section>

    <section class="flex flex-col gap-1" aria-labelledby="review-fees">
      <h3 id="review-fees" class="text-sm font-semibold text-highlighted">
        {{ $t('journal.fees') }}
      </h3>
      <dl class="divide-y divide-default">
        <ValuePair :description="$t('journal.grossProfit')">
          {{ formatPriceCurrency(fees.gross, currency) }}
        </ValuePair>
        <ValuePair :description="$t('journal.feesPaid')">
          {{ formatPriceCurrency(fees.fees, currency) }}
        </ValuePair>
        <ValuePair :description="$t('journal.netProfit')">
          <span :class="fees.net >= 0 ? 'text-profit' : 'text-loss'">
            {{ formatPriceCurrency(fees.net, currency) }}
          </span>
        </ValuePair>
      </dl>
      <p v-if="fees.feeShare !== null" class="text-xs text-muted">
        {{ $t('journal.feeShare', { share: formatPercent(fees.feeShare, 0) }) }}
      </p>
    </section>

    <section class="flex flex-col gap-2" aria-labelledby="review-chart">
      <h3 id="review-chart" class="text-sm font-semibold text-highlighted">
        {{ $t('journal.chart') }}
      </h3>
      <MiniTradeChart :trade="trade" :bot="bot" />
    </section>

    <TradeNotes :key="`${bot.botId}:${trade.trade_id}`" :trade="trade" :bot="bot" />
  </div>
</template>
