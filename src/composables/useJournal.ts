import type { ClosedTrade, JournalEntry } from '@/types';
import { dayKey, groupByDay, monthSummary, type DayStats } from '@/utils/journal';

/**
 * State of the Journal page: the month shown, the filters, and the closed trades of the
 * selected bots grouped by the day they closed in the user's timezone.
 */
function useJournalState() {
  const botStore = useBotStore();
  const settingsStore = useSettingsStore();

  const nowKey = dayKey(Date.now(), settingsStore.timezone);
  const month = ref({ year: Number(nowKey.slice(0, 4)), month: Number(nowKey.slice(5, 7)) });
  const botFilter = ref<string | 'all'>('all');
  const selectedDay = ref<string | null>(null);
  const tagFilter = ref<string | null>(null);
  const notesOnly = ref(false);

  const monthPrefix = computed(
    () => `${month.value.year}-${String(month.value.month).padStart(2, '0')}-`,
  );
  const botIds = computed(() => (botFilter.value === 'all' ? undefined : [botFilter.value]));

  const closedTrades = computed(() =>
    botStore.allTradesSelectedBots.filter((t) => !t.is_open && t.close_timestamp),
  );

  function journalFor(trade: ClosedTrade): JournalEntry | undefined {
    return botStore.botStores[trade.botId]?.journal[trade.trade_id];
  }

  /** Every day with closed trades, any month */
  const days = computed(() =>
    groupByDay(closedTrades.value, settingsStore.timezone, botIds.value),
  );
  const monthDays = computed<DayStats[]>(() =>
    Object.values(days.value).filter((d) => d.date.startsWith(monthPrefix.value)),
  );
  const summary = computed(() => monthSummary(monthDays.value));

  const trades = computed(() =>
    closedTrades.value
      .filter((t) => !botIds.value || botIds.value.includes(t.botId))
      .filter((t) => {
        const key = dayKey(t.close_timestamp, settingsStore.timezone);
        return selectedDay.value ? key === selectedDay.value : key.startsWith(monthPrefix.value);
      })
      .filter((t) => {
        const entry = journalFor(t);
        if (notesOnly.value && !entry) return false;
        if (!tagFilter.value) return true;
        const tag = tagFilter.value.toLocaleLowerCase();
        return !!entry?.tags.some((x) => x.toLocaleLowerCase() === tag);
      })
      .sort((a, b) => b.close_timestamp - a.close_timestamp),
  );

  /** Tags used on any selected bot, for the filter and the tag suggestions */
  const allTags = computed(() => {
    const tags = new Map<string, string>();
    Object.values(botStore.allJournalSelectedBots).forEach((journal) =>
      Object.values(journal).forEach((entry) =>
        entry.tags.forEach((tag) => {
          if (!tags.has(tag.toLocaleLowerCase())) tags.set(tag.toLocaleLowerCase(), tag);
        }),
      ),
    );
    return [...tags.values()].sort((a, b) => a.localeCompare(b));
  });

  const unreachableBots = computed(() =>
    Object.values(botStore.botStores)
      .filter((b) => b.isSelected && !b.isBotOnline)
      .map((b) => b.uiBotName),
  );

  function shiftMonth(delta: number) {
    const index = month.value.year * 12 + month.value.month - 1 + delta;
    month.value = { year: Math.floor(index / 12), month: (index % 12) + 1 };
    selectedDay.value = null;
  }

  /** Load trades and journal entries of every selected bot */
  function refresh() {
    Object.values(botStore.botStores)
      .filter((b) => b.isSelected)
      .forEach((b) => {
        b.getTrades();
        b.getJournal();
      });
  }

  return {
    month,
    botFilter,
    selectedDay,
    tagFilter,
    notesOnly,
    days,
    summary,
    trades,
    allTags,
    unreachableBots,
    journalFor,
    shiftMonth,
    refresh,
  };
}

/** One shared state for the Journal page and its panels */
export const useJournal = createSharedComposable(useJournalState);
