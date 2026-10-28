<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** Kept for compatibility - page titles no longer show an icon */
    icon?: string;
  }>(),
  {
    description: '',
    icon: '',
  },
);
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3 text-left">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight text-highlighted">{{ title }}</h1>
      <p v-if="description" class="mt-0.5 max-w-prose text-sm text-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
