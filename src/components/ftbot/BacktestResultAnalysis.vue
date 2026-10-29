<script setup lang="ts">
import type { StrategyBacktestResult } from '@/types';
import { metricLabel } from '@/i18n';

const props = defineProps<{
  backtestResult: StrategyBacktestResult;
}>();

const backtestResultStats = computed(() => {
  const tmp = generateBacktestMetricRows(props.backtestResult);
  return formatObjectForTable({ value: tmp }, 'metric').map((row) => ({
    ...row,
    metric: metricLabel(String(row.metric)),
  }));
});

const backtestResultSettings = computed(() => {
  // Transpose Result into readable format
  const tmp = generateBacktestSettingRows(props.backtestResult);

  return formatObjectForTable({ value: tmp }, 'setting').map((row) => ({
    ...row,
    setting: metricLabel(String(row.setting)),
  }));
});
</script>

<template>
  <div class="flex w-full flex-col gap-4 text-start">
    <h2 class="text-base font-semibold text-highlighted">
      {{ backtestResult.strategy_name }}
    </h2>
    <div class="grid gap-4 xl:grid-cols-2">
      <PanelSection :title="$t('backtest.metrics')">
        <UTable
          :data="backtestResultStats"
          :columns="[
            { accessorKey: 'metric', header: $t('backtest.metric') },
            { accessorKey: 'value', header: $t('backtest.value') },
          ]"
        />
      </PanelSection>
      <PanelSection :title="$t('backtest.settings')">
        <UTable
          :data="backtestResultSettings"
          :columns="[
            { accessorKey: 'setting', header: $t('backtest.setting') },
            { accessorKey: 'value', header: $t('backtest.value') },
          ]"
        />
      </PanelSection>
    </div>
    <BacktestResultTablePer
      :title="$t('backtest.byEntryTag')"
      :results="backtestResult.results_per_enter_tag"
      :stake-currency="backtestResult.stake_currency"
      key-header="Entry tag"
      :stake-currency-decimals="backtestResult.stake_currency_decimals"
    />

    <BacktestResultTablePer
      :title="$t('backtest.byExitReason')"
      :results="backtestResult.exit_reason_summary ?? []"
      :stake-currency="backtestResult.stake_currency"
      key-header="Exit reason"
      :stake-currency-decimals="backtestResult.stake_currency_decimals"
    />

    <BacktestResultTablePer
      v-if="backtestResult.mix_tag_stats"
      :title="$t('backtest.byEntryExit')"
      :results="backtestResult.mix_tag_stats ?? []"
      :stake-currency="backtestResult.stake_currency"
      :key-headers="[$t('backtest.entryTag'), $t('backtest.exitTag')]"
      :stake-currency-decimals="backtestResult.stake_currency_decimals"
    />

    <BacktestResultTablePer
      :title="$t('backtest.byPair')"
      :results="backtestResult.results_per_pair"
      :stake-currency="backtestResult.stake_currency"
      key-header="Pair"
      :stake-currency-decimals="backtestResult.stake_currency_decimals"
    />
    <PanelSection v-if="backtestResult.periodic_breakdown" :title="$t('backtest.periodic')">
      <BacktestResultPeriodBreakdown :periodic-breakdown="backtestResult.periodic_breakdown">
      </BacktestResultPeriodBreakdown>
    </PanelSection>

    <PanelSection :title="$t('backtest.singleTrades')">
      <TradeList
        :trades="backtestResult.trades"
        :show-filter="true"
        :stake-currency="backtestResult.stake_currency"
      />
    </PanelSection>
  </div>
</template>
