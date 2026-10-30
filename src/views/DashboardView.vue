<script setup lang="ts">
import { t } from '@/i18n';

const botStore = useBotStore();

const multiBot = computed(() => botStore.botCount > 1);
/** Panel title, naming the bot when several are connected */
function forBot(title: string) {
  return multiBot.value
    ? t('dashboard.forBot', { title, bot: botStore.activeBot.uiBotName })
    : title;
}
const hasReference = computed(
  () => !!STRATEGY_REFERENCE[botStore.activeBot.botState?.strategy ?? ''],
);
const hasClosedTrades = computed(() => botStore.allClosedTradesSelectedBots.length > 0);

onMounted(async () => {
  botStore.allGetDaily({ timescale: 30 });
  botStore.activeBot.getOpenTrades();
  botStore.activeBot.getProfit();
});
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-3 text-start sm:p-4 lg:gap-5 lg:p-6"
  >
    <BotSummaryStats />

    <!-- Every bot side by side, full width so no column is cut off -->
    <PanelSection
      v-if="multiBot"
      :title="$t('dashboard.botComparison')"
      :info="$t('dashboard.botComparisonInfo')"
      body-class="overflow-x-auto"
    >
      <BotComparisonList />
    </PanelSection>

    <!-- Money over time - an empty chart would only push the live panels down -->
    <div
      v-if="hasClosedTrades || !multiBot"
      class="grid gap-4 lg:gap-5"
      :class="{ 'xl:grid-cols-3': !multiBot }"
    >
      <PanelSection
        v-if="hasClosedTrades"
        :title="multiBot ? $t('dashboard.profitOverTimeAll') : $t('dashboard.profitOverTime')"
        class="h-96 xl:col-span-2"
        body-class="overflow-hidden"
      >
        <PeriodBreakdown multi-bot-view />
      </PanelSection>
      <section
        v-if="!multiBot"
        class="h-96 overflow-auto card"
        :class="{ 'xl:col-span-3': !hasClosedTrades }"
      >
        <BotBalance />
      </section>
    </div>

    <!-- What is open now -->
    <PanelSection
      :title="$t('dashboard.openTrades')"
      :info="multiBot ? $t('dashboard.openTradesAll') : undefined"
      body-class=""
    >
      <TradeList
        active-trades
        :trades="botStore.allOpenTradesSelectedBots"
        :multi-bot-view="multiBot"
        :empty-text="$t('dashboard.noOpenTrades')"
      />
    </PanelSection>

    <PanelSection
      v-if="botStore.activeBot.openTradeCount > 0"
      :title="forBot($t('dashboard.exitPlan'))"
      :info="$t('dashboard.exitPlanInfo')"
      body-class=""
    >
      <ExitPlanPanel />
    </PanelSection>

    <!-- What comes next -->
    <PanelSection
      :title="forBot($t('dashboard.nextEntry'))"
      :info="$t('dashboard.nextEntryInfo')"
      body-class=""
    >
      <NextEntryPanel compact />
    </PanelSection>

    <PanelSection
      v-if="hasReference"
      :title="forBot($t('dashboard.liveVsBacktest'))"
      :info="$t('dashboard.liveVsBacktestInfo')"
      body-class=""
    >
      <BacktestCheck />
    </PanelSection>

    <!-- History -->
    <PanelSection :title="$t('dashboard.closedTrades')" body-class="">
      <TradeList
        :active-trades="false"
        show-filter
        :trades="botStore.allClosedTradesSelectedBots"
        :multi-bot-view="multiBot"
        :empty-text="$t('dashboard.noClosedTrades')"
      />
    </PanelSection>

    <div v-if="hasClosedTrades" class="grid gap-4 lg:grid-cols-2 lg:gap-5">
      <PanelSection :title="$t('dashboard.cumProfit')" class="h-80" body-class="overflow-hidden">
        <CumProfitChart
          :trades="botStore.allTradesSelectedBots"
          :open-trades="botStore.allOpenTradesSelectedBots"
          :show-title="false"
        />
      </PanelSection>
      <PanelSection
        :title="$t('dashboard.profitDistribution')"
        class="h-80"
        body-class="overflow-hidden"
      >
        <ProfitDistributionChart :trades="botStore.allTradesSelectedBots" :show-title="false" />
      </PanelSection>
      <PanelSection
        :title="$t('dashboard.walletHistory')"
        class="h-80"
        body-class="overflow-hidden"
      >
        <WalletHistoryChart :wallet-data="botStore.allBalanceHistory" :show-title="false" />
      </PanelSection>
      <PanelSection :title="$t('dashboard.tradesLog')" class="h-80" body-class="overflow-hidden">
        <TradesLogChart :trades="botStore.allTradesSelectedBots" :show-title="false" />
      </PanelSection>
    </div>
    <p
      v-else
      class="flex items-center gap-2 rounded-xl border border-dashed border-accented px-4 py-3 text-sm text-muted"
    >
      <UIcon name="i-lucide-chart-area" class="size-4 shrink-0" aria-hidden="true" />
      {{ $t('dashboard.chartsAfterFirst') }}
    </p>
  </div>
</template>
