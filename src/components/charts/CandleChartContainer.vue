<script setup lang="ts">
import type { ChartSliderPosition, PairHistory, Trade } from '@/types';

const props = withDefaults(
  defineProps<{
    trades?: Trade[];
    availablePairs: string[];
    timeframe: string;
    historicView?: boolean;
    /** Reload data on pair switch if in historic view */
    reloadDataOnSwitch?: boolean;
    strategy?: string;
    sliderPosition?: ChartSliderPosition;
  }>(),
  {
    trades: () => [],
    historicView: false,
    reloadDataOnSwitch: false,
    strategy: '',
    sliderPosition: undefined,
  },
);

const emit = defineEmits<{
  refreshData: [pair: string, columns: string[]];
}>();

const settingsStore = useSettingsStore();
const botStore = useBotStore();
const plotStore = usePlotConfigStore();

const dataset = computed((): PairHistory => {
  const firstpair = botStore.activeBot.plotMultiPairs[0];
  if (props.historicView) {
    return botStore.activeBot.history[`${firstpair}__${props.timeframe}`]?.data;
  }
  return botStore.activeBot.candleData[`${firstpair}__${props.timeframe}`]?.data;
});

const datasetColumns = computed(() =>
  dataset.value ? (dataset.value.all_columns ?? dataset.value.columns) : [],
);

const strategyName = computed(() => props.strategy || dataset.value?.strategy || '');

const showPlotConfigModal = ref(false);
function showConfigurator() {
  showPlotConfigModal.value = !showPlotConfigModal.value;
}

const isSinglePairView = computed(() => botStore.activeBot.plotMultiPairs.length === 1);

watch(
  () => botStore.activeBot.selectedPair,
  () => {
    botStore.activeBot.plotMultiPairs = [botStore.activeBot.selectedPair];
  },
);

onMounted(() => {
  if (botStore.activeBot.selectedPair) {
    botStore.activeBot.plotMultiPairs = [botStore.activeBot.selectedPair];
  } else if (props.availablePairs.length > 0) {
    assignFirstPair();
  }
  plotStore.plotConfigChanged();
  loadStrategyPlotConfig();
});

/** Draw the strategy's own lines until the user sets up a plot config of their own */
function loadStrategyPlotConfig() {
  if (botStore.activeBot.isWebserverMode) return;
  const botId = botStore.selectedBot;
  botStore.activeBot
    .getStrategyPlotConfig()
    .then((config) => {
      // Ignore a late answer from a bot that is no longer selected
      if (botStore.selectedBot !== botId) return;
      plotStore.strategyPlotConfig = config ?? null;
      refresh();
    })
    .catch(() => {});
}

// Each bot runs its own strategy, so its lines have to be fetched again after a switch
watch(
  () => botStore.selectedBot,
  () => {
    plotStore.strategyPlotConfig = null;
    loadStrategyPlotConfig();
  },
);

function refresh() {
  for (const pair of botStore.activeBot.plotMultiPairs) {
    emit('refreshData', pair, plotStore.usedColumns);
  }
}

function refreshIfNecessary(newValue: string[], oldValue: string[] | undefined) {
  for (const pair of newValue) {
    if (oldValue?.includes(pair)) {
      continue;
    }
    emit('refreshData', pair, plotStore.usedColumns);
  }
}

function assignFirstPair() {
  const [firstPair] = props.availablePairs;
  if (firstPair) {
    botStore.activeBot.plotMultiPairs = [firstPair];
  }
}

watch(
  () => props.availablePairs,
  () => {
    if (
      botStore.activeBot.plotMultiPairs.length === 0 ||
      botStore.activeBot.plotMultiPairs.some((p) => !props.availablePairs.includes(p))
    ) {
      assignFirstPair();
      refresh();
    }
  },
);

watch(
  () => botStore.activeBot.plotMultiPairs,
  (newValue, oldValue) => {
    if (newValue.length === 0) return;

    if (!props.historicView || props.reloadDataOnSwitch) {
      refreshIfNecessary(newValue, oldValue);
    }
  },
  {
    immediate: true,
  },
);

watch(
  () => settingsStore.multiPairSelection,
  () => {
    if (
      !settingsStore.multiPairSelection &&
      botStore.activeBot.plotMultiPairs.length > 1 &&
      botStore.activeBot.plotMultiPairs[0]
    ) {
      // Select only the first pair if switching to single pair mode
      botStore.activeBot.plotMultiPairs = [botStore.activeBot.plotMultiPairs[0]];
    }
  },
);

const singlePairSelection = computed({
  get() {
    return botStore.activeBot.plotMultiPairs[0] || '';
  },
  set(value: string) {
    botStore.activeBot.plotMultiPairs = [value];
  },
});
</script>

<template>
  <div class="flex h-full">
    <div class="flex h-full w-full min-w-0 flex-col">
      <div
        class="flex flex-wrap items-center gap-2 border-b border-default px-2 py-2"
        role="toolbar"
        :aria-label="$t('chartControls.controls')"
      >
        <div class="flex min-w-0 grow items-center gap-2 sm:grow-0">
          <BaseStringMultiSelectMenu
            v-if="settingsStore.multiPairSelection"
            v-model="botStore.activeBot.plotMultiPairs"
            class="w-full min-w-0 sm:w-72"
            :items="availablePairs"
            :placeholder="$t('chartControls.selectPairs')"
            :aria-label="$t('chartControls.pairsToPlot')"
            virtualize
            size="md"
          />
          <USelectMenu
            v-else
            v-model="singlePairSelection"
            class="w-full min-w-0 sm:w-56"
            :items="availablePairs"
            :aria-label="$t('chartControls.pair')"
            size="md"
            virtualize
            @input="refresh"
          />
          <UButton
            :title="$t('chartControls.reload')"
            :aria-label="$t('chartControls.reload')"
            color="neutral"
            variant="outline"
            :disabled="botStore.activeBot.plotMultiPairs.length === 0"
            icon="lucide:refresh-cw"
            @click="refresh"
          />
        </div>
        <USwitch
          v-model="settingsStore.multiPairSelection"
          :label="$t('chartControls.multiPair')"
          size="sm"
          class="shrink-0"
        />
        <div class="ms-auto flex items-center gap-2">
          <UBadge
            v-if="strategyName"
            color="neutral"
            variant="subtle"
            class="hidden max-w-56 truncate md:inline-flex"
            :title="$t('chartControls.strategyOn', { strategy: strategyName, timeframe })"
          >
            {{ strategyName }}<span v-if="timeframe" class="text-muted">· {{ timeframe }}</span>
          </UBadge>
          <UPopover :content="{ align: 'end' }">
            <UButton
              color="neutral"
              variant="outline"
              icon="lucide:sliders-horizontal"
              :label="$t('chartControls.display')"
              :aria-label="$t('chartControls.displayOptions')"
            />
            <template #content>
              <div class="flex w-72 flex-col gap-3 p-3 text-start">
                <p class="text-sm font-medium text-muted">{{ $t('chartControls.candles') }}</p>
                <USwitch
                  v-model="settingsStore.showMarkArea"
                  :label="$t('chartControls.showAreas')"
                />
                <USwitch
                  v-model="settingsStore.useHeikinAshiCandles"
                  :label="$t('chartControls.heikinAshi')"
                  :description="$t('chartControls.heikinAshiHelp')"
                />
                <USeparator />
                <p class="text-sm font-medium text-muted">{{ $t('chartControls.indicators') }}</p>
                <PlotConfigSelect class="w-full" />
                <UButton
                  color="neutral"
                  variant="subtle"
                  icon="lucide:settings"
                  :label="$t('chartControls.editIndicators')"
                  block
                  @click="showConfigurator"
                />
              </div>
            </template>
          </UPopover>
        </div>
      </div>
      <div
        v-if="botStore.activeBot.plotMultiPairs?.length > 0"
        :class="{
          'flex min-h-0 w-full min-w-0 flex-1': isSinglePairView,
          'grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-2': !isSinglePairView,
        }"
      >
        <SingleCandleChartContainer
          v-for="pair in botStore.activeBot.plotMultiPairs"
          :key="pair"
          :available-pairs="availablePairs"
          :pair="pair"
          :historic-view="botStore.activeBot.isWebserverMode"
          :timeframe="timeframe"
          :trades="props.trades"
          :slider-position="props.sliderPosition"
          :is-single-pair-view="isSinglePairView"
          @refresh-data="refresh()"
        >
        </SingleCandleChartContainer>
      </div>
      <EmptyState
        v-else
        class="h-full"
        icon="i-lucide-chart-line"
        :title="$t('chartControls.noPair')"
        :description="$t('chartControls.noPairHelp')"
      />
    </div>
    <DraggableModal
      v-model:open="showPlotConfigModal"
      :title="$t('chartControls.configurator')"
      class="max-w-xl"
      :description="$t('chartControls.configuratorHelp')"
      :overlay="false"
      :modal="false"
      :dismissible="false"
    >
      <template #body>
        <PlotConfigurator :is-visible="showPlotConfigModal" :columns="datasetColumns" />
      </template>
    </DraggableModal>
  </div>
</template>
