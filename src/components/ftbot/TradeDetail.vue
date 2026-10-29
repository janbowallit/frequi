<script setup lang="ts">
import type { Trade } from '@/types';
import { apiText } from '@/i18n';

const colorStore = useColorStore();

const props = defineProps<{
  trade: Trade;
  stakeCurrency: string;
}>();

const { showTradeCustomData } = useTradeCustomData();
const { plans } = useExitPlan();
const exitPlan = computed(() => plans.value.find((p) => p.trade.trade_id === props.trade.trade_id));
</script>

<template>
  <div class="flex flex-col gap-6 text-start">
    <!-- Headline: profit first, then what was bought and when -->
    <section class="flex flex-col gap-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm text-muted">
            {{
              trade.enter_tag
                ? $t('tradeDetail.tradeNoTag', { id: trade.trade_id, tag: trade.enter_tag })
                : $t('tradeDetail.tradeNo', { id: trade.trade_id })
            }}
          </p>
          <p class="text-xl font-semibold text-highlighted">{{ trade.pair }}</p>
        </div>
        <UBadge
          :color="trade.is_open ? 'primary' : 'neutral'"
          variant="subtle"
          :label="trade.is_open ? $t('tradeDetail.open') : $t('tradeDetail.closed')"
        />
      </div>
      <dl class="divide-y divide-default">
        <ValuePair
          v-if="trade.profit_ratio !== undefined && trade.profit_abs !== undefined"
          :description="trade.is_open ? $t('tradeDetail.currentProfit') : $t('tradeDetail.profit')"
        >
          <TradeProfit :trade="trade" />
        </ValuePair>
        <ValuePair
          v-if="trade.is_open && trade.total_profit_abs"
          :description="$t('tradeDetail.totalProfit')"
        >
          <TradeProfit :trade="trade" mode="total" />
        </ValuePair>
        <ValuePair
          v-if="trade.is_open && trade.realized_profit && !trade.total_profit_abs"
          :description="$t('tradeDetail.realizedProfit')"
        >
          <TradeProfit :trade="trade" mode="realized" />
        </ValuePair>
        <ValuePair :description="$t('tradeDetail.opened')">{{
          timestampms(trade.open_timestamp)
        }}</ValuePair>
        <ValuePair v-if="trade.close_timestamp" :description="$t('tradeDetail.closedAt')">
          {{ timestampms(trade.close_timestamp) }}
        </ValuePair>
        <ValuePair v-if="trade.exit_reason" :description="$t('tradeDetail.exitReason')">
          {{ trade.exit_reason }}
        </ValuePair>
      </dl>
    </section>

    <section v-if="exitPlan" class="flex flex-col gap-2" aria-labelledby="trade-exit-plan">
      <h3 id="trade-exit-plan" class="text-sm font-semibold text-highlighted">
        {{ $t('tradeDetail.exitPlan') }}
      </h3>
      <ExitPlanItem :plan="exitPlan" :show-header="false" />
    </section>

    <section class="flex flex-col gap-1" aria-labelledby="trade-position">
      <h3 id="trade-position" class="text-sm font-semibold text-highlighted">
        {{ $t('tradeDetail.position') }}
      </h3>
      <dl class="divide-y divide-default">
        <ValuePair v-if="trade.is_open" :description="$t('tradeDetail.stake')">
          {{ formatPriceCurrency(trade.stake_amount, stakeCurrency) }}
          <template v-if="trade.trading_mode !== 'spot'">
            {{
              $t('tradeDetail.leveragedPosition', {
                leverage: trade.leverage,
                value: formatPriceCurrency(trade.amount * trade.open_rate, stakeCurrency),
              })
            }}
          </template>
        </ValuePair>
        <ValuePair v-else :description="$t('tradeDetail.stake')">
          {{ formatPriceCurrency(trade.max_stake_amount ?? trade.stake_amount, stakeCurrency) }}
          {{ trade.trading_mode !== 'spot' ? `(${trade.leverage}x)` : '' }}
        </ValuePair>
        <ValuePair :description="$t('tradeDetail.amount')">
          {{ formatPrice(trade.amount) }} {{ trade.base_currency }}
        </ValuePair>
        <ValuePair :description="$t('tradeDetail.entryPrice')">{{
          formatPrice(trade.open_rate)
        }}</ValuePair>
        <ValuePair
          v-if="trade.is_open && trade.current_rate"
          :description="$t('tradeDetail.currentPrice')"
        >
          {{ formatPrice(trade.current_rate) }}
        </ValuePair>
        <ValuePair
          v-if="trade.is_open && trade.current_rate"
          :description="$t('tradeDetail.currentValue')"
          :help="$t('tradeDetail.currentValueHelp')"
        >
          {{ formatPriceCurrency(trade.stake_amount + (trade.profit_abs ?? 0), stakeCurrency) }}
        </ValuePair>
        <ValuePair
          v-if="!trade.is_open && trade.close_rate"
          :description="$t('tradeDetail.exitPrice')"
        >
          {{ formatPrice(trade.close_rate) }}
        </ValuePair>
        <ValuePair v-if="trade.min_rate" :description="$t('tradeDetail.lowestPrice')">
          {{ formatPrice(trade.min_rate) }}
        </ValuePair>
        <ValuePair v-if="trade.max_rate" :description="$t('tradeDetail.highestPrice')">
          {{ formatPrice(trade.max_rate) }}
        </ValuePair>
      </dl>
    </section>

    <section class="flex flex-col gap-1" aria-labelledby="trade-stoploss">
      <h3 id="trade-stoploss" class="text-sm font-semibold text-highlighted">
        {{ $t('tradeDetail.stoploss') }}
      </h3>
      <dl class="divide-y divide-default">
        <ValuePair :description="$t('tradeDetail.stoploss')">
          {{ formatPrice(trade.stop_loss_abs) }}
          <span class="text-muted">({{ formatPercent(trade.stop_loss_ratio) }})</span>
        </ValuePair>
        <ValuePair :description="$t('tradeDetail.atRisk')" :help="$t('tradeDetail.atRiskHelp')">
          {{
            formatPriceCurrency(trade.stake_amount * Math.abs(trade.stop_loss_ratio), stakeCurrency)
          }}
        </ValuePair>
        <ValuePair
          v-if="trade.is_open && trade.stoploss_current_dist_ratio && trade.stoploss_current_dist"
          :description="$t('tradeDetail.distance')"
        >
          {{ formatPrice(trade.stoploss_current_dist) }}
          <span class="text-muted">({{ formatPercent(trade.stoploss_current_dist_ratio) }})</span>
        </ValuePair>
        <ValuePair
          v-if="trade.initial_stop_loss_pct && trade.initial_stop_loss_abs"
          :description="$t('tradeDetail.initialStoploss')"
        >
          {{ formatPrice(trade.initial_stop_loss_abs) }}
          <span class="text-muted">({{ formatPercent(trade.initial_stop_loss_pct / 100) }})</span>
        </ValuePair>
        <ValuePair
          v-if="trade.stoploss_last_update_timestamp"
          :description="$t('tradeDetail.lastUpdated')"
        >
          {{ timestampms(trade.stoploss_last_update_timestamp) }}
        </ValuePair>
      </dl>
    </section>

    <section
      v-if="trade.trading_mode !== undefined && trade.trading_mode !== 'spot'"
      class="flex flex-col gap-1"
      aria-labelledby="trade-futures"
    >
      <h3 id="trade-futures" class="text-sm font-semibold text-highlighted">
        {{ $t('tradeDetail.futures') }}
      </h3>
      <dl class="divide-y divide-default">
        <ValuePair :description="$t('tradeDetail.direction')">
          {{
            $t('tradeDetail.directionValue', {
              side: trade.is_short ? $t('trades.short') : $t('trades.long'),
              leverage: trade.leverage,
            })
          }}
        </ValuePair>
        <ValuePair
          v-if="trade.funding_fees !== undefined"
          :description="$t('tradeDetail.fundingFees')"
        >
          {{ formatPrice(trade.funding_fees) }}
        </ValuePair>
        <ValuePair
          v-if="trade.interest_rate !== undefined"
          :description="$t('tradeDetail.interestRate')"
        >
          {{ formatPrice(trade.interest_rate) }}
        </ValuePair>
        <ValuePair
          v-if="trade.liquidation_price !== undefined"
          :description="$t('tradeDetail.liquidation')"
        >
          {{ formatPrice(trade.liquidation_price) }}
        </ValuePair>
      </dl>
    </section>

    <section class="flex flex-col gap-1" aria-labelledby="trade-fees">
      <h3 id="trade-fees" class="text-sm font-semibold text-highlighted">
        {{ $t('tradeDetail.fees') }}
      </h3>
      <dl class="divide-y divide-default">
        <ValuePair :description="$t('tradeDetail.entryFee')">
          {{ trade.fee_open_cost }} {{ trade.fee_open_currency || trade.quote_currency }}
          <span class="text-muted">({{ formatPercent(trade.fee_open) }})</span>
        </ValuePair>
        <ValuePair
          v-if="trade.fee_close_cost && trade.fee_close"
          :description="$t('tradeDetail.exitFee')"
        >
          {{ trade.fee_close_cost }} {{ trade.fee_close_currency }}
          <span class="text-muted">({{ formatPercent(trade.fee_close) }})</span>
        </ValuePair>
      </dl>
    </section>

    <section v-if="trade.orders?.length" class="flex flex-col gap-2" aria-labelledby="trade-orders">
      <h3 id="trade-orders" class="text-sm font-semibold text-highlighted">
        {{ $t('tradeDetail.orders', { n: trade.orders.length }) }}
      </h3>
      <ol class="flex flex-col divide-y divide-default text-sm">
        <li
          v-for="(order, key) in trade.orders"
          :key="key"
          class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2"
        >
          <span class="flex items-center gap-1.5">
            <span
              class="font-semibold capitalize"
              :style="{
                color: order.ft_order_side === 'buy' ? colorStore.colorUp : colorStore.colorDown,
              }"
            >
              {{ apiText('orderSide', order.ft_order_side) }}
            </span>
            <span class="text-muted">{{ apiText('orderType', order.order_type) }}</span>
            <span v-if="order.ft_order_tag" class="text-muted">{{ order.ft_order_tag }}</span>
          </span>
          <span class="tabular-nums text-highlighted">
            {{ formatPrice(order.filled ?? 0, 8) }}
            <template v-if="order.remaining">{{
              $t('tradeDetail.remaining', { amount: formatPrice(order.remaining, 8) })
            }}</template>
            {{ $t('tradeDetail.atPrice', { price: formatPrice(order.safe_price) }) }}
          </span>
          <DateTimeTZ
            v-if="order.order_timestamp"
            class="w-full text-xs text-muted"
            :date="order.order_timestamp"
            show-timezone
          />
        </li>
      </ol>
    </section>

    <UButton
      class="self-start"
      variant="outline"
      color="neutral"
      :label="$t('tradeDetail.showCustomData')"
      icon="lucide:database-zap"
      @click="showTradeCustomData({ tradeId: trade.trade_id })"
    />
  </div>
</template>
