<script setup lang="ts">
const botStore = useBotStore();

const setupItems = computed<{ label: string; value: string }[]>(() => {
  const state = botStore.activeBot.botState;
  if (!state) return [];
  const market =
    state.trading_mode && state.trading_mode !== 'spot'
      ? `${state.trading_mode} ${state.margin_mode ?? ''}`.trim()
      : 'spot';
  const items = [
    { label: 'Mode', value: state.dry_run ? 'Dry run (simulated)' : 'Live (real money)' },
    { label: 'Status', value: state.state },
    { label: 'Strategy', value: state.strategy },
    { label: 'Timeframe', value: state.timeframe },
    {
      label: 'Exchange',
      value: `${state.exchange}${state.demo_trading ? ' (demo)' : ''} · ${market}`,
    },
    {
      label: 'Stake',
      value: `${state.max_open_trades} trades × ${state.stake_amount} ${state.stake_currency}`,
    },
    { label: 'Force entry', value: state.force_entry_enable ? 'Allowed' : 'Disabled' },
  ];
  if ('stoploss_on_exchange' in state) {
    items.push({
      label: 'Stoploss on exchange',
      value: state.stoploss_on_exchange ? 'Enabled' : 'Disabled',
    });
  }
  items.push({ label: 'Freqtrade', value: botStore.activeBot.version });
  return items;
});
</script>

<template>
  <div v-if="botStore.activeBot.botState" class="flex flex-col gap-4 p-3 text-left">
    <section aria-labelledby="bot-setup-heading">
      <h3
        id="bot-setup-heading"
        class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted"
      >
        Setup
      </h3>
      <dl class="divide-y divide-default rounded-lg border border-default text-sm">
        <div
          v-for="item in setupItems"
          :key="item.label"
          class="flex items-baseline justify-between gap-4 px-3 py-2"
        >
          <dt class="shrink-0 text-muted">{{ item.label }}</dt>
          <dd class="min-w-0 truncate text-right font-medium text-highlighted" :title="item.value">
            {{ item.value }}
          </dd>
        </div>
      </dl>
    </section>

    <BaseCollapsible v-if="botStore.activeBot.strategy?.params" title="Strategy parameters">
      <StrategyParameters :strategy="botStore.activeBot.strategy" class="m-3" />
    </BaseCollapsible>

    <section v-if="botStore.activeBot.profitAll" aria-labelledby="bot-perf-heading">
      <h3
        id="bot-perf-heading"
        class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted"
      >
        Performance
      </h3>
      <BotProfit
        :profit-all="botStore.activeBot.profitAll"
        :stake-currency="botStore.activeBot.botState.stake_currency ?? 'USDT'"
        :stake-currency-decimals="botStore.activeBot.botState.stake_currency_decimals ?? 3"
      />
    </section>
  </div>
</template>
