<script setup lang="ts">
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
    [PerformanceOptions.performance]: { key: 'pair', label: 'Pair' },
    [PerformanceOptions.entryStats]: {
      key: 'enter_tag',
      label: 'Enter tag',
      formatter: (v: unknown) => formatTextLen(v as string, textLength),
    },
    [PerformanceOptions.exitStats]: {
      key: 'exit_reason',
      label: 'Exit Reason',
      formatter: (v: unknown) => formatTextLen(v as string, textLength),
    },
    [PerformanceOptions.mixTagStats]: {
      key: 'mix_tag',
      label: 'Mix Tag',
      formatter: (v: unknown) => formatTextLen(v as string, textLength),
    },
  };
  return [
    initialCol[selectedOption.value],
    { key: 'profit', label: 'Profit %' },
    {
      key: 'profit_abs',
      label: `Profit ${botStore.activeBot.botState?.stake_currency}`,
      formatter: (v: unknown) => formatPrice(v as number, 5),
    },
    { key: 'count', label: 'Count' },
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

const options = [
  { value: PerformanceOptions.performance, text: 'Pairs' },
  { value: PerformanceOptions.entryStats, text: 'Entry tags' },
  { value: PerformanceOptions.exitStats, text: 'Exit reasons' },
  { value: PerformanceOptions.mixTagStats, text: 'Mixed' },
];

const emptyText = computed(
  () =>
    ({
      [PerformanceOptions.performance]: 'Profit per pair shows here once trades close.',
      [PerformanceOptions.entryStats]: 'Profit per entry tag shows here once trades close.',
      [PerformanceOptions.exitStats]: 'Profit per exit reason shows here once trades close.',
      [PerformanceOptions.mixTagStats]:
        'Profit per entry tag and exit reason shows here once trades close.',
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
    meta: index === 0 ? undefined : { class: { th: 'text-right', td: 'text-right tabular-nums' } },
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
    <PanelHeader title="Performance">
      <template #actions>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="mdi:refresh"
          title="Refresh"
          aria-label="Refresh performance"
          :loading="loading"
          @click="refreshSummary"
        />
      </template>
      <USegmentedControl
        v-if="botStore.activeBot.botFeatures.hasAdvancedStats"
        v-model="selectedOption"
        aria-label="Group profit by"
        :items="options"
        label-key="text"
        value-key="value"
        size="xs"
      />
    </PanelHeader>
    <EmptyState
      v-if="!performanceData?.length"
      title="No closed trades yet"
      :description="emptyText"
      icon="mdi:chart-line"
    />
    <UTable
      v-else
      :data="performanceData"
      :columns="tableColumns"
      :ui="{ th: 'px-3', td: 'px-3 py-2' }"
    />
  </div>
</template>
