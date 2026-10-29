<script setup lang="ts">
import type { Trade } from '@/types';
import { t } from '@/i18n';

type modes = 'default' | 'total' | 'realized';

const props = withDefaults(
  defineProps<{
    trade: Trade;
    mode?: modes;
  }>(),
  {
    mode: 'default',
  },
);

const modeDescs = computed<{ [key in modes]: string }>(() => ({
  default: t('trades.currentProfit'),
  total: t('trades.totalProfit'),
  realized: t('trades.realizedProfit'),
}));

const profitRatio = computed<number | undefined | null>(() => {
  switch (props.mode) {
    case 'default':
      return props.trade.profit_ratio;
    case 'total':
      return props.trade.total_profit_ratio;
    case 'realized':
      return props.trade.realized_profit_ratio;
    default:
      return undefined;
  }
});
const profitAbs = computed<number | undefined>(() => {
  switch (props.mode) {
    case 'default':
      return props.trade.profit_abs;
    case 'total':
      return props.trade.total_profit_abs;
    case 'realized':
      return props.trade.realized_profit;
    default:
      return undefined;
  }
});
const profitDesc = computed((): string => {
  let profit = `${modeDescs.value[props.mode]}: ${
    profitRatio.value ? formatPercent(profitRatio.value) : ''
  } (${profitAbs.value})`;
  profit += `\n${t('trades.openSince', { time: timestampms(props.trade.open_timestamp) })}`;
  return profit;
});
</script>

<template>
  <ProfitPill
    :profit-ratio="profitRatio"
    :profit-abs="profitAbs"
    :profit-desc="profitDesc"
    :stake-currency="trade.quote_currency || 'USDT'"
  />
</template>
