<script setup lang="ts">
import type { ChartSliderPosition, PairHistory, Trade } from '@/types';
import { LoadingStatus } from '@/types';

const props = withDefaults(
  defineProps<{
    trades?: Trade[];
    availablePairs: string[];
    timeframe: string;
    historicView?: boolean;
    pair?: string;
    sliderPosition?: ChartSliderPosition;
    isSinglePairView?: boolean;
  }>(),
  {
    trades: () => [],
    historicView: false,
    pair: '',
    sliderPosition: undefined,
    isSinglePairView: true,
  },
);

const emit = defineEmits<{
  refreshData: [pair: string, columns: string[]];
}>();

const settingsStore = useSettingsStore();
const colorStore = useColorStore();
const botStore = useBotStore();
const plotStore = usePlotConfigStore();

const dataset = computed((): PairHistory => {
  if (props.historicView) {
    return botStore.activeBot.history[`${props.pair}__${props.timeframe}`]?.data;
  }
  return botStore.activeBot.candleData[`${props.pair}__${props.timeframe}`]?.data;
});

const datasetColumns = computed(() =>
  dataset.value ? (dataset.value.all_columns ?? dataset.value.columns) : [],
);
const datasetLoadedColumns = computed(() =>
  dataset.value ? (dataset.value.columns ?? dataset.value.all_columns) : [],
);

const hasDataset = computed(() => dataset.value && dataset.value.data.length > 0);
const isLoadingDataset = computed((): boolean => {
  if (props.historicView) {
    return botStore.activeBot.historyStatus === LoadingStatus.loading;
  }

  return botStore.activeBot.candleDataStatus === LoadingStatus.loading;
});
const noDatasetText = computed((): string => {
  const status = props.historicView
    ? botStore.activeBot.historyStatus
    : botStore.activeBot.candleDataStatus;

  switch (status) {
    case LoadingStatus.not_loaded:
      return 'Not loaded yet.';
    case LoadingStatus.loading:
      return 'Loading...';
    case LoadingStatus.success:
      return 'No data available';
    case LoadingStatus.error:
      return 'Failed to load data';
    default:
      return 'Unknown';
  }
});

function refresh() {
  emit('refreshData', props.pair, plotStore.usedColumns);
}

function refreshIfNecessary() {
  if (!hasDataset.value) {
    refresh();
  }
}

function assignFirstPair() {
  const [firstPair] = props.availablePairs;
  if (firstPair) {
    //props.pair = firstPair;
  }
}

watch(
  () => props.availablePairs,
  () => {
    if (!props.availablePairs.find((p) => p === props.pair)) {
      assignFirstPair();
      refresh();
    }
  },
);

watch(
  () => plotStore.plotConfig,
  () => {
    // Trigger reload if the used columns are not loaded yet but would be available.
    const hasAllColumns = plotStore.usedColumns.some(
      (c) => datasetColumns.value.includes(c) && !datasetLoadedColumns.value.includes(c),
    );

    if (settingsStore.useReducedPairCalls && hasAllColumns) {
      refresh();
    }
  },
);

watch(
  () => props.timeframe,
  () => {
    refreshIfNecessary();
  },
);
</script>

<template>
  <div
    class="flex w-full min-w-0 flex-col"
    :class="{
      'h-full': isSinglePairView,
      'h-150 border-b border-e border-default': !isSinglePairView,
    }"
  >
    <div class="flex min-h-8 w-full items-center gap-3 px-2 py-1 text-xs text-muted">
      <span v-if="!isSinglePairView" class="font-semibold text-highlighted">{{ pair }}</span>
      <template v-if="dataset">
        <span
          class="inline-flex items-center gap-1.5 whitespace-nowrap"
          title="Entry signals in the loaded candles"
        >
          <span class="size-2 rounded-full bg-[var(--color-profit)]" aria-hidden="true" />
          {{ dataset.enter_long_signals ?? dataset.buy_signals ?? 0 }} entry signals
        </span>
        <span
          class="inline-flex items-center gap-1.5 whitespace-nowrap"
          title="Exit signals in the loaded candles"
        >
          <span class="size-2 rounded-full bg-amber-400" aria-hidden="true" />
          {{ dataset.exit_long_signals ?? dataset.sell_signals ?? 0 }} exit signals
        </span>
        <span v-if="dataset.enter_short_signals" class="whitespace-nowrap">
          {{ dataset.enter_short_signals }} short entries
        </span>
        <span v-if="dataset.exit_short_signals" class="whitespace-nowrap">
          {{ dataset.exit_short_signals }} short exits
        </span>
      </template>
      <span v-if="isLoadingDataset" class="ms-auto inline-flex items-center gap-1.5" role="status">
        <UIcon name="mdi:loading" class="size-4 animate-spin" aria-hidden="true" />
        Loading…
      </span>
    </div>
    <div class="flex min-h-0 flex-1">
      <div class="min-w-0 w-full flex-1">
        <CandleChart
          v-if="hasDataset"
          :dataset="dataset"
          :trades="trades"
          :plot-config="plotStore.plotConfig"
          :heikin-ashi="settingsStore.useHeikinAshiCandles"
          :show-mark-area="settingsStore.showMarkArea"
          :use-u-t-c="settingsStore.timezone === 'UTC'"
          :theme="settingsStore.chartTheme"
          :slider-position="sliderPosition"
          :color-up="colorStore.colorUp"
          :color-down="colorStore.colorDown"
          :start-candle-count="settingsStore.chartDefaultCandleCount"
          :label-side="settingsStore.chartLabelSide"
        />
        <div v-else class="flex h-full items-center justify-center">
          <EmptyState
            :icon="isLoadingDataset ? 'mdi:loading' : 'i-mdi-chart-line'"
            :title="isLoadingDataset ? 'Loading chart…' : noDatasetText"
            :description="
              botStore.activeBot.historyTakesLonger
                ? 'This is taking longer than expected - hold on.'
                : ''
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>
