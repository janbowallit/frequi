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
    <UTooltip :text="$t('controls.autoRefresh')">
      <USwitch
        v-model="autoRefreshLoc"
        size="sm"
        :label="showLabel ? $t('controls.autoRefreshShort') : undefined"
        :aria-label="$t('controls.autoRefreshAll')"
        class="px-1"
      />
    </UTooltip>
    <UTooltip :text="$t('controls.refreshNow')">
      <UButton
        color="neutral"
        variant="ghost"
        icon="mdi:refresh"
        :aria-label="$t('controls.refreshAllNow')"
        @click="botStore.allRefreshFull"
      />
    </UTooltip>
  </div>
</template>
