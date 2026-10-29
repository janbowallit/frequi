<script setup lang="ts">
import { t } from '@/i18n';
const botStore = useBotStore();
enum PerformanceOptions {
  performance = 'performance',
  entryStats = 'entryStats',
  exitStats = 'exitStats',
  mixTagStats = 'mixTagStats',
}
const selectedOption = ref<PerformanceOptions>(PerformanceOptions.performance);

function formatTextLen(text: string, len: number) {
  if (text.length > len) {
    return text.substring(0, len) + '...';
  }
  return text;
}

const performanceTable = computed<
  {
    key: string;
    label: string;
    formatter?: (v: unknown) => string;
  }[]
>(() => {
  const textLength = 17;
  const initialCol = {
    [PerformanceOptions.performance]: { key: 'pair', label: t('performance.pair') },
    [PerformanceOptions.entryStats]: {
      key: 'enter_tag',
      label: t('performance.enterTag'),
      formatter: (v: unknown) => formatTextLen(v as string, textLength),
    },
    [PerformanceOptions.exitStats]: {
      key: 'exit_reason',
      label: t('performance.exitReason'),
      formatter: (v: unknown) => formatTextLen(v as string, textLength),
    },
    [PerformanceOptions.mixTagStats]: {
      key: 'mix_tag',
      label: t('performance.mixTag'),
      formatter: (v: unknown) => formatTextLen(v as string, textLength),
    },
  };
  return [
    initialCol[selectedOption.value],
    { key: 'profit', label: t('performance.profitPct') },
    {
      key: 'profit_abs',
      label: t('performance.profitIn', {
        currency: botStore.activeBot.botState?.stake_currency ?? '',
      }),
      formatter: (v: unknown) => formatPrice(v as number, 5),
    },
    { key: 'count', label: t('performance.count') },
  ];
});

const performanceData = computed(() => {
  if (selectedOption.value === PerformanceOptions.performance) {
    return botStore.activeBot.performanceStats;
  }
  if (selectedOption.value === PerformanceOptions.entryStats) {
    return botStore.activeBot.entryStats;
  }
  if (selectedOption.value === PerformanceOptions.exitStats) {
    return botStore.activeBot.exitStats;
  }
  if (selectedOption.value === PerformanceOptions.mixTagStats) {
    return botStore.activeBot.mixTagStats;
  }
  return [];
});

const options = computed(() => [
  { value: PerformanceOptions.performance, text: t('performance.pairs') },
  { value: PerformanceOptions.entryStats, text: t('performance.entryTags') },
  { value: PerformanceOptions.exitStats, text: t('performance.exitReasons') },
  { value: PerformanceOptions.mixTagStats, text: t('performance.mixed') },
]);

const emptyText = computed(
  () =>
    ({
      [PerformanceOptions.performance]: t('performance.emptyPairs'),
      [PerformanceOptions.entryStats]: t('performance.emptyEntry'),
      [PerformanceOptions.exitStats]: t('performance.emptyExit'),
      [PerformanceOptions.mixTagStats]: t('performance.emptyMixed'),
    })[selectedOption.value],
);
const loading = ref(false);

async function refreshSummary() {
  loading.value = true;
  try {
    await loadSummary();
  } finally {
    loading.value = false;
  }
}

async function loadSummary() {
  if (selectedOption.value === PerformanceOptions.performance) {
    return botStore.activeBot.getPerformance();
  }
  if (selectedOption.value === PerformanceOptions.entryStats) {
    return botStore.activeBot.getEntryStats();
  }
  if (selectedOption.value === PerformanceOptions.exitStats) {
    return botStore.activeBot.getExitStats();
  }
  if (selectedOption.value === PerformanceOptions.mixTagStats) {
    return botStore.activeBot.getMixTagStats();
  }
}

onMounted(() => {
  refreshSummary();
});

const tableColumns = computed(() => {
  return performanceTable.value.map((field, index) => ({
    accessorKey: field.key,
    header: field.label,
    // Numbers line up on the right
    meta: index === 0 ? undefined : { class: { th: 'text-end', td: 'text-end tabular-nums' } },
    cell: ({ row }: { row: { original: Record<string, unknown> } }) =>
      field.formatter ? field.formatter(row.original[field.key]) : row.original[field.key],
  }));
});

watch(selectedOption, () => {
  refreshSummary();
});
</script>
<template>
  <div class="flex flex-col">
    <PanelHeader :title="$t('performance.title')">
      <template #actions>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="lucide:refresh-cw"
          :title="$t('common.refresh')"
          :aria-label="$t('performance.refresh')"
          :loading="loading"
          @click="refreshSummary"
        />
      </template>
      <USegmentedControl
        v-if="botStore.activeBot.botFeatures.hasAdvancedStats"
        v-model="selectedOption"
        :aria-label="$t('performance.groupBy')"
        :items="options"
        label-key="text"
        value-key="value"
        size="xs"
      />
    </PanelHeader>
    <EmptyState
      v-if="!performanceData?.length"
      :title="$t('performance.empty')"
      :description="emptyText"
      icon="lucide:chart-line"
    />
    <UTable
      v-else
      :data="performanceData"
      :columns="tableColumns"
      :ui="{ th: 'px-3', td: 'px-3 py-2' }"
    />
  </div>
</template>
