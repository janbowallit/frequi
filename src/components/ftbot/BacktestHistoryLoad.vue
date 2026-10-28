<script setup lang="ts">
import type { BacktestHistoryEntry } from '@/types';
import type { TableColumn } from '@nuxt/ui';

const botStore = useBotStore();
const { confirm } = useConfirmBox();
const filterText = ref('');
const filterTextDebounced = refDebounced(filterText, 350, { maxWait: 1000 });

onMounted(() => {
  botStore.activeBot.getBacktestHistory();
});

async function deleteBacktestResult(result: BacktestHistoryEntry) {
  if (
    await confirm({
      title: 'Delete result?',
      message: `Delete ${result.filename} from disk? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    })
  ) {
    botStore.activeBot.deleteBacktestHistoryResult(result);
  }
}

const filteredList = computed(() =>
  botStore.activeBot.backtestHistoryList.filter(
    (r) =>
      r.filename.toLowerCase().includes(filterTextDebounced.value.toLowerCase()) ||
      r.strategy.toLowerCase().includes(filterTextDebounced.value.toLowerCase()),
  ),
);
const columns: TableColumn<BacktestHistoryEntry>[] = [
  { accessorKey: 'strategy', header: 'Strategy' },
  { accessorKey: 'timeframe', header: 'Details' },
  { accessorKey: 'backtest_start_time', header: 'Run at' },
  { accessorKey: 'filename', header: 'Filename' },
  { id: 'actions', header: '' },
];
</script>

<template>
  <div class="flex flex-col gap-3 text-left">
    <p class="text-sm text-muted">
      Results saved on the bot's disk. Click a row to load it; you can load several to compare.
    </p>
    <div class="flex items-center gap-2">
      <UInput
        v-if="botStore.activeBot.backtestHistoryList.length > 0"
        v-model="filterText"
        type="search"
        icon="mdi:magnify"
        placeholder="Filter by strategy or file"
        aria-label="Filter results"
        class="flex-1"
      />
      <UButton
        title="Refresh"
        aria-label="Refresh"
        variant="outline"
        color="neutral"
        icon="mdi:refresh"
        class="ms-auto"
        @click="botStore.activeBot.getBacktestHistory"
      />
    </div>
    <EmptyState
      v-if="botStore.activeBot.backtestHistoryList.length === 0"
      title="No saved results"
      description="Results appear here after a backtest finishes."
      icon="mdi:history"
    />
    <UTable
      v-if="botStore.activeBot.backtestHistoryList.length > 0"
      class="max-h-[70dvh]"
      :data="filteredList"
      :columns="columns"
      :virtualize="{ estimateSize: 38, overscan: 12 }"
      sticky
      @select="(e, row) => botStore.activeBot.getBacktestHistoryResult(row.original)"
    >
      <template #timeframe-cell="{ row }">
        <strong>{{ row.original.timeframe }}</strong>
        <span v-if="row.original.backtest_start_ts && row.original.backtest_end_ts" class="ms-1">
          {{ timestampToTimeRangeString(row.original.backtest_start_ts * 1000) }}-{{
            timestampToTimeRangeString(row.original.backtest_end_ts * 1000)
          }}</span
        >
      </template>
      <template #backtest_start_time-cell="{ row }">
        <DateTimeTZ :date="row.original.backtest_start_time * 1000" />
      </template>
      <template #actions-cell="{ row }">
        <div class="flex items-center">
          <InfoBox
            v-if="botStore.activeBot.botFeatures.backtestSetNotes"
            :class="row.original.notes ? 'opacity-100' : 'opacity-0'"
            :hint="row.original.notes ?? ''"
          ></InfoBox>
          <UButton
            v-if="botStore.activeBot.botFeatures.backtestDelete"
            class="ms-1"
            size="sm"
            variant="solid"
            title="Load this Result."
            icon="mdi:arrow-right"
            :disabled="row.original.run_id in botStore.activeBot.backtestHistory"
            @click.stop="botStore.activeBot.getBacktestHistoryResult(row.original)"
          />
          <UButton
            v-if="botStore.activeBot.botFeatures.backtestDelete"
            class="ms-1"
            size="sm"
            color="neutral"
            title="Delete this Result."
            icon="mdi:delete"
            :disabled="row.original.run_id in botStore.activeBot.backtestHistory"
            @click.stop="deleteBacktestResult(row.original)"
          />
        </div>
      </template>
    </UTable>
  </div>
</template>
