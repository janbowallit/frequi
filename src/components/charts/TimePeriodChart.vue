<script setup lang="ts">
import { t } from '@/i18n';
import ECharts from 'vue-echarts';
// import { EChartsOption } from 'echarts';
import { format as echartsFormat } from 'echarts';

import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
  VisualMapComponent,
} from 'echarts/components';

import { registerTransform } from 'echarts';

import type { TimeSummaryCols, TimeSummaryReturnValue } from '@/types';
import type { EChartsOption } from 'echarts';

use([
  BarChart,
  LineChart,
  CanvasRenderer,
  GridComponent,
  DatasetComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  TransformComponent,
]);

const props = withDefaults(
  defineProps<{
    dailyStats: TimeSummaryReturnValue;
    showTitle?: boolean;
    profitCol: TimeSummaryCols;
  }>(),
  {
    showTitle: true,
  },
);

// Define Column labels here to avoid typos
const CHART_PROFIT = computed(() =>
  props.profitCol === 'abs_profit' ? t('charts.absoluteProfit') : t('charts.relativeProfit'),
);
const chartTradeCount = () => t('charts.tradeCount');

const settingsStore = useSettingsStore();
const colorStore = useColorStore();

const dailyChart = ref(null);

const absoluteMin = computed(
  () =>
    props.dailyStats.data.reduce(
      (min, p) => (p[props.profitCol] < min ? p[props.profitCol] : min),
      props.dailyStats.data[0]?.[props.profitCol] ?? 0,
    ) * (props.profitCol === 'rel_profit' ? 100 : 1),
);
const absoluteMax = computed(
  () =>
    props.dailyStats.data.reduce(
      (max, p) => (p[props.profitCol] > max ? p[props.profitCol] : max),
      props.dailyStats.data[0]?.[props.profitCol] ?? 0,
    ) * (props.profitCol === 'rel_profit' ? 100 : 1),
);

registerTransform(ftEchartsTransforms.multiple);

const dailyChartOptions: ComputedRef<EChartsOption> = computed(() => {
  return {
    title: {
      text: t('charts.dailyProfit'),
      show: props.showTitle,
    },
    backgroundColor: 'rgba(0, 0, 0, 0)',
    dataset: [
      {
        dimensions: ['date', 'rel_profit', 'abs_profit', 'trade_count'],
        source: props.dailyStats.data,
      },
      {
        transform: {
          type: 'ft:multiple',
          config: { dimension: 'rel_profit', factor: 100 },
        },
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        label: {
          backgroundColor: '#6a7985',
        },
      },
      formatter: (params) => {
        const entry = params[0];
        const data = entry?.data ?? {};
        const date = entry?.axisValue ?? '';

        const absProfit =
          typeof data.abs_profit === 'number' ? formatNumber(data.abs_profit, 3) : '-';

        let relProfit: string;

        if (typeof data.rel_profit === 'number') {
          relProfit = formatNumber(data.rel_profit, 2) + '%';
        } else {
          relProfit = '-';
        }

        const tradeCount = data.trade_count ?? '-';

        return `
          ${echartsFormat.encodeHTML(date)}<br/>
          <div style=">
            <div style="display: flex; justify-content: space-between;">
              <span>${params[0].marker} Profit:</span> <span style="margin-left: 2em">
              <strong>${echartsFormat.encodeHTML(absProfit)} (${echartsFormat.encodeHTML(relProfit)})</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>${params[1].marker} Trade count:</span>
              <span style="margin-left: 2em"><strong>${echartsFormat.encodeHTML(tradeCount)}</strong></span>
            </div>
          </div>
        `;
      },
    },
    legend: {
      data: [
        {
          name: CHART_PROFIT.value,
          icon: 'roundRect',
          itemStyle: { color: colorStore.colorProfit },
        },
        { name: chartTradeCount(), icon: 'roundRect' },
      ],
      top: 0,
      left: 'center',
      itemWidth: 12,
      itemHeight: 8,
    },
    xAxis: [
      {
        type: 'category',
      },
    ],
    visualMap: [
      {
        dimension: props.profitCol === 'rel_profit' ? 1 : 2,
        seriesIndex: 0,
        show: false,
        pieces: [
          {
            max: 0.0,
            min: absoluteMin.value,
            color: colorStore.colorLoss,
          },
          {
            min: 0.0,
            max: absoluteMax.value,
            color: colorStore.colorProfit,
          },
        ],
      },
    ],
    yAxis: [
      {
        type: 'value',
        splitLine: {
          show: false,
        },
        axisLabel: {
          formatter: (value) => {
            return props.profitCol === 'rel_profit' ? `${value}%` : `${value}`;
          },
        },
      },
      {
        type: 'value',
        minInterval: 1,
      },
    ],
    grid: {
      left: 8,
      right: 8,
      top: 32,
      bottom: 8,
      containLabel: true,
    },
    series: [
      {
        type: 'line',
        name: CHART_PROFIT.value,
        symbolSize: 5,
        // Color is induced by visualMap
        datasetIndex: 1,
        encode: {
          x: 'date',
          y: props.profitCol === 'rel_profit' ? 'rel_profit' : 'abs_profit',
        },
      },
      {
        type: 'bar',
        name: chartTradeCount(),
        itemStyle: {
          color: 'rgba(150,150,150,0.3)',
        },
        yAxisIndex: 1,
        datasetIndex: 1,
        encode: {
          x: 'date',
          y: 'trade_count',
        },
      },
    ],
  };
});
</script>

<template>
  <ECharts
    class="h-full min-h-[240px]"
    dir="ltr"
    v-if="dailyStats.data"
    ref="dailyChart"
    :option="dailyChartOptions"
    :theme="settingsStore.chartTheme"
    :style="{ height: '100%' }"
    autoresize
  />
</template>
