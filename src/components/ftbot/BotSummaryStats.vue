<script setup lang="ts">
import { ltr, t } from '@/i18n';

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
  if (!s.sameCurrency) return t('summary.mixed');
  return formatPriceCurrency(value, s.currency, s.decimals);
}

function signed(value: number): string {
  const text = money(value);
  return value > 0 && summary.value.sameCurrency ? ltr(`+${text}`) : text;
}

const cards = computed<StatCard[]>(() => {
  const s = summary.value;
  const decided = s.wins + s.losses;
  return [
    {
      label: t('summary.realized'),
      icon: 'i-lucide-badge-dollar-sign',
      value: signed(s.closedProfit),
      detail:
        s.closedRatio !== undefined && s.closedTrades > 0
          ? t('summary.realizedDetail', { pct: formatPercent(s.closedRatio, 2), n: s.closedTrades })
          : t('summary.closedTrades', { n: s.closedTrades }),
      sign: Math.sign(s.closedProfit),
    },
    {
      label: t('summary.openProfit'),
      icon: 'i-lucide-trending-up',
      value: signed(s.openProfit),
      detail: s.maxOpenTrades
        ? t('summary.slotsInUse', { open: s.openTrades, max: s.maxOpenTrades })
        : t('summary.openTrades', { n: s.openTrades }),
      sign: s.openTrades ? Math.sign(s.openProfit) : 0,
    },
    {
      label: t('summary.balance'),
      icon: 'i-lucide-wallet',
      value: money(s.balance),
      detail: s.isDryRun
        ? t('summary.dryRunFunds')
        : s.isLive
          ? t('summary.live')
          : t('summary.mixedModes'),
    },
    {
      label: t('summary.winRate'),
      icon: 'i-lucide-target',
      value: decided ? formatPercent(s.wins / decided, 0) : '–',
      detail: decided
        ? t('summary.wonLost', { won: s.wins, lost: s.losses })
        : t('summary.noClosed'),
    },
  ];
});
</script>

<template>
  <section
    :aria-label="$t('summary.label')"
    class="grid grid-cols-2 gap-3 text-start xl:grid-cols-4"
  >
    <div
      v-for="card in cards"
      :key="card.label"
      class="relative min-w-0 overflow-hidden rounded-xl border border-default bg-default p-4"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="truncate text-sm font-medium text-muted">{{ card.label }}</p>
        <span
          class="hidden size-8 shrink-0 items-center justify-center rounded-lg ring ring-inset sm:flex"
          :class="{
            'bg-elevated text-muted ring-default': !card.sign,
            'bg-profit/10 text-profit ring-profit/20': card.sign === 1,
            'bg-loss/10 text-loss ring-loss/20': card.sign === -1,
          }"
        >
          <UIcon :name="card.icon" class="size-4" aria-hidden="true" />
        </span>
      </div>
      <p
        class="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums lg:text-3xl"
        :class="{
          'text-highlighted': !card.sign,
          'text-profit': card.sign === 1,
          'text-loss': card.sign === -1,
        }"
        :title="card.value"
      >
        {{ card.value }}
      </p>
      <p class="mt-1 truncate text-xs text-muted" :title="card.detail">{{ card.detail }}</p>
    </div>
  </section>
</template>
