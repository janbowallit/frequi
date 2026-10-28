<script setup lang="ts">
import { MarginMode, TradingMode } from '@/types';
import type { ExchangeSelection, Markets, MarketsPayload, PairHistoryPayload } from '@/types';

const botStore = useBotStore();
const chartStore = useChartConfigStore();

const finalTimeframe = computed<string>(() => {
  return botStore.activeBot.isWebserverMode
    ? chartStore.selectedTimeframe || botStore.activeBot.strategy?.timeframe || ''
    : botStore.activeBot.timeframe;
});

const availablePairs = computed<string[]>(() => {
  if (botStore.activeBot.isWebserverMode) {
    if (chartStore.useLiveData) {
      return Object.keys(markets.value?.markets || {}).sort() || [];
    }
    if (finalTimeframe.value && finalTimeframe.value !== '') {
      const tf = finalTimeframe.value;
      return botStore.activeBot.pairlistWithTimeframe
        .filter(([_, timeframe]) => {
          // console.log(pair, timeframe, tf);
          return timeframe === tf;
        })
        .map(([pair]) => pair);
    }
    return botStore.activeBot.pairlist;
  }
  return botStore.activeBot.whitelist;
});

onMounted(() => {
  if (botStore.activeBot.isWebserverMode) {
    // Get available pairs for all timeframes
    botStore.activeBot.getAvailablePairs({});
  } else if (!botStore.activeBot.whitelist || botStore.activeBot.whitelist.length === 0) {
    botStore.activeBot.getWhitelist();
  }
});

function refreshOHLCV(pair: string, columns: string[]) {
  console.log('Refreshing OHLCV for pair:', pair, finalTimeframe.value, 'with columns:', columns);
  if (botStore.activeBot.isWebserverMode && finalTimeframe.value) {
    const payload: PairHistoryPayload = {
      pair: pair,
      timeframe: finalTimeframe.value,
      timerange: chartStore.timerange,
      strategy: chartStore.strategy,
      // freqaimodel: freqaiModel.value,
      columns: columns,
      live_mode: chartStore.useLiveData,
    };
    if (exchange.value.customExchange) {
      payload.exchange = exchange.value.selectedExchange.exchange;
      payload.trading_mode = exchange.value.selectedExchange.trade_mode.trading_mode;
      payload.margin_mode = exchange.value.selectedExchange.trade_mode.margin_mode;
    }
    botStore.activeBot.getPairHistory(payload);
  } else {
    botStore.activeBot.getPairCandles({
      pair: pair,
      timeframe: finalTimeframe.value,
      columns: columns,
    });
  }
}
const exchange = ref<{
  customExchange: boolean;
  selectedExchange: ExchangeSelection;
}>({
  customExchange: false,
  selectedExchange: {
    exchange: botStore.activeBot.botState.exchange,
    trade_mode: {
      margin_mode: MarginMode.NONE,
      trading_mode: TradingMode.SPOT,
    },
  },
});

const markets = ref<Markets | null>(null);
watch(
  () => chartStore.useLiveData,
  async () => {
    if (botStore.activeBot.isWebserverMode && chartStore.useLiveData) {
      const payload: MarketsPayload = {};
      if (exchange.value.customExchange) {
        payload.exchange = exchange.value.selectedExchange.exchange;
        payload.trading_mode = exchange.value.selectedExchange.trade_mode.trading_mode;
        payload.margin_mode = exchange.value.selectedExchange.trade_mode.margin_mode;
      }

      markets.value = await botStore.activeBot.getMarkets(payload);
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-0 text-left md:p-3">
    <!-- Webserver mode: pick what to plot (only affects this chart, not the bot) -->
    <section
      v-if="botStore.activeBot.isWebserverMode"
      aria-labelledby="chart-source"
      class="panel flex flex-col gap-3 p-4"
    >
      <div class="flex items-center gap-2">
        <h2 id="chart-source" class="text-sm font-semibold text-highlighted">Chart data</h2>
        <InfoBox
          hint="These choices only change this chart. The bot's configuration stays as it is."
        />
      </div>
      <div class="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <UFormField label="Strategy">
          <StrategySelect v-model="chartStore.strategy" />
        </UFormField>
        <UFormField label="Timeframe">
          <TimeframeSelect v-model="chartStore.selectedTimeframe" />
        </UFormField>
        <TimeRangeSelect v-model="chartStore.timerange" />
      </div>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <BaseCheckbox
          v-if="botStore.activeBot.botFeatures.chartLiveData"
          v-model="chartStore.useLiveData"
          title="Use live data from the exchange. Only use if you don't have data downloaded locally."
        >
          Use live exchange data
        </BaseCheckbox>
        <UCollapsible v-model:open="exchange.customExchange" class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-3">
            <BaseCheckbox v-model="exchange.customExchange">Use another exchange</BaseCheckbox>
            <span v-show="!exchange.customExchange" class="text-muted">
              Now: {{ botStore.activeBot.botState.exchange }}
              {{ botStore.activeBot.botState.trading_mode }}
            </span>
          </div>
          <template #content>
            <ExchangeSelect v-model="exchange.selectedExchange" />
          </template>
        </UCollapsible>
      </div>
    </section>

    <section aria-label="Chart" class="min-h-0 flex-1 overflow-hidden bg-default md:panel">
      <CandleChartContainer
        :available-pairs="availablePairs"
        :historic-view="botStore.activeBot.isWebserverMode"
        :timeframe="finalTimeframe"
        :trades="botStore.activeBot.allTrades"
        :timerange="botStore.activeBot.isWebserverMode ? chartStore.timerange : undefined"
        :strategy="botStore.activeBot.isWebserverMode ? chartStore.strategy : undefined"
        @refresh-data="refreshOHLCV"
      />
    </section>
  </div>
</template>
