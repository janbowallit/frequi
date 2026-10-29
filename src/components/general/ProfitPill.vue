<script setup lang="ts">
const props = defineProps<{
  profitRatio?: number | null;
  profitAbs?: number;
  stakeCurrency: string;
  profitDesc?: string;
}>();
const isProfitable = computed<boolean | null>(() => {
  if (!isDefined(props.profitRatio) && !isDefined(props.profitAbs)) {
    return null;
  }
  return (
    (isDefined(props.profitRatio) && props.profitRatio > 0) ||
    (props.profitRatio === undefined && props.profitAbs !== undefined && props.profitAbs > 0)
  );
});

const profitString = computed((): string => {
  if (props.profitRatio !== undefined && props.profitAbs !== undefined) {
    return `(${formatPrice(props.profitAbs, 3)})`;
  } else if (props.profitAbs !== undefined) {
    if (props.stakeCurrency !== undefined) {
      return `${formatPriceCurrency(props.profitAbs, props.stakeCurrency, 3)}`;
    } else {
      return `${formatPrice(props.profitAbs, 3)}`;
    }
  }
  return '';
});
</script>

<template>
  <div
    class="flex items-center justify-between gap-1 rounded-md border ps-2 pe-1 tabular-nums"
    :class="{
      'border-profit/50 bg-profit/8 text-profit': isProfitable === true,
      'border-loss/50 bg-loss/8 text-loss': isProfitable === false,
      'border-default': isProfitable === null,
    }"
    :title="profitDesc"
  >
    <ProfitSymbol :profit="profitRatio || profitAbs" />

    <div class="flex justify-center items-center grow">
      {{ profitRatio !== undefined ? formatPercent(profitRatio, 2) : '' }}
      <span
        v-if="profitString"
        class="ms-1"
        :class="profitRatio ? 'text-xs opacity-80' : ''"
        :title="stakeCurrency"
        >{{ profitString }}</span
      >
    </div>
  </div>
</template>
