<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    icon?: string;
  }>(),
  {
    description: '',
    icon: '',
  },
);
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 text-left">
    <div class="flex min-w-0 items-center gap-3">
      <span
        v-if="icon"
        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <UIcon :name="icon" class="size-5" />
      </span>
      <div class="min-w-0">
        <h1 class="truncate text-xl font-semibold tracking-tight text-highlighted">{{ title }}</h1>
        <p v-if="description" class="text-sm text-muted">{{ description }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
