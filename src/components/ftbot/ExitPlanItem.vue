<script setup lang="ts">
import type { TradeExitPlan } from '@/composables/useExitPlan';
import { fmtEntryPrice, fmtGap } from '@/composables/useNextEntry';
import { t } from '@/i18n';

/** Where one open trade will be sold, with a price ruler: stop, exit lines, entry and now */
const props = withDefaults(
  defineProps<{
    plan: TradeExitPlan;
    /** Pair, prices and profit on top. Off inside the trade detail, which shows them already */
    showHeader?: boolean;
  }>(),
  { showHeader: true },
);

const emit = defineEmits<{ select: [tradeId: number] }>();

const { fmtTime, untilText } = useNextEntry();

function pct(ratio: number | null) {
  return ratio === null ? '' : fmtGap(ratio * 100);
}

const isShort = computed(() => props.plan.trade.is_short);

/** Ruler positions in % of the width, with some room on both sides */
const ruler = computed(() => {
  const p = props.plan;
  const values = [
    p.trade.open_rate,
    p.current,
    p.stop?.price,
    ...p.lines.map((l) => l.price),
  ].filter((v): v is number => typeof v === 'number' && v > 0);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || hi * 0.01;
  const pos = (v: number) => 4 + ((v - lo) / span) * 92;
  // The sell level closest to the current price: the room left before the trade is sold
  const levels = [p.stop?.price, ...p.lines.map((l) => l.price)].filter(
    (v): v is number => typeof v === 'number',
  );
  const nearest = levels.length ? (p.trade.is_short ? Math.min : Math.max)(...levels) : null;
  // Labels under the ruler, dropping one that would overlap a more important one
  const candidates = [
    ...(p.stop ? [{ key: 'stop', text: t('exitPlan.stop'), at: pos(p.stop.price) }] : []),
    ...p.lines.map((l) => ({ key: l.key, text: l.label, at: pos(l.price) })),
    { key: 'bought', text: t('exitPlan.bought'), at: pos(p.trade.open_rate) },
  ];
  const labels: typeof candidates = [];
  for (const c of candidates) {
    if (labels.every((l) => Math.abs(l.at - c.at) > 12)) labels.push(c);
  }
  return { pos, nearest, labels };
});

/** Keep labels near the edges inside the ruler */
function labelShift(at: number) {
  return at < 12 ? '-15%' : at > 88 ? '-85%' : '-50%';
}
</script>

<template>
  <div class="flex flex-col gap-3 text-start">
    <div v-if="showHeader" class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <div class="min-w-0">
        <button
          type="button"
          class="rounded-sm text-base font-semibold text-highlighted hover:text-primary"
          :title="$t('exitPlan.showTrade', { id: plan.trade.trade_id })"
          @click="emit('select', plan.trade.trade_id)"
        >
          {{ plan.trade.pair }}
        </button>
        <p class="text-sm text-muted tabular-nums">
          {{
            plan.current
              ? $t('exitPlan.boughtAtNow', {
                  price: fmtEntryPrice(plan.trade.open_rate),
                  now: fmtEntryPrice(plan.current),
                })
              : $t('exitPlan.boughtAt', { price: fmtEntryPrice(plan.trade.open_rate) })
          }}
        </p>
      </div>
      <TradeProfit :trade="plan.trade" />
    </div>

    <p
      v-if="plan.exitSignal"
      class="rounded-md border-s-2 border-loss bg-loss/8 px-3 py-2 text-sm font-medium text-highlighted"
    >
      {{ isShort ? $t('exitPlan.sellingAbove') : $t('exitPlan.sellingBelow') }}
    </p>

    <!-- Ruler -->
    <div
      v-if="plan.current"
      class="relative mx-1 h-12 text-xs text-muted"
      role="img"
      dir="ltr"
      :aria-label="$t('exitPlan.rulerLabel', { pair: plan.trade.pair })"
    >
      <span
        class="absolute top-0 font-medium whitespace-nowrap text-highlighted"
        :style="{
          left: `${ruler.pos(plan.current)}%`,
          transform: `translateX(${labelShift(ruler.pos(plan.current))})`,
        }"
        >{{ $t('exitPlan.now') }}</span
      >
      <span
        v-for="l in ruler.labels"
        :key="l.key"
        class="absolute bottom-0 whitespace-nowrap"
        :style="{ left: `${l.at}%`, transform: `translateX(${labelShift(l.at)})` }"
        >{{ l.text }}</span
      >
      <div class="absolute inset-x-0 top-6 h-1 -translate-y-1/2 rounded-full bg-accented" />
      <div
        v-if="ruler.nearest !== null"
        class="absolute top-6 h-1 -translate-y-1/2 rounded-full bg-primary/50"
        :style="{
          left: `${Math.min(ruler.pos(ruler.nearest), ruler.pos(plan.current))}%`,
          width: `${Math.abs(ruler.pos(plan.current) - ruler.pos(ruler.nearest))}%`,
        }"
        :title="$t('exitPlan.room')"
      />
      <span
        v-if="plan.stop"
        class="absolute top-4 h-4 w-0.5 -translate-x-1/2 bg-loss"
        :style="{ left: `${ruler.pos(plan.stop.price)}%` }"
        :title="$t('exitPlan.stoploss', { price: fmtEntryPrice(plan.stop.price) })"
      />
      <span
        v-for="l in plan.lines"
        :key="l.key"
        class="absolute top-4 h-4 -translate-x-1/2 border-s-2 border-dashed border-loss"
        :style="{ left: `${ruler.pos(l.price)}%` }"
        :title="`${l.label} ${fmtEntryPrice(l.price)}`"
      />
      <span
        class="absolute top-4.5 h-3 w-0.5 -translate-x-1/2 bg-(--ui-text-muted)"
        :style="{ left: `${ruler.pos(plan.trade.open_rate)}%` }"
        :title="$t('exitPlan.boughtAt', { price: fmtEntryPrice(plan.trade.open_rate) })"
      />
      <span
        class="absolute top-6 size-3 -translate-1/2 rounded-full bg-(--ui-text-highlighted) ring-2 ring-(--ui-bg)"
        :style="{ left: `${ruler.pos(plan.current)}%` }"
        :title="$t('exitPlan.nowAt', { price: fmtEntryPrice(plan.current) })"
      />
    </div>

    <ul class="flex flex-col gap-2 text-sm">
      <li v-for="l in plan.lines" :key="l.key" class="flex gap-2.5">
        <span class="mt-1 h-3.5 shrink-0 border-s-2 border-dashed border-loss" aria-hidden="true" />
        <div class="min-w-0">
          <p class="tabular-nums">
            <span class="font-medium text-highlighted"
              >{{ l.label }} {{ fmtEntryPrice(l.price) }}</span
            >
            <span v-if="l.fromNow !== null" class="ms-1.5 text-muted">{{
              $t('exitPlan.fromNow', { pct: pct(l.fromNow) })
            }}</span>
          </p>
          <p class="text-muted">
            {{ l.help ?? (isShort ? $t('exitPlan.sellsAbove') : $t('exitPlan.sellsBelow')) }}
            <template v-if="plan.nextCheck">
              {{
                $t('exitPlan.nextCheck', {
                  time: fmtTime(plan.nextCheck),
                  until: untilText(plan.nextCheck),
                })
              }}
            </template>
          </p>
        </div>
      </li>
      <li v-if="plan.stop" class="flex gap-2.5">
        <span class="mt-1 h-3.5 w-0.5 shrink-0 bg-loss" aria-hidden="true" />
        <div class="min-w-0">
          <p class="tabular-nums">
            <span class="font-medium text-highlighted">{{
              $t('exitPlan.stoploss', { price: fmtEntryPrice(plan.stop.price) })
            }}</span>
            <span v-if="plan.stop.fromNow !== null" class="ms-1.5 text-muted">{{
              $t('exitPlan.fromNow', { pct: pct(plan.stop.fromNow) })
            }}</span>
          </p>
          <p class="text-muted">
            {{ $t('exitPlan.stopHelp', { pct: pct(plan.stop.fromEntry) }) }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
