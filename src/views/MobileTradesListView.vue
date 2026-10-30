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
        :description="
          history
            ? $t('trade.closedCount', botStore.activeBot.closedTrades.length)
            : $t('trade.openCount', botStore.activeBot.openTrades.length)
        "
      />
      <div class="card overflow-hidden">
        <CustomTradeList
          v-if="!history"
          :trades="botStore.activeBot.openTrades"
          :title="$t('trade.openTrades')"
          :active-trades="true"
          :stake-currency-decimals="botStore.activeBot.stakeCurrencyDecimals"
          :empty-text="$t('trade.noOpenTrades')"
        />
        <CustomTradeList
          v-else
          :trades="botStore.activeBot.closedTrades"
          :title="$t('trade.tradeHistory')"
          :stake-currency-decimals="botStore.activeBot.stakeCurrencyDecimals"
          :empty-text="$t('trade.noClosedTrades')"
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
        :label="$t('trade.backToTrades')"
        icon="lucide:arrow-left"
        :ui="{ leadingIcon: 'rtl:-scale-x-100' }"
      />
      <div class="card overflow-hidden">
        <TradeDetail
          :trade="botStore.activeBot.tradeDetail"
          :stake-currency="botStore.activeBot.stakeCurrency"
        />
      </div>
    </div>
  </div>
</template>
