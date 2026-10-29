<script setup lang="ts">
import type { ChartSliderPosition, StrategyBacktestResult, Trade } from '@/types';

const props = defineProps<{
  timeframe: string;
  strategy: string;
  freqaiModel?: string;
  timerange: string;
  backtestResult: StrategyBacktestResult;
}>();
const botStore = useBotStore();
const isBarVisible = ref({ right: true, left: true });
const sliderPosition = ref<ChartSliderPosition>();

function navigateChartToTrade(trade: Trade) {
  sliderPosition.value = {
    startValue: trade.open_timestamp,
    endValue: trade.close_timestamp,
  };
}

function refreshOHLCV(pair: string, columns: string[]) {
  botStore.activeBot.getPairHistory({
    pair: pair,
    timeframe: props.timeframe,
    timerange: props.timerange,
    strategy: props.strategy,
    freqaimodel: props.freqaiModel,
    columns: columns,
    margin_mode: props.backtestResult.margin_mode,
    trading_mode: props.backtestResult.trading_mode,
  });
}
onMounted(() => {
  if (!botStore.activeBot.selectedPair && props.backtestResult.pairlist.length > 0) {
    const [firstPair] = props.backtestResult.pairlist;
    if (firstPair) {
      botStore.activeBot.selectedPair = firstPair;
    }
  }
});
</script>

<template>
  <div>
    <div class="flex flex-row mb-1 items-center">
      <div class="me-2">
        <UButton
          :aria-label="$t('common.close')"
          :title="$t('backtest.pairNavigation')"
          color="neutral"
          variant="outline"
          :icon="isBarVisible.left ? 'lucide:chevron-left' : 'lucide:chevron-right'"
          :ui="{ leadingIcon: 'rtl:-scale-x-100' }"
          @click="isBarVisible.left = !isBarVisible.left"
        />
      </div>
      <span class="grow">
        {{ $t('backtest.graphHint') }} <br />
        {{ $t('backtest.graphRange', { range: timerange, strategy }) }}
      </span>
      <div class="text-end">
        <UButton
          :aria-label="$t('common.close')"
          variant="outline"
          :title="$t('backtest.tradeNavigation')"
          color="neutral"
          :icon="isBarVisible.right ? 'lucide:chevron-right' : 'lucide:chevron-left'"
          :ui="{ leadingIcon: 'rtl:-scale-x-100' }"
          @click="isBarVisible.right = !isBarVisible.right"
        />
      </div>
    </div>
    <div class="text-center flex flex-row h-full items-stretch overflow-x-clip">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        leave-active-class="transition duration-150 ease-in"
        enter-from-class="-translate-x-6 opacity-0 rtl:translate-x-6"
        leave-to-class="-translate-x-6 opacity-0 rtl:translate-x-6"
      >
        <PairSummary
          v-if="isBarVisible.left"
          class="max-h-[calc(100dvh-200px)] overflow-x-hidden overflow-y-auto"
          :pairlist="backtestResult.pairlist"
          :trades="backtestResult.trades"
          :starting-balance="backtestResult.starting_balance"
          sort-method="profit"
          :backtest-mode="true"
        />
      </Transition>
      <CandleChartContainer
        :available-pairs="backtestResult.pairlist"
        historic-view
        reload-data-on-switch
        :timeframe="timeframe"
        :timerange="timerange"
        :strategy="strategy"
        :trades="backtestResult.trades"
        class="h-[calc(100dvh-250px)] min-w-0 flex-1 self-stretch overflow-y-auto"
        :slider-position="sliderPosition"
        :freqai-model="freqaiModel"
        @refresh-data="refreshOHLCV"
      >
      </CandleChartContainer>
      <Transition
        enter-active-class="transition duration-200 ease-out"
        leave-active-class="transition duration-150 ease-in"
        enter-from-class="translate-x-6 opacity-0 rtl:-translate-x-6"
        leave-to-class="translate-x-6 opacity-0 rtl:-translate-x-6"
      >
        <TradeListNav
          v-if="isBarVisible.right"
          class="max-h-[calc(100dvh-200px)] min-w-56 overflow-x-visible overflow-y-auto"
          :trades="backtestResult.trades.filter((t) => t.pair === botStore.activeBot.selectedPair)"
          @trade-select="navigateChartToTrade"
        />
      </Transition>
    </div>
    <PanelSection :title="$t('backtest.singleTrades')" class="mt-3 w-full">
      <TradeList
        class="row trade-history mt-2 w-full"
        :trades="backtestResult.trades"
        :show-filter="true"
      />
    </PanelSection>
  </div>
</template>
