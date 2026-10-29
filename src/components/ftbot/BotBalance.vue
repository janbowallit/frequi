<script setup lang="ts">
import { h } from 'vue';
import type { BalanceValues } from '@/types';
import { t } from '@/i18n';

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
    { field: 'currency', header: t('balance.currency') },
    {
      field: showBotOnly.value && canUseBotBalance.value ? 'bot_owned' : 'free',
      header: t('balance.available'),
      asCurrency: true,
    },
    {
      field: showBotOnly.value && canUseBotBalance.value ? 'est_stake_bot' : 'est_stake',
      header: t('balance.inStake', { stake: botStore.activeBot.balance.stake }),
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
    meta: index === 0 ? undefined : { class: { th: 'text-end', td: 'text-end tabular-nums' } },
    cell: field.asCurrency
      ? ({ row }: { row: { original: Record<string, number | string | null> } }) =>
          formatCurrency(row.original[field.field])
      : undefined,
    footer:
      index === 0
        ? t('balance.total')
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
                    title: t('balance.changeSince', {
                      capital: formatCurrency(botStore.activeBot.balance.starting_capital),
                      stake: botStore.activeBot.balance.stake,
                    }),
                  },
                  t('balance.sinceStart', {
                    pct: formatPercent(botStore.activeBot.balance.starting_capital_ratio, 2),
                  }),
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
      :title="showBotOnly && canUseBotBalance ? $t('balance.botTitle') : $t('balance.accountTitle')"
      :description="
        showBotOnly && canUseBotBalance ? $t('balance.botHelp') : $t('balance.accountHelp')
      "
    >
      <template #actions>
        <UButton
          v-if="canUseBotBalance"
          color="neutral"
          variant="ghost"
          size="sm"
          :icon="showBotOnly ? 'lucide:landmark' : 'lucide:bot'"
          :title="showBotOnly ? $t('balance.showAccount') : $t('balance.showBot')"
          :aria-label="showBotOnly ? $t('balance.showAccount') : $t('balance.showBot')"
          @click="showBotOnly = !showBotOnly"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          :icon="hideSmallBalances ? 'lucide:eye' : 'lucide:eye-off'"
          :title="hideSmallBalances ? $t('balance.showSmall') : $t('balance.hideSmall')"
          :aria-label="hideSmallBalances ? $t('balance.showSmall') : $t('balance.hideSmall')"
          :aria-pressed="!hideSmallBalances"
          @click="hideSmallBalances = !hideSmallBalances"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="lucide:refresh-cw"
          :title="$t('common.refresh')"
          :aria-label="$t('balance.refresh')"
          :loading="loading"
          @click="refreshBalance"
        />
      </template>
    </PanelHeader>
    <EmptyState
      v-if="balanceCurrencies.length === 0"
      :title="$t('balance.empty')"
      :description="hideSmallBalances ? $t('balance.smallHidden') : undefined"
      icon="lucide:wallet"
    />
    <template v-else>
      <!-- A pie of a single currency says nothing -->
      <BalanceChart
        v-if="balanceCurrencies.length > 1"
        :currencies="chartValues"
        :show-title="false"
        class="px-2 pt-2"
      />
      <p
        v-if="botStore.activeBot.balance.note"
        class="border-b border-default px-3 py-2 text-sm text-muted"
      >
        {{ botStore.activeBot.balance.note }}
      </p>
      <UTable :data="tableData" :columns="tableColumns" :ui="{ th: 'px-3', td: 'px-3 py-2' }" />
    </template>
  </div>
</template>
