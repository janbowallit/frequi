<script setup lang="ts">
/** At-a-glance numbers for the selected bots: realized profit, open profit, balance and win rate. */
const botStore = useBotStore();

interface StatCard {
  label: string;
  value: string;
  detail: string;
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
          ? `${formatPercent(s.closedRatio, 2)} over ${s.closedTrades} closed trades`
          : `${s.closedTrades} closed trades`,
      sign: Math.sign(s.closedProfit),
    },
    {
      label: 'Open profit',
      value: signed(s.openProfit),
      detail: s.maxOpenTrades
        ? `${s.openTrades} of ${s.maxOpenTrades} trade slots in use`
        : `${s.openTrades} open trades`,
      sign: s.openTrades ? Math.sign(s.openProfit) : 0,
    },
    {
      label: 'Balance',
      value: money(s.balance),
      detail: s.isDryRun ? 'Dry run, simulated funds' : s.isLive ? 'Live' : 'Dry run and live',
    },
    {
      label: 'Win rate',
      value: decided ? formatPercent(s.wins / decided, 0) : '–',
      detail: decided ? `${s.wins} won, ${s.losses} lost` : 'No closed trades yet',
    },
  ];
});
</script>

<template>
  <section
    aria-label="Summary"
    class="panel grid grid-cols-2 text-left lg:grid-cols-4 [&>*]:border-default max-lg:[&>*:nth-child(-n+2)]:border-b max-lg:[&>*:nth-child(odd)]:border-e lg:[&>*:not(:last-child)]:border-e"
  >
    <div v-for="card in cards" :key="card.label" class="min-w-0 px-4 py-3 lg:px-5 lg:py-4">
      <p class="text-sm text-muted">{{ card.label }}</p>
      <p
        class="mt-0.5 truncate text-xl font-semibold tracking-tight tabular-nums lg:text-[1.75rem] lg:leading-9"
        :class="{
          'text-highlighted': !card.sign,
          'text-(--color-profit)': card.sign === 1,
          'text-(--color-loss)': card.sign === -1,
        }"
        :title="card.value"
      >
        {{ card.value }}
      </p>
      <p class="truncate text-xs text-muted" :title="card.detail">{{ card.detail }}</p>
    </div>
  </section>
</template>
