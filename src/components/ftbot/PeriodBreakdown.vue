<script setup lang="ts">
import { TimeSummaryOptions } from '@/types';

const botStore = useBotStore();
const settingsStore = useSettingsStore();

const props = defineProps<{
  multiBotView?: boolean;
}>();

const hasWeekly = computed(
  () => botStore.activeBot?.botFeatures?.weeklyMonthlyStats || props.multiBotView,
);

const periodicBreakdownSelections = computed(() => {
  const vals = [{ value: TimeSummaryOptions.daily, text: 'Days' }];
  if (hasWeekly.value) {
    vals.push({ value: TimeSummaryOptions.weekly, text: 'Weeks' });
    vals.push({ value: TimeSummaryOptions.monthly, text: 'Months' });
  }
  return vals;
});

const absRelSelections = ref([
  { value: 'abs_profit', text: 'Amount' },
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

const periodNoun = computed(() => {
  switch (settingsStore.timeProfitPeriod) {
    case TimeSummaryOptions.weekly:
      return 'week';
    case TimeSummaryOptions.monthly:
      return 'month';
    default:
      return 'day';
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
    { accessorKey: 'date', header: 'Day' },
    { accessorKey: 'abs_profit', header: 'Profit' },
    {
      accessorKey: 'fiat_value',
      header: `In ${selectedStats.value.fiat_display_currency}`,
    },
    { accessorKey: 'trade_count', header: 'Trades' },
  ];
  if (botStore.activeBot.botFeatures.advancedDailyMetrics) {
    cols.push({ accessorKey: 'rel_profit', header: 'Profit%' });
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
    <div class="flex flex-wrap items-center gap-2 px-3 py-2">
      <h3 v-if="!props.multiBotView" class="me-auto text-sm font-semibold text-highlighted">
        {{ hasWeekly ? 'Profit per period' : 'Profit per day' }}
      </h3>
      <USegmentedControl
        v-if="hasWeekly"
        v-model="settingsStore.timeProfitPeriod"
        aria-label="Period"
        :items="periodicBreakdownSelections"
        size="xs"
        label-key="text"
        value-key="value"
      />
      <USegmentedControl
        v-model="settingsStore.timeProfitPreference"
        aria-label="Profit unit"
        size="xs"
        label-key="text"
        value-key="value"
        :items="absRelSelections"
        :class="{ 'ms-auto': props.multiBotView }"
      />
      <UButton
        v-if="!props.multiBotView"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="mdi:refresh"
        title="Refresh"
        aria-label="Refresh profit breakdown"
        @click="refreshSummary"
      />
    </div>

    <EmptyState
      v-if="!hasTrades"
      class="flex-1"
      icon="i-mdi-chart-bar"
      title="No closed trades yet"
      :description="`Profit per ${periodNoun} shows here once the bot closes trades.`"
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
      title="Relative profit needs a single bot"
      description="Select one bot, or switch to absolute profit, to see this chart."
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
