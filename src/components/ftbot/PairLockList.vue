<script setup lang="ts">
import type { Lock } from '@/types';
import type { TableColumn } from '@nuxt/ui';
import { h } from 'vue';

const botStore = useBotStore();

const columns: TableColumn<Lock>[] = [
  { accessorKey: 'pair', header: 'Pair' },
  { accessorKey: 'lock_end_timestamp', header: 'Until' },
  { accessorKey: 'reason', header: 'Reason' },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, 'Actions') },
];

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
    <PanelHeader title="Pair locks" description="Locked pairs can't be entered until the lock ends">
      <template #actions>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="mdi:refresh"
          title="Refresh"
          aria-label="Refresh pair locks"
          :loading="loading"
          @click="refreshLocks"
        />
      </template>
    </PanelHeader>
    <EmptyState
      v-if="botStore.activeBot.activeLocks.length === 0"
      title="No active locks"
      description="Protections and manual locks show here."
      icon="mdi:lock-open-variant-outline"
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
          icon="mdi:delete"
          :title="`Delete lock on ${row.original.pair}`"
          :aria-label="`Delete lock on ${row.original.pair}`"
          @click="removePairLock(row.original)"
        />
      </template>
    </UTable>
  </div>
</template>
