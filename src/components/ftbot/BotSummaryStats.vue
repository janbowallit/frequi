<script setup lang="ts">
/** At-a-glance numbers for the selected bots: realized profit, open profit, balance and win rate. */
const botStore = useBotStore();

interface StatCard {
  label: string;
  value: string;
  detail: string;
  icon: string;
  /** Sign of the value - colors it as profit / loss */
  sign?: number;
}

const summary = computed(() => {
  const bots = botStore.selectedBots;
  let closedProfit = 0;
  let openProfit = 0;
  let balance = 0;
  let wins = 0;
  let losses = 0;
  let closedTrades = 0;
  let openTrades = 0;
  let maxOpenTrades = 0;
  for (const bot of bots) {
    closedProfit += bot.profit?.profit_closed_coin ?? 0;
    wins += bot.profit?.winning_trades ?? 0;
    losses += bot.profit?.losing_trades ?? 0;
    closedTrades += bot.profit?.closed_trade_count ?? 0;
    openProfit += bot.openTrades.reduce((a, t) => a + (t.total_profit_abs ?? t.profit_abs ?? 0), 0);
    openTrades += bot.openTradeCount;
    maxOpenTrades += bot.botState?.max_open_trades ?? 0;
    balance += bot.balance?.total_bot ?? bot.balance?.total ?? 0;
  }
  const first = bots[0];
  return {
    closedProfit,
    // Ratio against starting balance is only meaningful for a single bot
    closedRatio: bots.length === 1 ? first?.profit?.profit_closed_ratio : undefined,
    openProfit,
    balance,
    wins,
    losses,
    closedTrades,
    openTrades,
    maxOpenTrades,
    currency: first?.stakeCurrency ?? '',
    decimals: first?.stakeCurrencyDecimals ?? 3,
    sameCurrency: botStore.allSelectedBotsSameStake,
    isDryRun: bots.length > 0 && bots.every((b) => b.botState?.dry_run),
    isLive: bots.length > 0 && bots.every((b) => b.botState && !b.botState.dry_run),
  };
});

function money(value: number): string {
  const s = summary.value;
  if (!s.sameCurrency) return 'Mixed currencies';
  return formatPriceCurrency(value, s.currency, s.decimals);
}

function signed(value: number): string {
  const text = money(value);
  return value > 0 && summary.value.sameCurrency ? `+${text}` : text;
}

const cards = computed<StatCard[]>(() => {
  const s = summary.value;
  const decided = s.wins + s.losses;
  return [
    {
      label: 'Realized profit',
      value: signed(s.closedProfit),
      detail:
        s.closedRatio !== undefined && s.closedTrades > 0
          ? `${formatPercent(s.closedRatio, 2)} · ${s.closedTrades} closed trades`
          : `${s.closedTrades} closed trades`,
      icon: 'mdi:cash-check',
      sign: Math.sign(s.closedProfit),
    },
    {
      label: 'Open profit',
      value: signed(s.openProfit),
      detail: s.maxOpenTrades
        ? `${s.openTrades} of ${s.maxOpenTrades} trade slots in use`
        : `${s.openTrades} open trades`,
      icon: 'mdi:chart-timeline-variant',
      sign: s.openTrades ? Math.sign(s.openProfit) : 0,
    },
    {
      label: 'Balance',
      value: money(s.balance),
      detail: s.isDryRun ? 'Dry run - simulated funds' : s.isLive ? 'Live' : 'Dry run and live',
      icon: 'mdi:wallet-outline',
    },
    {
      label: 'Win rate',
      value: decided ? formatPercent(s.wins / decided, 0) : '–',
      detail: decided ? `${s.wins} won · ${s.losses} lost` : 'No closed trades yet',
      icon: 'mdi:trophy-outline',
    },
  ];
});
</script>

<template>
  <section aria-label="Summary" class="grid grid-cols-2 gap-2 text-left lg:grid-cols-4">
    <div
      v-for="card in cards"
      :key="card.label"
      class="flex min-w-0 items-start gap-3 rounded-xl border border-default bg-default p-3 shadow-sm shadow-black/5 sm:p-4 dark:shadow-black/30"
    >
      <span
        class="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex"
        aria-hidden="true"
      >
        <UIcon :name="card.icon" class="size-5" />
      </span>
      <div class="min-w-0">
        <p class="text-sm text-muted">{{ card.label }}</p>
        <p
          class="truncate text-lg font-semibold tabular-nums sm:text-xl"
          :class="{
            'text-highlighted': !card.sign,
            'text-(--color-profit)': card.sign === 1,
            'text-(--color-loss)': card.sign === -1,
          }"
          :title="card.value"
        >
          {{ card.value }}
        </p>
        <p class="truncate text-sm text-muted" :title="card.detail">{{ card.detail }}</p>
      </div>
    </div>
  </section>
</template>
