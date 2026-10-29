<script setup lang="ts">
const props = defineProps<{
  profit: number | null | undefined;
}>();

const isProfitable = computed<boolean | null>(() => {
  if (!isDefined(props.profit)) {
    return null;
  }
  return props.profit > 0;
});
</script>

<template>
  <UIcon
    name="i-lucide-triangle"
    class="size-3.5 shrink-0"
    :class="{
      'fill-current text-profit': isProfitable === true,
      'rotate-180 fill-current text-loss': isProfitable === false,
      'text-dimmed': isProfitable === null,
    }"
    aria-hidden="true"
  />
</template>
