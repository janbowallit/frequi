<script setup lang="ts">
/** Details of the selected trade, sliding in from the right on any page. */
const botStore = useBotStore();
const route = useRoute();

const bot = computed(() => botStore.activeBotorUndefined);
// The phone trade lists show the detail inline instead
const inlineRoutes = ['/open_trades', '/trade_history'];

const open = computed({
  get: () =>
    !!bot.value?.detailTradeId && !!bot.value.tradeDetail && !inlineRoutes.includes(route.path),
  set: (value: boolean) => {
    if (!value) bot.value?.setDetailTrade(null);
  },
});
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="bot?.tradeDetail ? `${bot.tradeDetail.pair} trade` : 'Trade'"
    description="Trade details"
    :ui="{ content: 'sm:max-w-md', description: 'sr-only' }"
    :close="{ color: 'neutral', variant: 'ghost' }"
  >
    <template #body>
      <TradeDetail
        v-if="bot?.tradeDetail"
        :trade="bot.tradeDetail"
        :stake-currency="bot.stakeCurrency"
      />
    </template>
  </USlideover>
</template>
