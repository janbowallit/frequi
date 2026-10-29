<script setup lang="ts">
import { metricLabel, t } from '@/i18n';
import type { ExitReasonResults, PairResult } from '@/types';

type ResultsType = PairResult | ExitReasonResults;
type ResultsTypeWithKey = ResultsType & { key?: string | string[] };
const props = withDefaults(
  defineProps<{
    title: string;
    results: ResultsType[];
    stakeCurrency: string;
    stakeCurrencyDecimals: number;
    keyHeader?: string;
    keyHeaders?: string[];
  }>(),
  {
    keyHeader: '',
    keyHeaders: () => [],
  },
);

const tableItems = computed<ResultsTypeWithKey[]>(() =>
  props.results.map((v) => {
    if (props.keyHeaders.length > 0) {
      return {
        ...v,
        key:
          typeof v['key'] === 'string' ? Array(props.keyHeaders.length).fill(v['key']) : v['key'],
      };
    }
    return v;
  }),
);

const perTagReason = computed(() => {
  const firstFields: {
    key: string;
    label: string;
    formatter: (value: string, item: ResultsTypeWithKey) => string;
  }[] = [];
  if (props.keyHeaders.length > 0) {
    // Keys could be an array
    for (const [i, header] of props.keyHeaders.entries()) {
      firstFields.push({
        key: `key[${i}]`,
        label: header,
        formatter: (value, item) =>
          Array.isArray(value) ? value[i] : value || item['exit_reason'] || 'OTHER',
      });
    }
  } else {
    firstFields.push({
      key: 'key',
      label: props.keyHeader,
      formatter: (value, item) => (value || item['exit_reason'] || 'OTHER') as string,
    });
  }
  return firstFields;
});

const settingsStore = useSettingsStore();

const metrics = computed(() =>
  availableBacktestMetrics.value.filter(
    (metric) =>
      metric.field !== 'key' && settingsStore.backtestAdditionalMetrics.includes(metric.field),
  ),
);

/** The selectable metric columns, named in the UI language */
const metricItems = computed(() =>
  availableBacktestMetrics.value.map((m) => ({ ...m, header: metricLabel(m.header) })),
);

const tableColumns = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cols: any[] = [];

  // Dynamic first columns (key/tags)
  perTagReason.value.forEach((col, i) => {
    cols.push({
      id: `key_${i}`,
      header: col.label,
      cell: ({ row }) => col.formatter(row.original['key'] as string, row.original),
    });
  });

  // Fixed metric columns
  cols.push({ accessorKey: 'trades', header: t('backtest.trades') });
  cols.push({
    id: 'profit_mean',
    header: t('backtest.avgProfit'),
    cell: ({ row }) => formatPercent(row.original.profit_mean, 2),
  });
  cols.push({
    id: 'profit_total_abs',
    header: t('backtest.totProfitIn', { currency: props.stakeCurrency }),
    cell: ({ row }) => formatPrice(row.original.profit_total_abs, props.stakeCurrencyDecimals),
  });
  cols.push({
    id: 'profit_total',
    header: t('backtest.totProfit'),
    cell: ({ row }) => formatPercent(row.original.profit_total, 2),
  });
  cols.push({ accessorKey: 'wins', header: t('backtest.wins') });
  cols.push({ accessorKey: 'draws', header: t('backtest.draws') });
  cols.push({ accessorKey: 'losses', header: t('backtest.losses') });

  // Dynamic additional metric columns
  metrics.value.forEach((col) => {
    cols.push({
      accessorKey: col.field,
      header: metricLabel(col.header),
      cell: ({ row }) =>
        col.is_ratio
          ? formatPercent(row.original[col.field as keyof ResultsTypeWithKey] as number, 2)
          : formatPrice(row.original[col.field as keyof ResultsTypeWithKey] as number, 2),
    });
  });

  return cols;
});
</script>
<template>
  <PanelSection :title="title">
    <template #actions>
      <USelectMenu
        v-model="settingsStore.backtestAdditionalMetrics"
        multiple
        :items="metricItems"
        label-key="header"
        value-key="field"
        :placeholder="$t('backtest.columns')"
        :aria-label="$t('backtest.columnsLabel')"
        size="sm"
        class="w-48"
        icon="lucide:columns-3"
      />
    </template>
    <UTable :data="tableItems" :columns="tableColumns" />
  </PanelSection>
</template>
