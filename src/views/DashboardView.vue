<script setup lang="ts">
const botStore = useBotStore();

const multiBot = computed(() => botStore.botCount > 1);
const hasClosedTrades = computed(() => botStore.allClosedTradesSelectedBots.length > 0);

onMounted(async () => {
  botStore.allGetDaily({ timescale: 30 });
  botStore.activeBot.getOpenTrades();
  botStore.activeBot.getProfit();
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-3 text-left sm:p-4 lg:p-6">
    <BotSummaryStats />

    <PanelSection
      :title="`Next entry${multiBot ? `: ${botStore.activeBot.uiBotName}` : ''}`"
      info="How close each pair is to the strategy's entry conditions."
      body-class=""
    >
      <NextEntryPanel compact />
    </PanelSection>

    <div class="grid gap-4 lg:grid-cols-3">
      <PanelSection
        :title="`Profit over time${multiBot ? ' (all bots)' : ''}`"
        class="h-96 lg:col-span-2"
        body-class="overflow-hidden"
      >
        <PeriodBreakdown multi-bot-view />
      </PanelSection>
      <PanelSection v-if="multiBot" title="Bot comparison" class="h-96">
        <BotComparisonList />
      </PanelSection>
      <section v-else class="panel h-96 overflow-auto">
        <BotBalance />
      </section>
    </div>

    <PanelSection
      title="Open trades"
      :info="multiBot ? 'Open trades of every selected bot.' : undefined"
      body-class=""
    >
      <TradeList
        active-trades
        :trades="botStore.allOpenTradesSelectedBots"
        :multi-bot-view="multiBot"
        empty-text="No open trades"
      />
    </PanelSection>

    <PanelSection title="Closed trades" body-class="">
      <TradeList
        :active-trades="false"
        show-filter
        :trades="botStore.allClosedTradesSelectedBots"
        :multi-bot-view="multiBot"
        empty-text="No closed trades yet."
      />
    </PanelSection>

    <div v-if="hasClosedTrades" class="grid gap-4 lg:grid-cols-2">
      <PanelSection title="Cumulative profit" class="h-80" body-class="overflow-hidden">
        <CumProfitChart
          :trades="botStore.allTradesSelectedBots"
          :open-trades="botStore.allOpenTradesSelectedBots"
          :show-title="false"
        />
      </PanelSection>
      <PanelSection title="Profit distribution" class="h-80" body-class="overflow-hidden">
        <ProfitDistributionChart :trades="botStore.allTradesSelectedBots" :show-title="false" />
      </PanelSection>
      <PanelSection title="Wallet history" class="h-80" body-class="overflow-hidden">
        <WalletHistoryChart :wallet-data="botStore.allBalanceHistory" :show-title="false" />
      </PanelSection>
      <PanelSection title="Trades log" class="h-80" body-class="overflow-hidden">
        <TradesLogChart :trades="botStore.allTradesSelectedBots" :show-title="false" />
      </PanelSection>
    </div>
    <p
      v-else
      class="flex items-center gap-2 rounded-(--app-panel-radius) border border-dashed border-default px-4 py-3 text-sm text-muted"
    >
      <UIcon name="mdi:chart-areaspline" class="size-4 shrink-0" aria-hidden="true" />
      Cumulative profit, profit distribution, wallet history and the trades log appear after the
      first closed trade.
    </p>
  </div>
</template>
