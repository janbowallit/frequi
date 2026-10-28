<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';
import { breakpointsTailwind } from '@vueuse/core';

const botStore = useBotStore();

function refreshOHLCV(pair: string, columns: string[]) {
  botStore.activeBot.getPairCandles({
    pair: pair,
    timeframe: botStore.activeBot.timeframe,
    columns: columns,
  });
}

const activeTab = useStorage('ftTradeTab', 'open-trades');
// On a phone the pair list moves into a tab so the chart comes right after the controls
const isDesktop = useBreakpoints(breakpointsTailwind).greaterOrEqual('lg');
watch(isDesktop, (desktop) => {
  if (desktop && activeTab.value === 'pairs') activeTab.value = 'open-trades';
});

const tradingTabItems = computed<TabsItem[]>(() => [
  ...(isDesktop.value ? [] : [{ slot: 'pairs', value: 'pairs', label: 'Pairs' }]),
  {
    slot: 'open-trades',
    value: 'open-trades',
    label: 'Open trades',
    badge: botStore.activeBot.openTradeCount || undefined,
  },
  { slot: 'exit-plan', value: 'exit-plan', label: 'Exit plan' },
  { slot: 'closed-trades', value: 'closed-trades', label: 'Closed trades' },
  { slot: 'next-entry', value: 'next-entry', label: 'Next entry' },
  { slot: 'signals', value: 'signals', label: 'Why no trade?' },
  { slot: 'performance', value: 'performance', label: 'Performance' },
  { slot: 'time-breakdown', value: 'time-breakdown', label: 'Profit by period' },
  { slot: 'balance', value: 'balance', label: 'Balance' },
  { slot: 'pairlist', value: 'pairlist', label: 'Pairlist' },
  { slot: 'pair-locks', value: 'pair-locks', label: 'Locks' },
  { slot: 'general', value: 'general', label: 'Bot status' },
]);
</script>

<template>
  <div
    class="flex min-h-full flex-col text-left lg:grid lg:h-full lg:grid-cols-[18.5rem_minmax(0,1fr)]"
  >
    <!-- Rail: controls and pairs -->
    <aside
      aria-label="Bot"
      class="flex flex-col border-b border-default bg-default lg:min-h-0 lg:border-e lg:border-b-0"
    >
      <div class="border-default p-4 lg:border-b">
        <BotControls />
      </div>
      <template v-if="isDesktop">
        <h2 class="px-4 pt-3 text-sm font-semibold text-highlighted">Pairs</h2>
        <div class="min-h-0 flex-1 overflow-auto">
          <PairSummary
            :pairlist="botStore.activeBot.whitelist"
            :current-locks="botStore.activeBot.activeLocks"
            :trades="botStore.activeBot.openTrades"
          />
        </div>
      </template>
    </aside>

    <!-- Main: chart, then everything else in tabs -->
    <div class="flex min-w-0 flex-col lg:min-h-0 lg:overflow-auto">
      <section
        aria-label="Chart"
        class="h-[45vh] min-h-80 shrink-0 border-b border-default bg-default lg:h-[58vh] lg:min-h-96"
      >
        <CandleChartContainer
          :available-pairs="botStore.activeBot.whitelist"
          :historic-view="!!false"
          :timeframe="botStore.activeBot.timeframe"
          :trades="botStore.activeBot.allTrades"
          @refresh-data="refreshOHLCV"
        />
      </section>

      <UTabs
        v-model="activeTab"
        :items="tradingTabItems"
        variant="link"
        color="primary"
        class="gap-0"
        :ui="{
          root: 'gap-0',
          list: 'sticky top-0 z-10 overflow-x-auto border-b border-default bg-default px-2',
          trigger: 'shrink-0 grow-0 px-3 py-3 text-sm',
          label: 'overflow-visible',
          content: 'min-w-0',
        }"
      >
        <template #pairs>
          <PairSummary
            :pairlist="botStore.activeBot.whitelist"
            :current-locks="botStore.activeBot.activeLocks"
            :trades="botStore.activeBot.openTrades"
          />
        </template>
        <template #open-trades>
          <TradeList
            :trades="botStore.activeBot.openTrades"
            title="Open trades"
            :active-trades="true"
            empty-text="No open trades"
          />
        </template>
        <template #exit-plan>
          <ExitPlanPanel />
        </template>
        <template #closed-trades>
          <TradeList
            :trades="botStore.activeBot.closedTrades"
            title="Closed trades"
            :show-filter="true"
            empty-text="No closed trades yet"
          />
        </template>
        <template #next-entry>
          <NextEntryPanel />
        </template>
        <template #signals>
          <SignalInspector />
        </template>
        <template #performance>
          <BotPerformance />
        </template>
        <template #time-breakdown>
          <div class="h-96">
            <PeriodBreakdown />
          </div>
        </template>
        <template #balance>
          <BotBalance />
        </template>
        <template #pairlist>
          <PairListLive />
        </template>
        <template #pair-locks>
          <PairLockList />
        </template>
        <template #general>
          <BotStatus />
        </template>
      </UTabs>
    </div>
  </div>
</template>
