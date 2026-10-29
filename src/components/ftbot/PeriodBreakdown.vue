<script setup lang="ts">
import { TimeSummaryOptions } from '@/types';
import { t } from '@/i18n';

const botStore = useBotStore();
const settingsStore = useSettingsStore();

const props = defineProps<{
  multiBotView?: boolean;
}>();

const hasWeekly = computed(
  () => botStore.activeBot?.botFeatures?.weeklyMonthlyStats || props.multiBotView,
);

const periodicBreakdownSelections = computed(() => {
  const vals = [{ value: TimeSummaryOptions.daily, text: t('period.days') }];
  if (hasWeekly.value) {
    vals.push({ value: TimeSummaryOptions.weekly, text: t('period.weeks') });
    vals.push({ value: TimeSummaryOptions.monthly, text: t('period.months') });
  }
  return vals;
});

const absRelSelections = computed(() => [
  { value: 'abs_profit', text: t('period.amount') },
  { value: 'rel_profit', text: '%' },
]);

const selectedStats = computed(() => {
  if (props.multiBotView) {
    switch (settingsStore.timeProfitPeriod) {
      case TimeSummaryOptions.weekly:
        return botStore.allWeeklyStatsSelectedBots;
      case TimeSummaryOptions.monthly:
        return botStore.allMonthlyStatsSelectedBots;
      default:
        return botStore.allDailyStatsSelectedBots;
    }
  }

  switch (settingsStore.timeProfitPeriod) {
    case TimeSummaryOptions.weekly:
      return botStore.activeBot.weeklyStats;
    case TimeSummaryOptions.monthly:
      return botStore.activeBot.monthlyStats;
    default:
      return botStore.activeBot.dailyStats;
  }
});

const selectedStatsSorted = computed(() => {
  // Sorted version for chart
  return {
    ...selectedStats.value,
    data: selectedStats.value.data
      ? Object.values(selectedStats.value.data).sort((a, b) => (a.date > b.date ? 1 : -1))
      : [],
  };
});

// Days without closed trades are still returned (all zero) - a flat zero line tells nothing.
const hasTrades = computed(() =>
  (selectedStatsSorted.value.data ?? []).some((d) => (d.trade_count ?? 0) > 0),
);

const emptyText = computed(() => {
  switch (settingsStore.timeProfitPeriod) {
    case TimeSummaryOptions.weekly:
      return t('period.emptyWeek');
    case TimeSummaryOptions.monthly:
      return t('period.emptyMonth');
    default:
      return t('period.emptyDay');
  }
});

function refreshSummary() {
  if (props.multiBotView) {
    botStore.allGetTimeSummary(settingsStore.timeProfitPeriod);
  } else {
    botStore.activeBot.getTimeSummary(settingsStore.timeProfitPeriod);
  }
}

onMounted(() => {
  refreshSummary();
});

const tableColumns = computed(() => {
  const cols: { accessorKey: string; header: string }[] = [
    { accessorKey: 'date', header: t('period.day') },
    { accessorKey: 'abs_profit', header: t('period.profit') },
    {
      accessorKey: 'fiat_value',
      header: t('period.inFiat', { currency: selectedStats.value.fiat_display_currency }),
    },
    { accessorKey: 'trade_count', header: t('period.trades') },
  ];
  if (botStore.activeBot.botFeatures.advancedDailyMetrics) {
    cols.push({ accessorKey: 'rel_profit', header: t('period.profitPct') });
  }
  return cols;
});

watch(
  () => settingsStore.timeProfitPeriod,
  () => {
    refreshSummary();
  },
);
</script>

<template>
  <div class="flex h-full flex-col">
    <PanelHeader
      v-if="!props.multiBotView"
      :title="hasWeekly ? $t('period.perPeriod') : $t('period.perDay')"
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="mdi:refresh"
          :title="$t('common.refresh')"
          :aria-label="$t('period.refresh')"
          @click="refreshSummary"
        />
      </template>
      <USegmentedControl
        v-if="hasWeekly"
        v-model="settingsStore.timeProfitPeriod"
        :aria-label="$t('period.periodLabel')"
        :items="periodicBreakdownSelections"
        size="xs"
        label-key="text"
        value-key="value"
      />
      <USegmentedControl
        v-model="settingsStore.timeProfitPreference"
        :aria-label="$t('period.unit')"
        size="xs"
        label-key="text"
        value-key="value"
        :items="absRelSelections"
      />
    </PanelHeader>
    <div v-else class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      <USegmentedControl
        v-if="hasWeekly"
        v-model="settingsStore.timeProfitPeriod"
        :aria-label="$t('period.periodLabel')"
        :items="periodicBreakdownSelections"
        size="xs"
        label-key="text"
        value-key="value"
      />
      <USegmentedControl
        v-model="settingsStore.timeProfitPreference"
        :aria-label="$t('period.unit')"
        size="xs"
        label-key="text"
        value-key="value"
        :items="absRelSelections"
      />
    </div>

    <EmptyState
      v-if="!hasTrades"
      class="flex-1"
      icon="i-mdi-chart-bar"
      :title="$t('period.empty')"
      :description="emptyText"
    />
    <div
      v-else-if="
        !props.multiBotView ||
        botStore.selectedBotCount <= 1 ||
        settingsStore.timeProfitPreference !== 'rel_profit'
      "
      class="min-h-60 flex-1 px-1"
    >
      <TimePeriodChart
        v-if="selectedStats"
        :daily-stats="selectedStatsSorted"
        :show-title="false"
        :profit-col="settingsStore.timeProfitPreference"
      />
    </div>
    <EmptyState
      v-else
      class="flex-1"
      icon="i-mdi-percent"
      :title="$t('period.singleBot')"
      :description="$t('period.singleBotHelp')"
    />
    <div v-if="!props.multiBotView && hasTrades">
      <UTable
        :data="selectedStats.data"
        :columns="tableColumns"
        :ui="{
          td: 'whitespace-normal',
        }"
      >
        <template #abs_profit-cell="{ row }">
          {{ formatPrice(row.original.abs_profit, botStore.activeBot.stakeCurrencyDecimals) }}
        </template>
        <template #fiat_value-cell="{ row }">
          {{ formatPrice(row.original.fiat_value, 2) }}
        </template>
        <template #rel_profit-cell="{ row }">
          {{ formatPercent(row.original.rel_profit, 2) }}
        </template>
      </UTable>
    </div>
  </div>
</template>
