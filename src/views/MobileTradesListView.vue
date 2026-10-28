<script setup lang="ts">
defineProps<{
  history?: boolean;
}>();
const botStore = useBotStore();
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <template v-if="!botStore.activeBot.detailTradeId">
      <PageHeader
        :title="history ? 'Closed trades' : 'Open trades'"
        :description="
          history
            ? `${botStore.activeBot.closedTrades.length} closed trades`
            : `${botStore.activeBot.openTrades.length} open trades`
        "
        :icon="history ? 'mdi:history' : 'mdi:swap-horizontal-bold'"
      />
      <div class="panel overflow-hidden">
        <CustomTradeList
          v-if="!history"
          :trades="botStore.activeBot.openTrades"
          title="Open trades"
          :active-trades="true"
          :stake-currency-decimals="botStore.activeBot.stakeCurrencyDecimals"
          empty-text="No open trades"
        />
        <CustomTradeList
          v-else
          :trades="botStore.activeBot.closedTrades"
          title="Trade history"
          :stake-currency-decimals="botStore.activeBot.stakeCurrencyDecimals"
          empty-text="No closed trades yet"
        />
      </div>
    </template>
    <div
      v-if="botStore.activeBot.detailTradeId && botStore.activeBot.tradeDetail"
      class="flex flex-col gap-3"
    >
      <UButton
        color="neutral"
        variant="ghost"
        class="self-start"
        @click="botStore.activeBot.setDetailTrade(null)"
        label="Back to trades"
        icon="mdi:arrow-left"
      />
      <div class="panel overflow-hidden">
        <TradeDetail
          :trade="botStore.activeBot.tradeDetail"
          :stake-currency="botStore.activeBot.stakeCurrency"
        />
      </div>
    </div>
  </div>
</template>
