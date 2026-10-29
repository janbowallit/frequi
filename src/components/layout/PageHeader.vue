<script setup lang="ts">
/** Intro line for a page - the page name itself sits in the top bar - with page actions on the right. */
withDefaults(defineProps<{ description?: string }>(), { description: '' });
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 text-start">
    <p v-if="description" class="max-w-prose min-w-0 text-sm text-muted">{{ description }}</p>
    <div v-if="$slots.actions" class="ms-auto flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
