<script setup lang="ts">
import type { Lock } from '@/types';
import type { TableColumn } from '@nuxt/ui';
import { h } from 'vue';
import { t } from '@/i18n';

const botStore = useBotStore();

const columns = computed<TableColumn<Lock>[]>(() => [
  { accessorKey: 'pair', header: t('pairs.locksPair') },
  { accessorKey: 'lock_end_timestamp', header: t('pairs.until') },
  { accessorKey: 'reason', header: t('pairs.reason') },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, t('pairs.actions')) },
]);

const loading = ref(false);
async function refreshLocks() {
  loading.value = true;
  try {
    await botStore.activeBot.getLocks();
  } finally {
    loading.value = false;
  }
}

function removePairLock(item: Lock) {
  if (item.id !== undefined) {
    botStore.activeBot.deleteLock(item.id);
  } else {
    showAlert('This Freqtrade version does not support deleting locks.');
  }
}
</script>

<template>
  <div class="flex flex-col">
    <PanelHeader :title="$t('pairs.locksTitle')" :description="$t('pairs.locksHelp')">
      <template #actions>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="lucide:refresh-cw"
          :title="$t('common.refresh')"
          :aria-label="$t('pairs.refreshLocks')"
          :loading="loading"
          @click="refreshLocks"
        />
      </template>
    </PanelHeader>
    <EmptyState
      v-if="botStore.activeBot.activeLocks.length === 0"
      :title="$t('pairs.noLocks')"
      :description="$t('pairs.noLocksHelp')"
      icon="lucide:lock-open"
    />
    <UTable
      v-else
      :data="botStore.activeBot.activeLocks"
      :columns="columns"
      :ui="{ th: 'px-3', td: 'whitespace-normal px-3 py-2' }"
    >
      <template #lock_end_timestamp-cell="{ row }">
        <span class="tabular-nums">{{ timestampms(row.original.lock_end_timestamp) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="lucide:trash-2"
          :title="$t('pairs.deleteLock', { pair: row.original.pair })"
          :aria-label="$t('pairs.deleteLock', { pair: row.original.pair })"
          @click="removePairLock(row.original)"
        />
      </template>
    </UTable>
  </div>
</template>
