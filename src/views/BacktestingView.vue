<script setup lang="ts">
enum BtRunModes {
  run = 'run',
  results = 'results',
  visualize = 'visualize',
  visualizesummary = 'visualize-summary',
  compareresults = 'compare-results',
  historicresults = 'historicResults',
}

const botStore = useBotStore();
const btStore = useBtStore();

const hasBacktestResult = computed(() =>
  botStore.activeBot.backtestHistory
    ? Object.keys(botStore.activeBot.backtestHistory).length !== 0
    : false,
);
const hasMultiBacktestResult = computed(() =>
  botStore.activeBot.backtestHistory
    ? Object.keys(botStore.activeBot.backtestHistory).length > 1
    : false,
);

const timeframe = computed((): string => {
  return botStore.activeBot.selectedBacktestResult?.timeframe ?? '';
});

const showSavedResults = ref(false);

const btFormMode = ref<BtRunModes>(BtRunModes.results);
const pollInterval = ref<number | null>(null);

function selectBacktestResult() {
  if (!botStore.activeBot.selectedBacktestResult) {
    return;
  }
  // Set parameters for this result
  btStore.strategy = botStore.activeBot.selectedBacktestResult.strategy_name;
  botStore.activeBot.getStrategy(btStore.strategy);
  btStore.selectedTimeframe = botStore.activeBot.selectedBacktestResult.timeframe;
  btStore.selectedDetailTimeframe =
    botStore.activeBot.selectedBacktestResult.timeframe_detail || '';
  // TODO: maybe this should not use timerange, but the actual backtest start/end results instead?
  btStore.timerange = botStore.activeBot.selectedBacktestResult.timerange;
  btStore.enableProtections = botStore.activeBot.selectedBacktestResult.enable_protections;
  btStore.freqAI.enabled = !!botStore.activeBot.selectedBacktestResult.freqaimodel;
  btStore.freqAI.model = botStore.activeBot.selectedBacktestResult.freqaimodel || '';
  btStore.freqAI.identifier = botStore.activeBot.selectedBacktestResult.freqai_identifier || '';
}

watch(
  () => botStore.activeBot.selectedBacktestResultKey,
  () => {
    selectBacktestResult();
  },
);

onMounted(() => botStore.activeBot.getState());
watch(
  () => botStore.activeBot.backtestRunning,
  () => {
    if (botStore.activeBot.backtestRunning === true) {
      pollInterval.value = window.setInterval(botStore.activeBot.pollBacktest, 1000);
    } else if (pollInterval.value) {
      clearInterval(pollInterval.value);
      pollInterval.value = null;
    }
  },
);

// Results of the selected backtest, in tabs
const resultTabs = computed(() => [
  { slot: 'results', value: BtRunModes.results, label: 'Summary' },
  { slot: 'visualize-summary', value: BtRunModes.visualizesummary, label: 'Charts' },
  { slot: 'visualize', value: BtRunModes.visualize, label: 'Trades on candles' },
  ...(hasMultiBacktestResult.value
    ? [{ slot: 'compare-results', value: BtRunModes.compareresults, label: 'Compare' }]
    : []),
]);
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-3 text-left md:p-6">
    <PageHeader
      title="Backtest"
      description="See how a strategy would have traded on past candles."
    >
      <template #actions>
        <UBadge
          v-if="botStore.activeBot.backtestRunning"
          color="primary"
          variant="subtle"
          icon="mdi:loading"
          :ui="{ leadingIcon: 'animate-spin' }"
          :label="`${botStore.activeBot.backtestStep} ${formatPercent(botStore.activeBot.backtestProgress, 0)}`"
        />
        <UButton
          v-if="botStore.activeBot.canRunBacktest && botStore.activeBot.botFeatures.backtestHistory"
          color="neutral"
          variant="outline"
          icon="mdi:folder-open-outline"
          label="Load saved results"
          @click="showSavedResults = true"
        />
      </template>
    </PageHeader>

    <WebserverOnlyNotice v-if="!botStore.activeBot.canRunBacktest" feature="Backtesting" />

    <div v-else class="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div class="flex flex-col gap-4">
        <PanelSection title="New backtest" body-class="p-4">
          <BacktestRun />
        </PanelSection>
        <PanelSection v-if="hasBacktestResult" title="Results" body-class="p-2">
          <BacktestResultSelect
            :backtest-history="botStore.activeBot.backtestHistory"
            :selected-backtest-result-key="botStore.activeBot.selectedBacktestResultKey"
            :can-use-modify="botStore.activeBot.botFeatures.backtestSetNotes"
            @selection-change="botStore.activeBot.setBacktestResultKey"
            @remove-result="botStore.activeBot.removeBacktestResultFromMemory"
            @update-result="botStore.activeBot.saveBacktestResultMetadata"
          />
        </PanelSection>
      </div>

      <section class="panel min-w-0 overflow-hidden" aria-label="Backtest result">
        <EmptyState
          v-if="!hasBacktestResult || !botStore.activeBot.selectedBacktestResult"
          class="py-24"
          icon="mdi:chart-box-outline"
          title="No result yet"
          description="Run a backtest, or load a saved result, to see trades and profit here."
        />
        <UTabs
          v-else
          v-model="btFormMode"
          :items="resultTabs"
          variant="link"
          :ui="{
            root: 'gap-0',
            list: 'overflow-x-auto border-b border-default px-2',
            trigger: 'shrink-0 grow-0 px-3 py-3 text-sm',
            label: 'overflow-visible',
            content: 'min-w-0 p-3',
          }"
        >
          <template #results>
            <BacktestResultAnalysis :backtest-result="botStore.activeBot.selectedBacktestResult" />
          </template>
          <template #compare-results>
            <BacktestResultComparison
              v-if="hasMultiBacktestResult"
              :backtest-results="botStore.activeBot.backtestHistory"
            />
          </template>
          <template #visualize-summary>
            <BacktestGraphs :trades="botStore.activeBot.selectedBacktestResult.trades" />
          </template>
          <template #visualize>
            <div class="h-[75vh]">
              <BacktestResultChart
                :timeframe="timeframe"
                :strategy="btStore.strategy"
                :timerange="btStore.timerange"
                :backtest-result="botStore.activeBot.selectedBacktestResult"
                :freqai-model="btStore.freqAI.enabled ? btStore.freqAI.model : undefined"
              />
            </div>
          </template>
        </UTabs>
      </section>
    </div>

    <USlideover
      v-model:open="showSavedResults"
      title="Saved results"
      :ui="{ content: 'sm:max-w-4xl' }"
      :close="{ color: 'neutral', variant: 'ghost' }"
    >
      <template #body>
        <BacktestHistoryLoad />
      </template>
    </USlideover>
  </div>
</template>
