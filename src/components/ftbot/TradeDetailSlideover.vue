<script setup lang="ts">
import type { ClosedTrade } from '@/types';

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
    :title="
      bot?.tradeDetail
        ? $t('trades.detailTitle', { pair: bot.tradeDetail.pair })
        : $t('trades.trade')
    "
    :description="$t('trades.details')"
    :ui="{ content: 'sm:max-w-md', description: 'sr-only' }"
    :close="{ color: 'neutral', variant: 'ghost' }"
  >
    <template #body>
      <template v-if="bot?.tradeDetail">
        <!-- Closed trades open with the journal review: why it entered, why it exited, notes -->
        <template v-if="!bot.tradeDetail.is_open">
          <TradeReview :trade="bot.tradeDetail as ClosedTrade" :bot="bot" />
          <USeparator class="my-6" />
        </template>
        <TradeDetail :trade="bot.tradeDetail" :stake-currency="bot.stakeCurrency" />
      </template>
    </template>
  </USlideover>
</template>
