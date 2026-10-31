<script setup lang="ts">
/** Closed trades of the shown month (or the picked day), with journal tags and filters. */
import { getPaginationRowModel } from '@tanstack/vue-table';
import type { TableColumn, TableRow } from '@nuxt/ui';
import type { ClosedTrade } from '@/types';
import { t } from '@/i18n';
import { ALL_TAGS, tagFilterItems } from '@/utils/journal';

const botStore = useBotStore();
const { trades, selectedDay, tagFilter, notesOnly, allTags, journalFor } = useJournal();

const multiBot = computed(() => botStore.botCount > 1);
const pagination = ref({ pageIndex: 0, pageSize: 25 });
watch([selectedDay, tagFilter, notesOnly], () => (pagination.value.pageIndex = 0));

const columns = computed<TableColumn<ClosedTrade>[]>(() => [
  ...(multiBot.value ? [{ accessorKey: 'botName', header: t('trades.bot') }] : []),
  { accessorKey: 'pair', header: t('trades.pair') },
  { accessorKey: 'close_timestamp', header: t('trades.closed') },
  { id: 'duration', header: t('journal.duration') },
  { accessorKey: 'profit', header: t('trades.profit') },
  { accessorKey: 'exit_reason', header: t('trades.exitReason') },
  { id: 'journal', header: t('journal.notes') },
]);

const tagItems = computed(() => tagFilterItems(allTags.value, t('journal.allTags')));
const tagModel = computed({
  get: () => tagFilter.value ?? ALL_TAGS,
  set: (value: string) => (tagFilter.value = value === ALL_TAGS ? null : value),
});

function duration(trade: ClosedTrade) {
  return humanizeDurationFromSeconds((trade.close_timestamp - trade.open_timestamp) / 1000);
}

function openTrade(_e: Event, row: TableRow<ClosedTrade>) {
  const trade = row.original;
  if (botStore.selectedBot !== trade.botId) botStore.selectBot(trade.botId);
  botStore.activeBot.setDetailTrade(trade);
}
</script>

<template>
  <!-- The table runs edge to edge (its cells have their own padding); the rest is inset -->
  <div class="flex flex-col gap-3 py-3 sm:py-4">
    <div class="flex flex-wrap items-center gap-3 px-3 sm:px-4">
      <UBadge
        v-if="selectedDay"
        color="primary"
        variant="soft"
        size="lg"
        class="cursor-pointer gap-1 pointer-coarse:min-h-11"
        as="button"
        :aria-label="$t('journal.clearDay')"
        @click="selectedDay = null"
      >
        {{ selectedDay }}
        <UIcon name="i-lucide-x" />
      </UBadge>
      <USelect
        v-if="allTags.length"
        v-model="tagModel"
        :items="tagItems"
        class="w-40"
        :aria-label="$t('journal.tagFilter')"
      />
      <USwitch v-model="notesOnly" :label="$t('journal.notesOnly')" />
    </div>

    <p v-if="!trades.length" class="px-3 py-8 text-center text-sm text-muted sm:px-4">
      {{ selectedDay ? $t('journal.emptyDay') : $t('journal.emptyMonth') }}
    </p>
    <UTable
      v-else
      v-model:pagination="pagination"
      :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
      :data="trades"
      :columns="columns"
      :ui="{ tr: 'cursor-pointer' }"
      @select="openTrade"
    >
      <template #botName-cell="{ row }">
        {{ botStore.botStores[row.original.botId]?.uiBotName || row.original.botName }}
      </template>
      <template #close_timestamp-cell="{ row }">
        <DateTimeTZ :date="row.original.close_timestamp" />
      </template>
      <template #duration-cell="{ row }">{{ duration(row.original) }}</template>
      <template #profit-cell="{ row }"><TradeProfit :trade="row.original" /></template>
      <template #journal-cell="{ row }">
        <div class="flex flex-wrap items-center gap-1">
          <UIcon
            v-if="journalFor(row.original)?.note"
            name="i-lucide-notebook-pen"
            class="size-4 text-muted"
            :aria-label="$t('journal.hasNote')"
          />
          <UBadge
            v-for="tag in journalFor(row.original)?.tags ?? []"
            :key="tag"
            color="neutral"
            variant="soft"
            size="sm"
          >
            {{ tag }}
          </UBadge>
        </div>
      </template>
    </UTable>
    <div v-if="trades.length > pagination.pageSize" class="flex justify-end px-3 sm:px-4">
      <UPagination
        :page="pagination.pageIndex + 1"
        :items-per-page="pagination.pageSize"
        :total="trades.length"
        @update:page="(p: number) => (pagination.pageIndex = p - 1)"
      />
    </div>
  </div>
</template>
