<script setup lang="ts">
import { botStateLabel, t } from '@/i18n';

const botStore = useBotStore();

const setupItems = computed<{ label: string; value: string }[]>(() => {
  const state = botStore.activeBot.botState;
  if (!state) return [];
  const market =
    state.trading_mode && state.trading_mode !== 'spot'
      ? `${state.trading_mode} ${state.margin_mode ?? ''}`.trim()
      : 'spot';
  const items = [
    {
      label: t('botStatus.mode'),
      value: state.dry_run ? t('botStatus.dryRun') : t('botStatus.live'),
    },
    { label: t('botStatus.status'), value: botStateLabel(state.state) },
    { label: t('botStatus.strategy'), value: state.strategy },
    { label: t('botStatus.timeframe'), value: state.timeframe },
    {
      label: t('botStatus.exchange'),
      value: `${state.exchange}${state.demo_trading ? ` ${t('botStatus.demo')}` : ''} · ${market}`,
    },
    {
      label: t('botStatus.stake'),
      value: t('botStatus.stakeValue', {
        trades: state.max_open_trades,
        amount: state.stake_amount,
        currency: state.stake_currency,
      }),
    },
    {
      label: t('botStatus.forceEntry'),
      value: state.force_entry_enable ? t('botStatus.allowed') : t('botStatus.disabled'),
    },
  ];
  if ('stoploss_on_exchange' in state) {
    items.push({
      label: t('botStatus.stoplossOnExchange'),
      value: state.stoploss_on_exchange ? t('botStatus.enabled') : t('botStatus.disabled'),
    });
  }
  items.push({ label: 'Freqtrade', value: botStore.activeBot.version });
  return items;
});
</script>

<template>
  <div v-if="botStore.activeBot.botState" class="flex flex-col gap-4 p-3 text-start">
    <section aria-labelledby="bot-setup-heading">
      <h3 id="bot-setup-heading" class="mb-2 text-sm font-medium text-muted">
        {{ $t('botStatus.setup') }}
      </h3>
      <dl class="divide-y divide-default rounded-lg border border-default text-sm">
        <div
          v-for="item in setupItems"
          :key="item.label"
          class="flex items-baseline justify-between gap-4 px-3 py-2"
        >
          <dt class="shrink-0 text-muted">{{ item.label }}</dt>
          <dd class="min-w-0 truncate text-end font-medium text-highlighted" :title="item.value">
            {{ item.value }}
          </dd>
        </div>
      </dl>
    </section>

    <BaseCollapsible
      v-if="botStore.activeBot.strategy?.params"
      :title="$t('botStatus.strategyParams')"
    >
      <StrategyParameters :strategy="botStore.activeBot.strategy" class="m-3" />
    </BaseCollapsible>

    <section v-if="botStore.activeBot.profitAll" aria-labelledby="bot-perf-heading">
      <h3 id="bot-perf-heading" class="mb-2 text-sm font-medium text-muted">
        {{ $t('botStatus.performance') }}
      </h3>
      <BotProfit
        :profit-all="botStore.activeBot.profitAll"
        :stake-currency="botStore.activeBot.botState.stake_currency ?? 'USDT'"
        :stake-currency-decimals="botStore.activeBot.botState.stake_currency_decimals ?? 3"
      />
    </section>
  </div>
</template>
