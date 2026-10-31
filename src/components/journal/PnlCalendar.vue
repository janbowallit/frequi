<script setup lang="ts">
/** Month grid of net profit per day, for all selected bots or one of them. */
import { t, intlLocale } from '@/i18n';
import { dayKey, monthGrid } from '@/utils/journal';

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
  new Date(Date.UTC(month.value.year, month.value.month - 1, 1)).toLocaleDateString(intlLocale(), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
    calendar: 'gregory',
  }),
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
  // Capped so the day's red / green number stays readable on its own tint
  const strength = Math.round(6 + 12 * (Math.abs(d.profitAbs) / maxAbs.value));
  const color = d.profitAbs > 0 ? 'var(--color-profit)' : 'var(--color-loss)';
  return { backgroundColor: `color-mix(in oklab, ${color} ${strength}%, transparent)` };
}

function money(value: number) {
  return formatPrice(value, 2);
}

/** Text color of a result: a zero result is neither a profit nor a loss */
function tone(value: number) {
  if (value > 0) return 'text-profit';
  if (value < 0) return 'text-loss';
  return 'text-highlighted';
}

/** "Oct 30" for a yyyy-MM-dd day */
function shortDate(date?: string) {
  if (!date) return undefined;
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(intlLocale(), {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    calendar: 'gregory',
  });
}

const today = computed(() => dayKey(Date.now(), settingsStore.timezone));

const stats = computed(() => [
  {
    label: t('journal.trades'),
    value: String(summary.value.tradeCount),
  },
  {
    label: t('journal.winRate'),
    value: summary.value.winRate === null ? '–' : formatPercent(summary.value.winRate, 0),
  },
  {
    label: t('journal.bestDay'),
    value: summary.value.bestDay ? money(summary.value.bestDay.profitAbs) : '–',
    hint: shortDate(summary.value.bestDay?.date),
    class: summary.value.bestDay ? tone(summary.value.bestDay.profitAbs) : '',
  },
  {
    label: t('journal.worstDay'),
    value: summary.value.worstDay ? money(summary.value.worstDay.profitAbs) : '–',
    hint: shortDate(summary.value.worstDay?.date),
    class: summary.value.worstDay ? tone(summary.value.worstDay.profitAbs) : '',
  },
  {
    label: t('journal.profitFactor'),
    value: summary.value.profitFactor === null ? '–' : summary.value.profitFactor.toFixed(2),
  },
]);

function pickDay(date: string) {
  selectedDay.value = selectedDay.value === date ? null : date;
}

const selectedStats = computed(() => (selectedDay.value ? days.value[selectedDay.value] : null));
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-5">
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-chevron-left"
          class="rtl:rotate-180 pointer-coarse:size-11"
          :aria-label="$t('journal.prevMonth')"
          @click="shiftMonth(-1)"
        />
        <h2 class="min-w-36 text-center text-base font-semibold text-highlighted">
          {{ monthTitle }}
        </h2>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-chevron-right"
          class="rtl:rotate-180 pointer-coarse:size-11"
          :aria-label="$t('journal.nextMonth')"
          @click="shiftMonth(1)"
        />
      </div>
      <USelect
        v-if="showBotFilter"
        v-model="botFilter"
        :items="botItems"
        class="w-full sm:ms-auto sm:w-44"
        :aria-label="$t('journal.botFilter')"
      />
    </div>

    <!-- Month totals first: the numbers people look for before the day detail -->
    <dl class="grid grid-cols-3 gap-2 lg:grid-cols-6">
      <div class="col-span-3 rounded-lg bg-elevated/60 px-3 py-2.5 sm:col-span-1">
        <dt class="text-xs text-muted">{{ $t('journal.monthProfit') }}</dt>
        <dd class="mt-0.5 text-lg font-semibold tabular-nums" :class="tone(summary.profitAbs)">
          {{ money(summary.profitAbs) }} <span class="text-xs font-medium text-muted">USDT</span>
        </dd>
      </div>
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="min-w-0 rounded-lg bg-elevated/60 px-2.5 py-2 sm:px-3 sm:py-2.5"
      >
        <dt class="truncate text-xs text-muted">{{ stat.label }}</dt>
        <dd class="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
          <span
            class="text-base font-semibold tabular-nums text-highlighted sm:text-lg"
            :class="stat.class"
          >
            {{ stat.value }}
          </span>
          <span v-if="stat.hint" class="text-xs tabular-nums text-muted">{{ stat.hint }}</span>
        </dd>
      </div>
    </dl>

    <div role="grid" :aria-label="monthTitle" class="grid grid-cols-7 gap-1 sm:gap-1.5">
      <div
        v-for="(name, i) in weekdays"
        :key="`wd-${i}`"
        role="columnheader"
        class="pb-1 text-center text-xs font-medium text-muted"
      >
        {{ name }}
      </div>
      <template v-for="(date, i) in grid" :key="date ?? `pad-${i}`">
        <div v-if="!date" aria-hidden="true" />
        <button
          v-else
          type="button"
          role="gridcell"
          class="flex min-h-11 flex-col items-center justify-between gap-1 rounded-lg border p-1 text-start transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary sm:min-h-20 sm:items-stretch sm:p-2"
          :class="[
            days[date] ? 'border-default' : 'border-default/50',
            { 'ring-2 ring-primary': selectedDay === date },
          ]"
          :style="cellStyle(date)"
          :aria-pressed="selectedDay === date"
          :aria-current="date === today ? 'date' : undefined"
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
          <span
            class="flex size-6 items-center justify-center self-center rounded-full text-xs tabular-nums sm:self-start"
            :class="
              date === today
                ? 'bg-primary font-semibold text-inverted'
                : date > today
                  ? 'text-dimmed'
                  : 'text-muted'
            "
          >
            {{ Number(date.slice(8)) }}
          </span>
          <template v-if="days[date]">
            <!-- Phones: a dot; the tapped day's total shows below the grid -->
            <span
              class="size-2 rounded-full sm:hidden"
              :class="days[date]!.profitAbs >= 0 ? 'bg-profit' : 'bg-loss'"
            />
            <span
              class="hidden truncate text-sm font-semibold tabular-nums sm:block"
              :class="tone(days[date]!.profitAbs)"
            >
              {{ money(days[date]!.profitAbs) }}
            </span>
            <span class="hidden truncate text-xs text-muted sm:block">
              {{ $t('journal.tradeCount', days[date]!.tradeCount) }}
            </span>
          </template>
        </button>
      </template>
    </div>

    <p v-if="selectedStats" class="text-sm sm:hidden">
      {{ selectedDay }}:
      <span :class="tone(selectedStats.profitAbs)" class="font-semibold">
        {{ money(selectedStats.profitAbs) }} USDT
      </span>
      · {{ $t('journal.tradeCount', selectedStats.tradeCount) }}
    </p>
  </div>
</template>
