<script setup lang="ts">
import type { Trade, BotFeatures } from '@/types';

withDefaults(
  defineProps<{
    botFeatures: BotFeatures;
    trade: Trade;
    enableForceEntry?: boolean;
  }>(),
  {
    enableForceEntry: false,
  },
);
defineEmits<{
  forceExit: [trade: Trade, type?: 'limit' | 'market'];
  forceExitPartial: [trade: Trade];
  cancelOpenOrder: [trade: Trade];
  reloadTrade: [trade: Trade];
  deleteTrade: [trade: Trade];
  forceEntry: [trade: Trade];
}>();
</script>

<template>
  <div class="flex flex-col gap-1">
    <UButton
      v-if="!botFeatures.forceExitParams"
      class="justify-start!"
      color="neutral"
      :title="$t('tradeActions.forceExit')"
      :label="$t('tradeActions.forceExit')"
      icon="lucide:square-x"
      @click="$emit('forceExit', trade)"
    />
    <UButton
      v-if="botFeatures.forceExitParams"
      class="justify-start!"
      color="neutral"
      :title="$t('tradeActions.forceExitLimit')"
      :label="$t('tradeActions.forceExitLimit')"
      icon="lucide:square-x"
      @click="$emit('forceExit', trade, 'limit')"
    />
    <UButton
      v-if="botFeatures.forceExitParams"
      class="justify-start!"
      color="neutral"
      :title="$t('tradeActions.forceExitMarket')"
      :label="$t('tradeActions.forceExitMarket')"
      icon="lucide:square-x"
      @click="$emit('forceExit', trade, 'market')"
    />
    <UButton
      v-if="botFeatures.forceEntryTag"
      class="justify-start!"
      color="neutral"
      :title="$t('tradeActions.forceExitPartial')"
      :label="$t('tradeActions.forceExitPartial')"
      icon="lucide:copy-x"
      @click="$emit('forceExitPartial', trade)"
    />
    <UButton
      v-if="botFeatures.cancelOpenOrders && (trade.open_order_id || trade.has_open_orders)"
      class="justify-start!"
      color="neutral"
      :title="$t('tradeActions.cancelOrders')"
      :label="$t('tradeActions.cancelOrders')"
      icon="lucide:ban"
      @click="$emit('cancelOpenOrder', trade)"
    />
    <UButton
      v-if="enableForceEntry"
      class="justify-start!"
      color="neutral"
      :title="$t('tradeActions.increase')"
      :label="$t('tradeActions.increase')"
      icon="lucide:copy-plus"
      @click="$emit('forceEntry', trade)"
    />
    <UButton
      v-if="botFeatures.reloadTrade"
      class="justify-start!"
      color="neutral"
      :title="$t('tradeActions.reload')"
      :label="$t('tradeActions.reload')"
      icon="lucide:refresh-ccw-dot"
      @click="$emit('reloadTrade', trade)"
    />
    <UButton
      class="justify-start!"
      color="neutral"
      :title="$t('tradeActions.delete')"
      :label="$t('tradeActions.delete')"
      icon="lucide:trash-2"
      @click="$emit('deleteTrade', trade)"
    />
  </div>
</template>
