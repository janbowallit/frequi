<script setup lang="ts">
import { h } from 'vue';
import type { BalanceValues } from '@/types';

const botStore = useBotStore();
const hideSmallBalances = ref(true);
const showBotOnly = ref(true);

const smallBalance = computed<number>(() => {
  return Number((1.1 ** botStore.activeBot.stakeCurrencyDecimals).toFixed(8));
});

const canUseBotBalance = computed(() => {
  return botStore.activeBot.botFeatures.hasBotBalance;
});

const balanceCurrencies = computed(() => {
  return (
    botStore.activeBot.balance.currencies?.filter(
      (v) =>
        (!hideSmallBalances.value || v.est_stake >= smallBalance.value) &&
        (!canUseBotBalance.value || !showBotOnly.value || (v.is_bot_managed ?? true) === true),
    ) ?? []
  );
});

const tableData = computed<Record<string, string | number | null>[]>(() => {
  return balanceCurrencies.value.map((v) => ({
    currency: v.currency,
    free: v.free,
    bot_owned: v.bot_owned ?? null,
    est_stake: v.est_stake,
    est_stake_bot: v.est_stake_bot ?? null,
  }));
});

const formatCurrency = (value) => {
  return value ? formatPrice(value, botStore.activeBot.stakeCurrencyDecimals) : '';
};

const chartValues = computed<BalanceValues[]>(() => {
  return balanceCurrencies.value.map((v) => {
    return {
      balance:
        showBotOnly.value && canUseBotBalance.value && v.bot_owned != undefined
          ? v.bot_owned
          : v.is_position === true
            ? v.position
            : v.balance,
      currency: v.currency,
      est_stake:
        showBotOnly.value && canUseBotBalance.value
          ? (v.est_stake_bot ?? v.est_stake)
          : v.est_stake,
      free: showBotOnly.value && canUseBotBalance.value ? (v.bot_owned ?? v.free) : v.free,
      used: v.used,
      stake: v.stake,
    };
  });
});

const tableFields = computed(() => {
  return [
    { field: 'currency', header: 'Currency' },
    {
      field: showBotOnly.value && canUseBotBalance.value ? 'bot_owned' : 'free',
      header: 'Available',
      asCurrency: true,
    },
    {
      field: showBotOnly.value && canUseBotBalance.value ? 'est_stake_bot' : 'est_stake',
      header: `in ${botStore.activeBot.balance.stake}`,
      asCurrency: true,
    },
  ];
});

const loading = ref(false);
async function refreshBalance() {
  loading.value = true;
  try {
    await botStore.activeBot.getBalance();
  } finally {
    loading.value = false;
  }
}

const tableColumns = computed(() => {
  return tableFields.value.map((field, index) => ({
    accessorKey: field.field,
    header: field.header,
    meta: index === 0 ? undefined : { class: { th: 'text-right', td: 'text-right tabular-nums' } },
    cell: field.asCurrency
      ? ({ row }: { row: { original: Record<string, number | string | null> } }) =>
          formatCurrency(row.original[field.field])
      : undefined,
    footer:
      index === 0
        ? 'Total'
        : index === 1
          ? undefined
          : () =>
              h('span', { class: 'inline-flex flex-col items-end' }, [
                h(
                  'strong',
                  { class: 'tabular-nums' },
                  showBotOnly.value && canUseBotBalance.value
                    ? formatCurrency(botStore.activeBot.balance.total_bot)
                    : formatCurrency(botStore.activeBot.balance.total),
                ),
                h(
                  'span',
                  {
                    class: 'text-xs font-normal normal-case text-muted tabular-nums',
                    title: `Change since the starting capital of ${formatCurrency(
                      botStore.activeBot.balance.starting_capital,
                    )} ${botStore.activeBot.balance.stake}`,
                  },
                  `${formatPercent(botStore.activeBot.balance.starting_capital_ratio, 2)} since start`,
                ),
              ]),
  }));
});

onMounted(() => {
  refreshBalance();
});
</script>

<template>
  <div class="flex flex-col">
    <PanelHeader
      :title="`${showBotOnly && canUseBotBalance ? 'Bot' : 'Account'} balance`"
      :description="
        showBotOnly && canUseBotBalance
          ? 'Funds the bot manages'
          : 'Everything in the exchange account'
      "
    >
      <template #actions>
        <UButton
          v-if="canUseBotBalance"
          color="neutral"
          variant="ghost"
          size="sm"
          :icon="showBotOnly ? 'mdi:bank' : 'mdi:robot'"
          :title="showBotOnly ? 'Show account balance' : 'Show bot balance'"
          :aria-label="showBotOnly ? 'Show account balance' : 'Show bot balance'"
          @click="showBotOnly = !showBotOnly"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          :icon="hideSmallBalances ? 'mdi:eye' : 'mdi:eye-off'"
          :title="hideSmallBalances ? 'Show small balances' : 'Hide small balances'"
          :aria-label="hideSmallBalances ? 'Show small balances' : 'Hide small balances'"
          :aria-pressed="!hideSmallBalances"
          @click="hideSmallBalances = !hideSmallBalances"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="mdi:refresh"
          title="Refresh"
          aria-label="Refresh balance"
          :loading="loading"
          @click="refreshBalance"
        />
      </template>
    </PanelHeader>
    <EmptyState
      v-if="balanceCurrencies.length === 0"
      title="No balances"
      :description="hideSmallBalances ? 'Small balances are hidden.' : undefined"
      icon="mdi:wallet-outline"
    />
    <template v-else>
      <!-- A pie of a single currency says nothing -->
      <BalanceChart
        v-if="balanceCurrencies.length > 1"
        :currencies="chartValues"
        :show-title="false"
        class="px-2 pt-2"
      />
      <p v-if="botStore.activeBot.balance.note" class="px-3 text-sm text-muted">
        {{ botStore.activeBot.balance.note }}
      </p>
      <UTable :data="tableData" :columns="tableColumns" :ui="{ th: 'px-3', td: 'px-3 py-2' }" />
    </template>
  </div>
</template>
