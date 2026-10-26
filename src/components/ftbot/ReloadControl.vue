<script setup lang="ts">
withDefaults(defineProps<{ showLabel?: boolean }>(), { showLabel: false });

const botStore = useBotStore();
const autoRefreshLoc = computed({
  get() {
    return botStore.globalAutoRefresh;
  },
  set(newValue: boolean) {
    botStore.setGlobalAutoRefresh(newValue);
  },
});
</script>

<template>
  <div class="flex items-center gap-1">
    <UTooltip text="Refresh bot data automatically">
      <USwitch
        v-model="autoRefreshLoc"
        size="sm"
        :label="showLabel ? 'Auto-refresh' : undefined"
        aria-label="Auto-refresh all bots"
        class="px-1"
      />
    </UTooltip>
    <UTooltip text="Refresh now">
      <UButton
        color="neutral"
        variant="ghost"
        icon="mdi:refresh"
        aria-label="Refresh all bots now"
        @click="botStore.allRefreshFull"
      />
    </UTooltip>
  </div>
</template>
