<script setup lang="ts">
/**
 * A page panel with an optional header: title, hint, actions on the right.
 * The body grows to fill the panel, so charts can size themselves to a fixed panel height.
 */
defineOptions({
  inheritAttrs: false,
});
withDefaults(
  defineProps<{
    title?: string;
    /** Shown next to the title behind an info icon */
    info?: string;
    /** Classes for the body (default: scrolls when content overflows) */
    bodyClass?: string;
  }>(),
  {
    title: '',
    info: '',
    bodyClass: 'overflow-auto',
  },
);
</script>

<template>
  <section
    class="panel flex min-w-0 flex-col overflow-hidden text-left"
    :aria-label="title || undefined"
    v-bind="$attrs"
  >
    <header
      v-if="title || $slots.title || $slots.actions"
      class="flex min-h-11 shrink-0 items-center gap-2 border-b border-default px-4 py-1.5"
    >
      <h2 class="truncate text-sm font-semibold text-highlighted">
        <slot name="title">{{ title }}</slot>
      </h2>
      <InfoBox v-if="info" :hint="info" />
      <div v-if="$slots.actions" class="ms-auto flex shrink-0 items-center gap-1">
        <slot name="actions" />
      </div>
    </header>
    <div class="min-h-0 flex-1" :class="bodyClass">
      <slot />
    </div>
  </section>
</template>
