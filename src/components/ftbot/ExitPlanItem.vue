<script setup lang="ts">
import type { TradeExitPlan } from '@/composables/useExitPlan';
import { fmtEntryPrice, fmtGap } from '@/composables/useNextEntry';

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

const below = computed(() => (props.plan.trade.is_short ? 'above' : 'below'));

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
    ...(p.stop ? [{ key: 'stop', text: 'Stop', at: pos(p.stop.price) }] : []),
    ...p.lines.map((l) => ({ key: l.key, text: l.label, at: pos(l.price) })),
    { key: 'bought', text: 'Bought', at: pos(p.trade.open_rate) },
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
  <div class="flex flex-col gap-3 text-left">
    <div v-if="showHeader" class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <div class="min-w-0">
        <button
          type="button"
          class="rounded-sm text-base font-semibold text-highlighted hover:text-primary"
          :title="`Show trade #${plan.trade.trade_id}`"
          @click="emit('select', plan.trade.trade_id)"
        >
          {{ plan.trade.pair }}
        </button>
        <p class="text-sm text-muted tabular-nums">
          Bought at {{ fmtEntryPrice(plan.trade.open_rate)
          }}<template v-if="plan.current">, now {{ fmtEntryPrice(plan.current) }}</template>
        </p>
      </div>
      <TradeProfit :trade="plan.trade" />
    </div>

    <p
      v-if="plan.exitSignal"
      class="rounded-md border-s-2 border-(--color-loss) bg-(--color-loss)/8 px-3 py-2 text-sm font-medium text-highlighted"
    >
      The latest candle closed {{ below }} the exit line. The bot is selling this trade.
    </p>

    <!-- Ruler -->
    <div
      v-if="plan.current"
      class="relative mx-1 h-12 text-[11px] text-muted"
      role="img"
      :aria-label="`Price ruler for ${plan.trade.pair}: sell levels on the left, the current price as a dot`"
    >
      <span
        class="absolute top-0 font-medium whitespace-nowrap text-highlighted"
        :style="{
          left: `${ruler.pos(plan.current)}%`,
          transform: `translateX(${labelShift(ruler.pos(plan.current))})`,
        }"
        >Now</span
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
        title="Room before the trade is sold"
      />
      <span
        v-if="plan.stop"
        class="absolute top-4 h-4 w-0.5 -translate-x-1/2 bg-(--color-loss)"
        :style="{ left: `${ruler.pos(plan.stop.price)}%` }"
        :title="`Stoploss ${fmtEntryPrice(plan.stop.price)}`"
      />
      <span
        v-for="l in plan.lines"
        :key="l.key"
        class="absolute top-4 h-4 -translate-x-1/2 border-s-2 border-dashed border-(--color-loss)"
        :style="{ left: `${ruler.pos(l.price)}%` }"
        :title="`${l.label} ${fmtEntryPrice(l.price)}`"
      />
      <span
        class="absolute top-4.5 h-3 w-0.5 -translate-x-1/2 bg-(--ui-text-muted)"
        :style="{ left: `${ruler.pos(plan.trade.open_rate)}%` }"
        :title="`Bought at ${fmtEntryPrice(plan.trade.open_rate)}`"
      />
      <span
        class="absolute top-6 size-3 -translate-1/2 rounded-full bg-(--ui-text-highlighted) ring-2 ring-(--ui-bg)"
        :style="{ left: `${ruler.pos(plan.current)}%` }"
        :title="`Now ${fmtEntryPrice(plan.current)}`"
      />
    </div>

    <ul class="flex flex-col gap-2 text-sm">
      <li v-for="l in plan.lines" :key="l.key" class="flex gap-2.5">
        <span
          class="mt-1 h-3.5 shrink-0 border-s-2 border-dashed border-(--color-loss)"
          aria-hidden="true"
        />
        <div class="min-w-0">
          <p class="tabular-nums">
            <span class="font-medium text-highlighted"
              >{{ l.label }} {{ fmtEntryPrice(l.price) }}</span
            >
            <span v-if="l.fromNow !== null" class="ms-1.5 text-muted"
              >{{ pct(l.fromNow) }} from now</span
            >
          </p>
          <p class="text-muted">
            {{ l.help ?? `Sells when a candle closes ${below} this level.` }}
            <template v-if="plan.nextCheck">
              Next check {{ fmtTime(plan.nextCheck) }} ({{ untilText(plan.nextCheck) }}).
            </template>
          </p>
        </div>
      </li>
      <li v-if="plan.stop" class="flex gap-2.5">
        <span class="mt-1 h-3.5 w-0.5 shrink-0 bg-(--color-loss)" aria-hidden="true" />
        <div class="min-w-0">
          <p class="tabular-nums">
            <span class="font-medium text-highlighted"
              >Stoploss {{ fmtEntryPrice(plan.stop.price) }}</span
            >
            <span v-if="plan.stop.fromNow !== null" class="ms-1.5 text-muted"
              >{{ pct(plan.stop.fromNow) }} from now</span
            >
          </p>
          <p class="text-muted">
            Sells right away if the price reaches it ({{ pct(plan.stop.fromEntry) }} from the entry
            price). Checked every few seconds, not just at candle close.
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
