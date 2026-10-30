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
      <!-- The whole label is the tap target; the text shows what the bare switch means -->
      <label
        class="flex cursor-pointer items-center gap-2 rounded-md px-1 text-sm text-muted hover:text-highlighted pointer-coarse:min-h-11 pointer-coarse:px-2"
      >
        <USwitch v-model="autoRefreshLoc" size="sm" :aria-label="$t('controls.autoRefreshAll')" />
        <span :class="showLabel ? 'inline' : 'hidden sm:inline'" aria-hidden="true">
          {{ $t('controls.autoRefreshShort') }}
        </span>
      </label>
    </UTooltip>
    <UTooltip :text="$t('controls.refreshNow')">
      <UButton
        color="neutral"
        variant="ghost"
        icon="lucide:refresh-cw"
        class="justify-center pointer-coarse:size-11"
        :aria-label="$t('controls.refreshAllNow')"
        :loading="botStore.activeBotorUndefined?.refreshing"
        @click="botStore.allRefreshFull"
      />
    </UTooltip>
  </div>
</template>
