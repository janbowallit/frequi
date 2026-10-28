<script setup lang="ts">
/**
 * Header for a panel or tab: title with actions on the right, optional controls below.
 */
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-2 border-b border-default px-3 py-2 text-left">
    <div class="flex min-h-8 items-center gap-2">
      <div class="me-auto min-w-0">
        <h3 class="truncate text-sm font-semibold text-highlighted">
          <slot name="title">{{ title }}</slot>
        </h3>
        <p v-if="description" class="text-xs text-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-1">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.default" class="flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>
