<script setup lang="ts">
import { t } from '@/i18n';
import type { EChartsOption } from 'echarts';
import ECharts from 'vue-echarts';

import { PieChart } from 'echarts/charts';
import {
  DatasetComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { use } from 'echarts/core';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

import type { BalanceValues } from '@/types';

use([
  PieChart,
  CanvasRenderer,
  DatasetComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  LabelLayout,
]);

const balanceChart = ref(null);
const { width } = useElementSize(balanceChart);

const props = withDefaults(
  defineProps<{
    currencies: BalanceValues[];
    showTitle?: boolean;
  }>(),
  {
    showTitle: true,
  },
);
const settingsStore = useSettingsStore();

/** Share of each currency, for the legend (outside slice labels got cut off in narrow panels) */
const shares = computed(() => {
  const total = props.currencies.reduce((a, c) => a + (c.est_stake ?? 0), 0);
  return Object.fromEntries(
    props.currencies.map((c) => [c.currency, total ? (c.est_stake ?? 0) / total : 0]),
  );
});

const balanceChartOptions = computed((): EChartsOption => {
  return {
    title: {
      text: t('charts.balance'),
      show: props.showTitle,
    },
    backgroundColor: 'rgba(0, 0, 0, 0)',
    dataset: {
      dimensions: ['balance', 'currency', 'est_stake', 'free', 'used', 'stake'],
      source: props.currencies,
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        return `${formatPriceCurrency(params.value.balance, params.value.currency, 8)}<br />${
          params.percent
        }% (${formatPriceCurrency(params.value.est_stake, params.value.stake)})`;
      },
    },
    legend: {
      orient: 'vertical',
      right: '4%',
      top: 'middle',
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 10,
      textStyle: { fontSize: 12 },
      formatter: (name: string) => `${name}  ${((shares.value[name] ?? 0) * 100).toFixed(1)}%`,
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['32%', '50%'],
        padAngle: 2,
        itemStyle: { borderRadius: 4 },

        encode: {
          value: 'est_stake',
          itemName: 'currency',
          tooltip: ['balance', 'currency'],
        },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
        tooltip: {
          show: true,
        },
      },
    ],
  };
});
</script>

<template>
  <ECharts
    class="min-h-[20px]"
    dir="ltr"
    v-if="currencies"
    ref="balanceChart"
    :option="balanceChartOptions"
    :theme="settingsStore.chartTheme"
    :style="{ height: Math.min(width * 0.5, 220) + 'px' }"
    autoresize
  />
</template>
