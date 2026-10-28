<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    icon?: string;
  }>(),
  {
    description: '',
    icon: 'mdi:tray-remove',
  },
);
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
    <span
      class="flex size-10 items-center justify-center rounded-full bg-elevated text-muted"
      aria-hidden="true"
    >
      <UIcon :name="icon" class="size-5" />
    </span>
    <p class="text-sm font-medium text-highlighted">{{ title }}</p>
    <p v-if="description" class="max-w-xs text-sm text-muted">{{ description }}</p>
    <slot />
  </div>
</template>
