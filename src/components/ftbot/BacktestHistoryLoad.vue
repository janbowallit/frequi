<script setup lang="ts">
import { t } from '@/i18n';
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
      title: t('backtest.deleteTitle'),
      message: t('backtest.deleteMessage', { file: result.filename }),
      confirmText: t('common.delete'),
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
const columns = computed<TableColumn<BacktestHistoryEntry>[]>(() => [
  { accessorKey: 'strategy', header: t('backtest.strategy') },
  { accessorKey: 'timeframe', header: t('backtest.details') },
  { accessorKey: 'backtest_start_time', header: t('backtest.runAt') },
  { accessorKey: 'filename', header: t('backtest.filename') },
  { id: 'actions', header: '' },
]);
</script>

<template>
  <div class="flex flex-col gap-3 text-start">
    <p class="text-sm text-muted">
      {{ $t('backtest.savedHelp') }}
    </p>
    <div class="flex items-center gap-2">
      <UInput
        v-if="botStore.activeBot.backtestHistoryList.length > 0"
        v-model="filterText"
        type="search"
        icon="mdi:magnify"
        :placeholder="$t('backtest.filter')"
        :aria-label="$t('backtest.filterLabel')"
        class="flex-1"
      />
      <UButton
        :title="$t('common.refresh')"
        :aria-label="$t('common.refresh')"
        variant="outline"
        color="neutral"
        icon="mdi:refresh"
        class="ms-auto"
        @click="botStore.activeBot.getBacktestHistory"
      />
    </div>
    <EmptyState
      v-if="botStore.activeBot.backtestHistoryList.length === 0"
      :title="$t('backtest.noSaved')"
      :description="$t('backtest.noSavedHelp')"
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
            :title="$t('backtest.loadThis')"
            icon="mdi:arrow-right"
            :ui="{ leadingIcon: 'rtl:-scale-x-100' }"
            :disabled="row.original.run_id in botStore.activeBot.backtestHistory"
            @click.stop="botStore.activeBot.getBacktestHistoryResult(row.original)"
          />
          <UButton
            v-if="botStore.activeBot.botFeatures.backtestDelete"
            class="ms-1"
            size="sm"
            color="neutral"
            :title="$t('backtest.deleteThis')"
            icon="mdi:delete"
            :disabled="row.original.run_id in botStore.activeBot.backtestHistory"
            @click.stop="deleteBacktestResult(row.original)"
          />
        </div>
      </template>
    </UTable>
  </div>
</template>
