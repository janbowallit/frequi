<script setup lang="ts">
import type { AllProfitStats } from '@/types';
import { t } from '@/i18n';

const props = defineProps<{
  profitAll: AllProfitStats;
  stakeCurrency: string;
  stakeCurrencyDecimals: number;
}>();

const profit = computed(() => {
  if (!props.profitAll?.short) {
    return props.profitAll.all;
  }
  return props.profitAll[selectedOption.value];
});

const profitItems = computed(() => {
  if (!profit.value) return [];
  return [
    {
      metric: t('profit.roiClosed'),
      value: profit.value.profit_closed_coin
        ? `${formatPriceCurrency(
            profit.value.profit_closed_coin,
            props.stakeCurrency,
            props.stakeCurrencyDecimals,
          )} (${formatPercent(profit.value.profit_closed_ratio_mean, 2)})`
        : t('common.na'),
      // (&sum; ${formatPercent(profit.value.profit_closed_ratio_sum,  2,)})`
    },
    {
      metric: t('profit.roiAll'),
      value: profit.value.profit_all_coin
        ? `${formatPriceCurrency(
            profit.value.profit_all_coin,
            props.stakeCurrency,
            props.stakeCurrencyDecimals,
          )} (${formatPercent(profit.value.profit_all_ratio_mean, 2)})`
        : t('common.na'),
      //  (&sum; ${formatPercent(profit.value.profit_all_ratio_sum,2,)})`
    },

    {
      metric: t('profit.tradeCount'),
      value: `${profit.value.trade_count ?? 0}`,
    },
    {
      metric: t('profit.botStarted'),
      value: profit.value.bot_start_timestamp,
      isTs: true,
    },
    {
      metric: t('profit.firstTrade'),
      value: profit.value.first_trade_timestamp,
      isTs: true,
    },
    {
      metric: t('profit.latestTrade'),
      value: profit.value.latest_trade_timestamp,
      isTs: true,
    },
    {
      metric: t('profit.winLoss'),
      value: `${profit.value.winning_trades ?? 0} / ${profit.value.losing_trades ?? 0}`,
    },
    {
      metric: t('profit.winrate'),
      value: `${profit.value.winrate ? formatPercent(profit.value.winrate) : t('common.na')}`,
    },
    {
      metric: t('profit.expectancy'),
      value: `${formatNumber(profit.value.expectancy, 2)} (${formatNumber(profit.value.expectancy_ratio, 2)})`,
    },
    {
      metric: t('profit.cagr'),
      value: `${formatPercent(profit.value.cagr, 2)}`,
    },
    {
      metric: t('profit.calmar'),
      value: `${formatNumber(profit.value.calmar, 2)}`,
    },
    {
      metric: t('profit.sharpe'),
      value: `${formatNumber(profit.value.sharpe, 2)}`,
    },
    {
      metric: t('profit.sortino'),
      value: `${formatNumber(profit.value.sortino, 2)}`,
    },
    {
      metric: t('profit.sqn'),
      value: `${formatNumber(profit.value.sqn, 2)}`,
    },
    {
      metric: t('profit.avgDuration'),
      value: `${profit.value.avg_duration ?? t('common.na')}`,
    },
    {
      metric: t('profit.bestPerforming'),
      value: profit.value.best_pair
        ? `${profit.value.best_pair}: ${formatPercent(profit.value.best_pair_profit_ratio, 2)}`
        : t('common.na'),
    },
    {
      metric: t('profit.tradingVolume'),
      value: `${formatPriceCurrency(
        profit.value.trading_volume ?? 0,
        props.stakeCurrency,
        props.stakeCurrencyDecimals,
      )}`,
    },
    {
      metric: t('profit.profitFactor'),
      value: `${formatNumber(profit.value.profit_factor, 2)}`,
    },
    {
      metric: t('profit.maxDrawdown'),
      value: `${profit.value.max_drawdown ? formatPercent(profit.value.max_drawdown, 2) : t('common.na')} (${
        profit.value.max_drawdown_abs
          ? formatPriceCurrency(
              profit.value.max_drawdown_abs,
              props.stakeCurrency,
              props.stakeCurrencyDecimals,
            )
          : t('common.na')
      }) ${
        profit.value.max_drawdown_start_timestamp && profit.value.max_drawdown_end_timestamp
          ? t('profit.fromTo', {
              from: timestampms(profit.value.max_drawdown_start_timestamp),
              to: timestampms(profit.value.max_drawdown_end_timestamp),
            })
          : ''
      }`,
    },
    {
      metric: t('profit.currentDrawdown'),
      value: `${profit.value.current_drawdown ? formatPercent(profit.value.current_drawdown, 2) : t('common.na')} (${
        profit.value.current_drawdown_abs
          ? formatPriceCurrency(
              profit.value.current_drawdown_abs,
              props.stakeCurrency,
              props.stakeCurrencyDecimals,
            )
          : t('common.na')
      }) ${
        profit.value.current_drawdown_start_timestamp
          ? t('profit.since', { since: timestampms(profit.value.current_drawdown_start_timestamp) })
          : ''
      }`,
    },
  ];
});

const selectedOption = ref('all');
const options = computed(() => [
  { value: 'all', text: t('common.all') },
  { value: 'long', text: t('profit.long') },
  { value: 'short', text: t('profit.short') },
]);
</script>

<template>
  <div>
    <div v-if="profitAll?.long && profitAll?.short" class="flex justify-between items-center">
      <span>{{ $t('profit.profitsFor') }}</span>
      <USegmentedControl
        v-model="selectedOption"
        :items="options"
        label-key="text"
        value-key="value"
      ></USegmentedControl>
      <span>{{ $t('profit.trades') }}</span>
    </div>

    <UTable
      class="text-start"
      :data="profitItems"
      :columns="[
        { accessorKey: 'metric', header: $t('profit.metric') },
        { accessorKey: 'value', header: $t('profit.value') },
      ]"
      :ui="{
        td: 'whitespace-normal',
      }"
    >
      <template #value-cell="{ row }">
        <DateTimeTZ v-if="row.original.isTs" :date="row.original.value" show-timezone />
        <template v-else>
          {{ row.original.value }}
        </template>
      </template>
    </UTable>
  </div>
</template>
