<script setup lang="ts">
/** Month grid of net profit per day, for all selected bots or one of them. */
import { t, intlLocale } from '@/i18n';
import { monthGrid } from '@/utils/journal';

const botStore = useBotStore();
const settingsStore = useSettingsStore();
const { month, botFilter, selectedDay, days, summary, shiftMonth } = useJournal();

const weekStartsOn = computed<0 | 1 | 6>(() => (settingsStore.locale === 'fa' ? 6 : 1));
const grid = computed(() => monthGrid(month.value.year, month.value.month, weekStartsOn.value));

// 2023-01-01 was a Sunday, so day index i is 2023-01-(1 + i)
const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2023, 0, 1 + ((weekStartsOn.value + i) % 7))).toLocaleDateString(
      intlLocale(),
      { weekday: 'short', timeZone: 'UTC' },
    ),
  ),
);

const monthTitle = computed(() =>
  new Date(Date.UTC(month.value.year, month.value.month - 1, 1)).toLocaleDateString(
    intlLocale(),
    { month: 'long', year: 'numeric', timeZone: 'UTC', calendar: 'gregory' },
  ),
);

const botItems = computed(() => [
  { label: t('journal.allBots'), value: 'all' },
  ...Object.values(botStore.botStores)
    .filter((b) => b.isSelected)
    .map((b) => ({ label: b.uiBotName, value: b.botId })),
]);
const showBotFilter = computed(() => botItems.value.length > 2);

/** Largest absolute day result in the month, so the tint shows relative size */
const maxAbs = computed(() =>
  Math.max(
    0,
    ...grid.value.map((d) => (d && days.value[d] ? Math.abs(days.value[d]!.profitAbs) : 0)),
  ),
);

function cellStyle(date: string) {
  const d = days.value[date];
  if (!d || !maxAbs.value || d.profitAbs === 0) return undefined;
  const strength = Math.round(8 + 22 * (Math.abs(d.profitAbs) / maxAbs.value));
  const color = d.profitAbs > 0 ? 'var(--color-profit)' : 'var(--color-loss)';
  return { backgroundColor: `color-mix(in oklab, ${color} ${strength}%, transparent)` };
}

function money(value: number) {
  return formatPrice(value, 2);
}

function pickDay(date: string) {
  selectedDay.value = selectedDay.value === date ? null : date;
}

const selectedStats = computed(() => (selectedDay.value ? days.value[selectedDay.value] : null));
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-chevron-left"
        class="rtl:rotate-180 pointer-coarse:size-11"
        :aria-label="$t('journal.prevMonth')"
        @click="shiftMonth(-1)"
      />
      <h2 class="min-w-36 text-center text-base font-semibold">{{ monthTitle }}</h2>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-chevron-right"
        class="rtl:rotate-180 pointer-coarse:size-11"
        :aria-label="$t('journal.nextMonth')"
        @click="shiftMonth(1)"
      />
      <USelect
        v-if="showBotFilter"
        v-model="botFilter"
        :items="botItems"
        class="ms-auto w-44"
        :aria-label="$t('journal.botFilter')"
      />
    </div>

    <div role="grid" :aria-label="monthTitle" class="grid grid-cols-7 gap-1">
      <div
        v-for="(name, i) in weekdays"
        :key="`wd-${i}`"
        role="columnheader"
        class="pb-1 text-center text-xs text-muted"
      >
        {{ name }}
      </div>
      <template v-for="(date, i) in grid" :key="date ?? `pad-${i}`">
        <div v-if="!date" aria-hidden="true" />
        <button
          v-else
          type="button"
          role="gridcell"
          class="flex min-h-11 flex-col items-center justify-between rounded-md border border-default p-1 text-start transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary sm:min-h-20 sm:items-stretch sm:p-1.5"
          :class="{ 'ring-2 ring-primary': selectedDay === date }"
          :style="cellStyle(date)"
          :aria-pressed="selectedDay === date"
          :aria-label="
            days[date]
              ? $t('journal.dayLabel', {
                  date,
                  profit: money(days[date]!.profitAbs),
                  trades: $t('journal.tradeCount', days[date]!.tradeCount),
                })
              : date
          "
          @click="pickDay(date)"
        >
          <span class="text-xs text-muted">{{ Number(date.slice(8)) }}</span>
          <template v-if="days[date]">
            <!-- Phones: a dot; the tapped day's total shows below the grid -->
            <span
              class="size-2 rounded-full sm:hidden"
              :class="days[date]!.profitAbs >= 0 ? 'bg-profit' : 'bg-loss'"
            />
            <span
              class="hidden text-sm font-semibold tabular-nums sm:block"
              :class="days[date]!.profitAbs >= 0 ? 'text-profit' : 'text-loss'"
            >
              {{ money(days[date]!.profitAbs) }}
            </span>
            <span class="hidden text-xs text-muted sm:block">
              {{ $t('journal.tradeCount', days[date]!.tradeCount) }}
            </span>
          </template>
        </button>
      </template>
    </div>

    <p v-if="selectedStats" class="text-sm sm:hidden">
      {{ selectedDay }}:
      <span :class="selectedStats.profitAbs >= 0 ? 'text-profit' : 'text-loss'" class="font-semibold">
        {{ money(selectedStats.profitAbs) }} USDT
      </span>
      · {{ $t('journal.tradeCount', selectedStats.tradeCount) }}
    </p>

    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
      <div>
        <dt class="text-xs text-muted">{{ $t('journal.monthProfit') }}</dt>
        <dd
          class="font-semibold tabular-nums"
          :class="summary.profitAbs >= 0 ? 'text-profit' : 'text-loss'"
        >
          {{ money(summary.profitAbs) }} USDT
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">{{ $t('journal.trades') }}</dt>
        <dd class="font-semibold tabular-nums">{{ summary.tradeCount }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">{{ $t('journal.winRate') }}</dt>
        <dd class="font-semibold tabular-nums">
          {{ summary.winRate === null ? '–' : formatPercent(summary.winRate, 0) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">{{ $t('journal.bestDay') }}</dt>
        <dd class="font-semibold tabular-nums">
          {{ summary.bestDay ? `${money(summary.bestDay.profitAbs)} (${summary.bestDay.date.slice(8)})` : '–' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">{{ $t('journal.worstDay') }}</dt>
        <dd class="font-semibold tabular-nums">
          {{ summary.worstDay ? `${money(summary.worstDay.profitAbs)} (${summary.worstDay.date.slice(8)})` : '–' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">{{ $t('journal.profitFactor') }}</dt>
        <dd class="font-semibold tabular-nums">
          {{ summary.profitFactor === null ? '–' : summary.profitFactor.toFixed(2) }}
        </dd>
      </div>
    </dl>
  </div>
</template>
