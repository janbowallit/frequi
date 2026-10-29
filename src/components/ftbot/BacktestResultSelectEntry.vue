<script setup lang="ts">
import type { BacktestResultInMemory } from '@/types';

withDefaults(
  defineProps<{
    backtestResult: BacktestResultInMemory;
    selectedBacktestResultKey?: string;
    canUseModify?: boolean;
  }>(),
  {
    selectedBacktestResultKey: '',
    canUseModify: false,
  },
);
</script>

<template>
  <div class="flex min-w-0 flex-col text-start">
    <p class="truncate font-medium text-highlighted">
      {{ backtestResult.metadata.strategyName }}
      <span class="font-normal text-muted">{{ backtestResult.strategy.timeframe }}</span>
    </p>
    <p class="text-xs text-muted tabular-nums">
      {{ $t('backtest.tradesCount', { n: backtestResult.strategy.total_trades }) }}
      <span :class="backtestResult.strategy.profit_total >= 0 ? 'text-profit' : 'text-loss'">{{
        formatPercent(backtestResult.strategy.profit_total)
      }}</span>
    </p>
    <p
      v-if="canUseModify && backtestResult.metadata.notes"
      class="text-xs whitespace-pre-wrap text-muted"
    >
      {{ backtestResult.metadata.notes }}
    </p>
  </div>
</template>
