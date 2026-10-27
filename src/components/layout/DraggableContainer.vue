<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});
withDefaults(
  defineProps<{
    /** The header text for the draggable container */
    header?: string;
    /** The info text for the draggable container
     * Only shown when hovering the info icon next to the header. Used to give more context about the content of the container.
     * Not compatible with usage of the header slot.
     */
    infoText?: string;
  }>(),
  {
    header: '',
    infoText: '',
  },
);
const layoutStore = useLayoutStore();
</script>

<template>
  <section
    class="flex h-full w-full flex-col overflow-hidden rounded-xl border border-default bg-default shadow-sm shadow-black/5 dark:shadow-black/30"
    :aria-label="header || undefined"
  >
    <div
      class="drag-header group flex min-h-10 items-center gap-2 border-b border-default px-3 py-1.5"
      :class="{ 'cursor-grab active:cursor-grabbing': !layoutStore.layoutLocked }"
    >
      <slot name="header">
        <h2 class="truncate text-sm font-semibold text-highlighted">{{ header }}</h2>
        <InfoBox v-if="infoText" :hint="infoText" />
      </slot>
      <UIcon
        v-if="!layoutStore.layoutLocked"
        name="mdi:drag"
        class="ms-auto size-4 shrink-0 text-dimmed opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        aria-hidden="true"
      />
    </div>
    <div class="min-h-0 w-full flex-1 overflow-auto p-0" v-bind="$attrs">
      <slot></slot>
    </div>
  </section>
</template>
