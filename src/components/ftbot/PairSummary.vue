<script setup lang="ts">
import type { Lock, Trade } from '@/types';

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

// Live mode: show how many entry conditions each pair meets (shared with the Next entry panel)
const nextEntry = props.backtestMode ? undefined : useNextEntry();
const readiness = computed(() => {
  const map = new Map<string, { met: number; total: number; signal: boolean }>();
  for (const r of nextEntry?.pairs.value ?? []) {
    if (r.conditions.length === 0) continue;
    map.set(r.pair, {
      met: r.conditions.filter((c) => c.met).length,
      total: r.conditions.length,
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
      profitString = `Current profit: ${formatPercent(profit)}`;
    }
    if (trade) {
      profitString += `\nOpen since: ${timestampms(trade.open_timestamp)}`;
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
      icon="mdi:magnify"
      placeholder="Filter pairs"
      aria-label="Filter pairs"
      class="w-full"
      :class="{ 'pe-2': backtestMode }"
    />
    <EmptyState
      v-if="combinedPairList.length === 0"
      :title="filterText ? 'No matching pairs' : 'No pairs in the whitelist'"
      icon="mdi:magnify-close"
    />
    <ul v-else class="flex flex-col gap-0.5" aria-label="Pairs">
      <li v-for="comb in combinedPairList" :key="comb.pair">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 rounded-md border-s-2 px-2.5 py-2 text-left text-sm"
          :class="
            comb.pair === botStore.activeBot.selectedPair
              ? 'border-primary bg-primary/10 font-semibold text-highlighted'
              : 'border-transparent text-default hover:bg-elevated'
          "
          :aria-current="comb.pair === botStore.activeBot.selectedPair ? 'true' : undefined"
          :title="`${comb.pair} - ${comb.tradeCount} trade(s), ${formatPriceCurrency(comb.profitAbs, botStore.activeBot.stakeCurrency, botStore.activeBot.stakeCurrencyDecimals)}`"
          @click="botStore.activeBot.selectedPair = comb.pair"
        >
          <span class="flex min-w-0 items-center gap-2">
            <span class="truncate">{{ comb.pair }}</span>
            <UTooltip v-if="comb.locks" :text="`Locked until ${comb.lockReason}`">
              <UIcon name="mdi:lock" class="size-4 shrink-0 text-warning" aria-label="Locked" />
            </UTooltip>
          </span>

          <TradeProfit v-if="comb.trade && !backtestMode" :trade="comb.trade" />
          <UBadge
            v-else-if="readiness.get(comb.pair)?.signal"
            color="success"
            variant="solid"
            size="sm"
            label="Signal"
          />
          <span
            v-else-if="readiness.get(comb.pair)"
            class="flex h-1.5 w-12 shrink-0 gap-0.5"
            role="img"
            :aria-label="`${readiness.get(comb.pair)!.met} of ${readiness.get(comb.pair)!.total} entry conditions met`"
          >
            <span
              v-for="i in readiness.get(comb.pair)!.total"
              :key="i"
              class="flex-1 rounded-full"
              :class="i <= readiness.get(comb.pair)!.met ? 'bg-(--color-profit)' : 'bg-accented'"
            />
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
