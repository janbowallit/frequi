<script setup lang="ts">
import type { Lock, Trade } from '@/types';
import { t } from '@/i18n';

interface CombinedPairList {
  pair: string;
  lockReason: string;
  profitString: string;
  trade?: Trade;
  locks?: Lock;
  profit: number;
  profitAbs: number;
  tradeCount: number;
}

const props = withDefaults(
  defineProps<{
    pairlist: string[];
    currentLocks?: Lock[];
    trades: Trade[];
    sortMethod?: string;
    backtestMode?: boolean;
    startingBalance?: number;
  }>(),
  {
    currentLocks: () => [],
    sortMethod: 'normal',
    backtestMode: false,
    startingBalance: 0,
  },
);

// Live mode: show how many of its own entry checks each pair meets (shared with the Next entry
// panel). Market-wide checks such as a BTC filter are left out - the status strip shows those.
const nextEntry = props.backtestMode ? undefined : useNextEntry();
const readiness = computed(() => {
  const map = new Map<string, { met: number; total: number; signal: boolean }>();
  const market = nextEntry?.marketKeys.value ?? new Set<string>();
  for (const r of nextEntry?.pairs.value ?? []) {
    const own = r.conditions.filter((c) => !market.has(c.key));
    if (own.length === 0) continue;
    map.set(r.pair, {
      met: own.filter((c) => c.met).length,
      total: own.length,
      signal: r.signal,
    });
  }
  return map;
});
const botStore = useBotStore();

const filterText = ref('');
const combinedPairList = computed(() => {
  const comb: CombinedPairList[] = [];

  props.pairlist.forEach((pair) => {
    const trades: Trade[] = props.trades.filter((el) => el.pair === pair);
    const allLocks = props.currentLocks.filter((el) => el.pair === pair);
    let lockReason = '';
    let locks;

    // Sort to have longer timeframe in front
    allLocks.sort((a, b) => (a.lock_end_timestamp > b.lock_end_timestamp ? -1 : 1));
    if (allLocks.length > 0) {
      [locks] = allLocks;
      lockReason = `${timestampms(locks.lock_end_timestamp)} - ${locks.side} - ${locks.reason}`;
    }
    let profitString = '';
    let profit = 0;
    let profitAbs = 0;
    trades.forEach((trade) => {
      profit += trade.profit_ratio ?? 0;
      profitAbs += trade.profit_abs ?? 0;
    });
    if (props.sortMethod == 'profit' && props.startingBalance) {
      profit = profitAbs / props.startingBalance;
    }
    const tradeCount = trades.length;
    const trade = tradeCount ? trades[0] : undefined;
    if (trades.length > 0) {
      profitString = t('pairs.currentProfit', { pct: formatPercent(profit) });
    }
    if (trade) {
      profitString += `\n${t('pairs.openSince', { time: timestampms(trade.open_timestamp) })}`;
    }
    if (
      filterText.value === '' ||
      pair.toLocaleLowerCase().includes(filterText.value.toLocaleLowerCase())
    ) {
      comb.push({ pair, trade, locks, lockReason, profitString, profit, profitAbs, tradeCount });
    }
  });

  if (props.sortMethod === 'profit') {
    comb.sort((a, b) => {
      if (a.profit > b.profit) {
        return -1;
      }
      return 1;
    });
  } else {
    // sort Pairs: "with open trade" -> available -> locked
    comb.sort((a, b) => {
      if (a.trade && !b.trade) {
        return -1;
      }
      if (a.trade && b.trade) {
        // 2 open trade pairs
        return a.trade.trade_id > b.trade.trade_id ? 1 : -1;
      }
      if (!a.locks && b.locks) {
        return -1;
      }
      if (a.locks && b.locks) {
        // Both have locks
        return a.locks.lock_end_timestamp > b.locks.lock_end_timestamp ? 1 : -1;
      }
      return 1;
    });
  }
  return comb;
});
</script>

<template>
  <div class="flex flex-col gap-2 p-3">
    <UInput
      id="trade-filter"
      v-model="filterText"
      type="search"
      icon="lucide:search"
      :placeholder="$t('pairs.filter')"
      :aria-label="$t('pairs.filter')"
      class="w-full"
      :class="{ 'pe-2': backtestMode }"
    />
    <EmptyState
      v-if="combinedPairList.length === 0"
      :title="filterText ? $t('pairs.noMatch') : $t('pairs.noWhitelist')"
      icon="lucide:search-x"
    />
    <div
      v-if="combinedPairList.length > 0 && readiness.size > 0"
      class="flex justify-between px-2.5 text-xs text-muted"
      aria-hidden="true"
    >
      <span>{{ $t('pairs.label') }}</span>
      <span>{{ $t('pairs.checksHeader') }}</span>
    </div>
    <ul
      v-if="combinedPairList.length > 0"
      class="flex flex-col gap-1"
      :aria-label="$t('pairs.label')"
    >
      <li v-for="comb in combinedPairList" :key="comb.pair">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 rounded-md border-s-2 px-2.5 py-2 text-start text-sm"
          :class="
            comb.pair === botStore.activeBot.selectedPair
              ? 'border-primary bg-primary/10 font-semibold text-highlighted'
              : 'border-transparent text-default hover:bg-elevated'
          "
          :aria-current="comb.pair === botStore.activeBot.selectedPair ? 'true' : undefined"
          :title="
            $t('pairs.pairTitle', {
              pair: comb.pair,
              count: comb.tradeCount,
              profit: formatPriceCurrency(
                comb.profitAbs,
                botStore.activeBot.stakeCurrency,
                botStore.activeBot.stakeCurrencyDecimals,
              ),
            })
          "
          @click="botStore.activeBot.selectedPair = comb.pair"
        >
          <span class="flex min-w-0 items-center gap-2">
            <span class="truncate">{{ comb.pair }}</span>
            <UTooltip
              v-if="comb.locks"
              :text="$t('pairs.lockedUntil', { reason: comb.lockReason })"
            >
              <UIcon
                name="lucide:lock"
                class="size-4 shrink-0 text-warning"
                :aria-label="$t('pairs.locked')"
              />
            </UTooltip>
          </span>

          <TradeProfit v-if="comb.trade && !backtestMode" :trade="comb.trade" />
          <UBadge
            v-else-if="readiness.get(comb.pair)?.signal"
            color="success"
            variant="solid"
            size="sm"
            :label="$t('pairs.signal')"
          />
          <span
            v-else-if="readiness.get(comb.pair)"
            class="flex shrink-0 items-center gap-2"
            role="img"
            :aria-label="
              $t('pairs.checksMet', {
                met: readiness.get(comb.pair)!.met,
                total: readiness.get(comb.pair)!.total,
              })
            "
          >
            <span class="flex h-1.5 w-10 gap-0.5" aria-hidden="true">
              <span
                v-for="i in readiness.get(comb.pair)!.total"
                :key="i"
                class="flex-1 rounded-full"
                :class="i <= readiness.get(comb.pair)!.met ? 'bg-profit' : 'bg-accented'"
              />
            </span>
            <span class="w-7 text-end text-xs text-muted tabular-nums" aria-hidden="true">
              {{ readiness.get(comb.pair)!.met }}/{{ readiness.get(comb.pair)!.total }}
            </span>
          </span>
          <ProfitPill
            v-if="backtestMode && comb.tradeCount > 0"
            :profit-ratio="comb.profit"
            :stake-currency="botStore.activeBot.stakeCurrency"
          />
        </button>
      </li>
    </ul>
  </div>
</template>
