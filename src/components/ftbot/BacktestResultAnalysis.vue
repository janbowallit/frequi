<script setup lang="ts">
import type { StrategyBacktestResult } from '@/types';

const props = defineProps<{
  backtestResult: StrategyBacktestResult;
}>();

const backtestResultStats = computed(() => {
  const tmp = generateBacktestMetricRows(props.backtestResult);
  return formatObjectForTable({ value: tmp }, 'metric');
});

const backtestResultSettings = computed(() => {
  // Transpose Result into readable format
  const tmp = generateBacktestSettingRows(props.backtestResult);

  return formatObjectForTable({ value: tmp }, 'setting');
});
</script>

<template>
  <div class="flex w-full flex-col gap-4 text-start">
    <h2 class="text-base font-semibold text-highlighted">
      {{ backtestResult.strategy_name }}
    </h2>
    <div class="grid gap-4 xl:grid-cols-2">
      <PanelSection title="Metrics">
        <UTable
          :data="backtestResultStats"
          :columns="[
            { accessorKey: 'metric', header: 'Metric' },
            { accessorKey: 'value', header: 'Value' },
          ]"
        />
      </PanelSection>
      <PanelSection title="Strategy settings">
        <UTable
          :data="backtestResultSettings"
          :columns="[
            { accessorKey: 'setting', header: 'Setting' },
            { accessorKey: 'value', header: 'Value' },
          ]"
        />
      </PanelSection>
    </div>
    <BacktestResultTablePer
      title="By entry tag"
      :results="backtestResult.results_per_enter_tag"
      :stake-currency="backtestResult.stake_currency"
      key-header="Entry tag"
      :stake-currency-decimals="backtestResult.stake_currency_decimals"
    />

    <BacktestResultTablePer
      title="By exit reason"
      :results="backtestResult.exit_reason_summary ?? []"
      :stake-currency="backtestResult.stake_currency"
      key-header="Exit reason"
      :stake-currency-decimals="backtestResult.stake_currency_decimals"
    />

    <BacktestResultTablePer
      v-if="backtestResult.mix_tag_stats"
      title="By entry and exit tag"
      :results="backtestResult.mix_tag_stats ?? []"
      :stake-currency="backtestResult.stake_currency"
      :key-headers="['Entry tag', 'Exit tag']"
      :stake-currency-decimals="backtestResult.stake_currency_decimals"
    />

    <BacktestResultTablePer
      title="By pair"
      :results="backtestResult.results_per_pair"
      :stake-currency="backtestResult.stake_currency"
      key-header="Pair"
      :stake-currency-decimals="backtestResult.stake_currency_decimals"
    />
    <PanelSection v-if="backtestResult.periodic_breakdown" title="Periodic breakdown">
      <BacktestResultPeriodBreakdown :periodic-breakdown="backtestResult.periodic_breakdown">
      </BacktestResultPeriodBreakdown>
    </PanelSection>

    <PanelSection title="Single trades">
      <TradeList
        :trades="backtestResult.trades"
        :show-filter="true"
        :stake-currency="backtestResult.stake_currency"
      />
    </PanelSection>
  </div>
</template>
