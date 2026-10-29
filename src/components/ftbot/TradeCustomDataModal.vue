<script setup lang="ts">
import { type TradeCustomDataProps } from '@/components/ftbot/TradeCustomData.vue';
defineProps<TradeCustomDataProps>();
defineEmits<{
  close: [value: boolean];
}>();
</script>

<template>
  <UModal :title="$t('tradeActions.customDataTitle', { id: tradeId })" description="">
    <template #body>
      <TradeCustomData :trade-id="tradeId" />
    </template>
  </UModal>
</template>
