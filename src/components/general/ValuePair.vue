<script setup lang="ts">
/** One label / value row: label on the left, value right-aligned so numbers line up. */
withDefaults(
  defineProps<{
    description: string;
    help?: string;
    classLabel?: string;
    classValue?: string;
  }>(),
  {
    help: '',
    classLabel: '',
    classValue: '',
  },
);
</script>

<template>
  <div class="flex min-w-0 items-baseline justify-between gap-4 py-1.5 text-sm">
    <span class="flex shrink-0 items-center gap-1 text-muted" :class="classLabel">
      {{ description }}
      <InfoBox v-if="help" :hint="help" class="self-center" />
    </span>
    <span class="min-w-0 text-end text-highlighted tabular-nums" :class="classValue">
      <slot></slot>
    </span>
  </div>
</template>
