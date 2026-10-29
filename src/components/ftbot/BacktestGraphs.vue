<script setup lang="ts">
import type { ClosedTrade } from '@/types';
import TradeDurationChart from '../charts/TradeDurationChart.vue';

defineProps<{
  trades: ClosedTrade[];
}>();

const botStore = useBotStore();

const { state: marketChangeData } = useAsyncState(
  () => botStore.activeBot.getBacktestMarketChange(),
  null,
);

const { state: walletData } = useAsyncState(
  () => botStore.activeBot.getBacktestWalletChange(),
  null,
);
</script>
<template>
  <div class="text-center flex-fill flex flex-col h-full gap-1">
    <TradesLogChart :trades="trades" class="grow min-h-[300px]" />
    <TradeDurationChart class="grow min-h-[300px]" :trades="trades" :show-title="true" />
    <CumProfitChart :trades="trades" class="grow min-h-[300px]" :show-title="true" />
    <WalletHistoryChart v-if="walletData" :wallet-data="walletData" class="grow min-h-[300px]" />
    <MarketChangeChart
      v-if="marketChangeData"
      :market-change-data="marketChangeData"
      class="grow min-h-[300px]"
    />
    <ProfitDistributionChart class="grow min-h-[300px]" :trades="trades" :show-title="true" />
  </div>
</template>
