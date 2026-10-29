<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/vue-table';
import type { TableColumn, TableRow } from '@nuxt/ui';
import type { MultiDeletePayload, MultiForceExitPayload, Trade } from '@/types';
import { t } from '@/i18n';

import { useRouter } from 'vue-router';

const props = withDefaults(
  defineProps<{
    trades: Trade[];
    title?: string;
    stakeCurrency?: string;
    activeTrades?: boolean;
    showFilter?: boolean;
    multiBotView?: boolean;
    emptyText?: string;
  }>(),
  {
    title: undefined,
    stakeCurrency: '',
    activeTrades: false,
    showFilter: false,
    multiBotView: false,
    emptyText: undefined,
  },
);

const botStore = useBotStore();
const router = useRouter();
const settingsStore = useSettingsStore();
const tradesTable = useTemplateRef('tradesTable');
const filterText = ref('');
const perPage = props.activeTrades ? 200 : 15;
const pagination = ref({ pageIndex: 0, pageSize: perPage });
const { confirm } = useConfirmBox();
const { forceEntryDialog, forceExitDialog } = useForceTrade();

function formatPriceWithDecimals(price: number) {
  return formatPrice(price, botStore.activeBot.stakeCurrencyDecimals);
}

const tableFields = computed(() => [
  ...(props.multiBotView ? [{ field: 'botName', header: t('trades.bot') }] : []),
  { field: 'trade_id', header: t('trades.id') },
  { field: 'pair', header: t('trades.pair') },
  { field: 'amount', header: t('trades.amount') },
  props.activeTrades
    ? { field: 'stake_amount', header: t('trades.stake') }
    : { field: 'max_stake_amount', header: t('trades.stake') },
  {
    field: 'open_rate',
    header: t('trades.entryPrice'),
  },
  {
    field: props.activeTrades ? 'current_rate' : 'close_rate',
    header: props.activeTrades ? t('trades.currentPrice') : t('trades.exitPrice'),
  },
  {
    field: 'profit',
    header: t('trades.profit'),
  },
  { field: 'open_timestamp', header: t('trades.opened') },
  ...(props.activeTrades
    ? [{ field: 'actions', header: '' }]
    : [
        { field: 'close_timestamp', header: t('trades.closed') },
        { field: 'exit_reason', header: t('trades.exitReason') },
      ]),
]);

const tableColumns = computed<TableColumn<Trade>[]>(() =>
  tableFields.value.map((f) => ({ accessorKey: f.field, header: f.header })),
);

const filteredTrades = computed(() => {
  if (!filterText.value) return props.trades;
  const text = filterText.value.toLowerCase();
  return props.trades.filter(
    (t) =>
      t.pair.toLowerCase().includes(text) ||
      t.exit_reason?.toLowerCase().includes(text) ||
      t.enter_tag?.toLowerCase().includes(text) ||
      (props.multiBotView ? t.botName?.toLowerCase().includes(text) : false),
  );
});

async function forceExitHandler(item: Trade, ordertype: string | undefined = undefined) {
  const message = ordertype
    ? t('trades.exitMessageType', { id: item.trade_id, pair: item.pair, type: ordertype })
    : t('trades.exitMessage', { id: item.trade_id, pair: item.pair });
  if (
    settingsStore.confirmDialog !== true ||
    (await confirm({
      title: t('trades.exitTitle'),
      message,
      confirmText: t('trades.exitConfirm'),
      danger: true,
    }))
  ) {
    const payload: MultiForceExitPayload = {
      tradeid: String(item.trade_id),
      botId: item.botId,
    };
    if (ordertype) {
      payload.ordertype = ordertype;
    }
    botStore
      .forceSellMulti(payload)
      .then((xxx) => console.log(xxx))
      .catch((error) => console.log(error.response));
  }
}

async function removeTradeHandler(item: Trade) {
  if (
    await confirm({
      title: t('trades.deleteTitle'),
      message: t('trades.deleteMessage', { id: item.trade_id, pair: item.pair }),
      confirmText: t('trades.deleteConfirm'),
      danger: true,
    })
  ) {
    const payload: MultiDeletePayload = {
      tradeid: String(item.trade_id),
      botId: item.botId,
    };
    botStore.deleteTradeMulti(payload).catch((error) => console.log(error.response));
  }
}

function forceExitPartialHandler(item: Trade) {
  forceExitDialog({
    trade: item,
    stakeCurrencyDecimals: botStore.activeBot.botState.stake_currency_decimals ?? 3,
  });
}

async function cancelOpenOrderHandler(item: Trade) {
  if (
    await confirm({
      title: t('trades.cancelOrderTitle'),
      message: t('trades.cancelOrderMessage', { id: item.trade_id, pair: item.pair }),
      confirmText: t('trades.cancelOrderConfirm'),
      cancelText: t('trades.keepOrder'),
      danger: true,
    })
  ) {
    const payload: MultiDeletePayload = {
      tradeid: String(item.trade_id),
      botId: item.botId,
    };
    botStore.cancelOpenOrderMulti(payload).catch((error) => console.log(error.response));
  }
}

function reloadTradeHandler(item: Trade) {
  botStore.reloadTradeMulti({ tradeid: String(item.trade_id), botId: item.botId });
}

function handleForceEntry(item: Trade) {
  forceEntryDialog({
    pair: item.pair,
    positionIncrease: true,
  });
}

const onRowClicked = (item: Trade) => {
  if (props.multiBotView && botStore.selectedBot !== item.botId) {
    // Multibotview - on click switch to the bot trade view
    botStore.selectBot(item.botId);
  }
  if (item && item.trade_id !== botStore.activeBot.detailTradeId) {
    botStore.activeBot.setDetailTrade(item);
    if (props.multiBotView) {
      router.push({ name: 'Freqtrade Trading' });
    }
  } else {
    botStore.activeBot.setDetailTrade(null);
  }
};

function onRowSelect(_e: Event, row: TableRow<Trade>) {
  onRowClicked(row.original);
}

const rowSelection = computed({
  get() {
    const selectedTradeIndex = filteredTrades.value.findIndex(
      (t) => String(t.trade_id) === String(botStore.activeBot.detailTradeId),
    );
    if (selectedTradeIndex === -1) return {};
    return { [String(selectedTradeIndex)]: true };
  },
  set() {
    // noop, selection is controlled by activeBot.detailTradeId
  },
});
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-auto">
    <div v-if="showFilter && trades.length > 0" class="flex justify-end px-3 pt-3">
      <UInput
        v-model="filterText"
        icon="lucide:search"
        :placeholder="$t('trades.filter')"
        :aria-label="$t('trades.filterLabel')"
        class="w-full sm:w-64"
      />
    </div>
    <EmptyState
      v-if="filteredTrades.length === 0"
      :title="filterText ? $t('trades.noMatch') : (emptyText ?? $t('trades.empty'))"
      :icon="activeTrades ? 'lucide:arrow-left-right' : 'lucide:history'"
      :description="
        filterText
          ? $t('trades.noMatchHelp')
          : activeTrades
            ? $t('trades.openHelp')
            : $t('trades.closedHelp')
      "
    />
    <UTable
      v-else
      ref="tradesTable"
      v-model:pagination="pagination"
      :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
      :data="filteredTrades"
      :columns="tableColumns"
      v-model:row-selection="rowSelection"
      :ui="{
        tr: 'cursor-pointer data-[selected=true]:bg-primary/12',
      }"
      @select="onRowSelect"
    >
      <template #trade_id-cell="{ row }">
        {{ row.original.trade_id }}
        {{
          botStore.activeBot.botFeatures.futures && row.original.trading_mode !== 'spot'
            ? (row.original.trade_id ? '| ' : '') +
              (row.original.is_short ? $t('trades.short') : $t('trades.long'))
            : ''
        }}
      </template>
      <template #pair-cell="{ row }">
        {{
          `${row.original.pair}${row.original.open_order_id || row.original.has_open_orders ? '*' : ''}`
        }}
      </template>
      <template #actions-cell="{ row }">
        <TradeActionsPopover
          :id="row.original.trade_id ?? row.index"
          :enable-force-entry="botStore.activeBot.botState.force_entry_enable"
          :trade="row.original"
          :bot-features="botStore.activeBot.botFeatures"
          @delete-trade="removeTradeHandler(row.original)"
          @force-exit="forceExitHandler"
          @force-exit-partial="forceExitPartialHandler"
          @cancel-open-order="cancelOpenOrderHandler"
          @reload-trade="reloadTradeHandler"
          @force-entry="handleForceEntry"
        />
      </template>
      <template #stake_amount-cell="{ row }">
        {{ formatPriceWithDecimals(row.original.stake_amount) }}
        {{ row.original.trading_mode !== 'spot' ? `(${row.original.leverage}x)` : '' }}
      </template>
      <template #max_stake_amount-cell="{ row }">
        {{ formatPriceWithDecimals(row.original.max_stake_amount ?? 0) }}
        {{ row.original.trading_mode !== 'spot' ? `(${row.original.leverage}x)` : '' }}
      </template>
      <template #open_rate-cell="{ row }">{{ formatPrice(row.original.open_rate) }}</template>
      <template #current_rate-cell="{ row }">{{
        formatPrice(row.original.current_rate ?? null)
      }}</template>
      <template #close_rate-cell="{ row }">{{
        formatPrice(row.original.close_rate ?? null)
      }}</template>
      <template #amount-cell="{ row }">{{ formatPrice(row.original.amount) }}</template>
      <template #profit-cell="{ row }"><TradeProfit :trade="row.original" /></template>
      <template #open_timestamp-cell="{ row }"
        ><DateTimeTZ :date="row.original.open_timestamp"
      /></template>
      <template #close_timestamp-cell="{ row }"
        ><DateTimeTZ :date="row.original.close_timestamp ?? 0"
      /></template>
      <template #exit_reason-cell="{ row }">{{ row.original.exit_reason }}</template>
      <template #botName-cell="{ row }">{{ row.original.botName }}</template>
    </UTable>

    <div
      v-if="!activeTrades && filteredTrades.length > perPage"
      class="mt-auto flex justify-end border-t border-default p-2"
    >
      <UPagination
        :page="(tradesTable?.tableApi?.getState().pagination.pageIndex || 0) + 1"
        :items-per-page="tradesTable?.tableApi?.getState().pagination.pageSize"
        :total="tradesTable?.tableApi?.getFilteredRowModel().rows.length ?? 0"
        @update:page="(p) => tradesTable?.tableApi?.setPageIndex(p - 1)"
      />
    </div>
  </div>
</template>
