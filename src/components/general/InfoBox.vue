<script setup lang="ts">
defineProps<{ hint: string }>();
</script>

<template>
  <UTooltip :text="hint" :content="{ side: 'top' }">
    <button
      type="button"
      class="inline-flex shrink-0 rounded-full text-dimmed hover:text-muted"
      :aria-label="hint"
    >
      <UIcon name="mdi:information-outline" class="size-4" />
    </button>
  </UTooltip>
</template>
