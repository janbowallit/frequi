<script setup lang="ts">
/** Candles from a little before the entry to a little after the exit, with both marked. */
import ECharts from 'vue-echarts';
import type { EChartsOption } from 'echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { CandlestickChart } from 'echarts/charts';
import { GridComponent, MarkPointComponent, TooltipComponent } from 'echarts/components';
import type { BotSubStore } from '@/stores/ftbotwrapper';
import type { ClosedTrade, PairCandlePayload, PairHistory } from '@/types';

use([CanvasRenderer, CandlestickChart, GridComponent, MarkPointComponent, TooltipComponent]);

const PAD = 10;

type Bot = Pick<BotSubStore, 'botId' | 'botState' | 'fetchPairCandles' | 'selectedPair'>;
const props = defineProps<{ trade: ClosedTrade; bot: Bot }>();

/** [ts, open, close, low, high] rows per bot and trade, or null when not available */
const cache = new Map<string, number[][] | null>();

const settingsStore = useSettingsStore();
const colorStore = useColorStore();
const router = useRouter();
const rows = ref<number[][] | null | undefined>(undefined);

function slice(history: PairHistory, trade: ClosedTrade): number[][] | null {
  const col = (name: string) => history.columns.indexOf(name);
  const [d, o, h, l, c] = ['__date_ts', 'open', 'high', 'low', 'close'].map(col);
  const data = history.data;
  if (!data.length || d! < 0 || data[0]![d!]! > trade.open_timestamp) return null;
  const lastAtOrBefore = (ts: number) => {
    let i = data.length - 1;
    while (i >= 0 && data[i]![d!]! > ts) i--;
    return i;
  };
  const entry = lastAtOrBefore(trade.open_timestamp);
  const exit = lastAtOrBefore(trade.close_timestamp);
  return data
    .slice(Math.max(0, entry - PAD), exit + PAD + 1)
    .map((r) => [r[d!]!, r[o!]!, r[c!]!, r[l!]!, r[h!]!]);
}

async function load() {
  const key = `${props.bot.botId}:${props.trade.trade_id}`;
  if (cache.has(key)) {
    rows.value = cache.get(key);
    return;
  }
  try {
    const payload: PairCandlePayload = {
      pair: props.trade.pair,
      timeframe: props.bot.botState.timeframe,
      limit: 1000,
    };
    rows.value = slice(await props.bot.fetchPairCandles(payload), props.trade);
  } catch {
    rows.value = null;
  }
  cache.set(key, rows.value);
}
watch(() => [props.bot.botId, props.trade.trade_id], load, { immediate: true });

const option = computed<EChartsOption>(() => ({
  animation: false,
  grid: { left: 8, right: 56, top: 8, bottom: 20 },
  xAxis: {
    type: 'time',
    axisLabel: { fontSize: 12 },
    // Keep the entry and exit markers on the chart when they fall inside the last candle
    max: (extent: { max: number }) => Math.max(extent.max, props.trade.close_timestamp),
  },
  yAxis: { scale: true, position: 'right', axisLabel: { fontSize: 12 } },
  tooltip: { trigger: 'axis' },
  series: [
    {
      type: 'candlestick',
      data: rows.value ?? [],
      encode: { x: 0, y: [1, 2, 3, 4] },
      itemStyle: {
        color: colorStore.colorUp,
        color0: colorStore.colorDown,
        borderColor: colorStore.colorUp,
        borderColor0: colorStore.colorDown,
      },
      markPoint: {
        symbolSize: 36,
        label: { fontSize: 12 },
        data: [
          {
            name: 'entry',
            coord: [props.trade.open_timestamp, props.trade.open_rate],
            value: '▲',
            itemStyle: { color: colorStore.colorUp },
          },
          {
            name: 'exit',
            coord: [props.trade.close_timestamp, props.trade.close_rate],
            value: '▼',
            symbolRotate: 180,
            itemStyle: { color: colorStore.colorDown },
          },
        ],
      },
    },
  ],
}));

function openChart() {
  props.bot.selectedPair = props.trade.pair;
  router.push('/graph');
}
</script>

<template>
  <div>
    <!-- vue-echarts fills its parent (height: 100%), so the wrapper sets the height -->
    <div v-if="rows" class="h-40 w-full">
      <ECharts dir="ltr" :option="option" autoresize :theme="settingsStore.chartTheme" />
    </div>
    <div
      v-else-if="rows === null"
      class="flex h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-default text-sm text-muted"
    >
      {{ $t('journal.chartUnavailable') }}
      <UButton size="sm" color="neutral" variant="soft" @click="openChart">
        {{ $t('journal.openChart') }}
      </UButton>
    </div>
    <USkeleton v-else class="h-40 w-full" />
  </div>
</template>
