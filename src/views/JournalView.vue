<script setup lang="ts">
/** Journal: daily P&L calendar over the closed trades, with each trade's review one click away. */
const { unreachableBots, refresh } = useJournal();

onMounted(refresh);
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-3 text-start sm:p-4 lg:gap-5 lg:p-6"
  >
    <div v-if="unreachableBots.length" class="flex flex-wrap gap-2">
      <UBadge
        v-for="name in unreachableBots"
        :key="name"
        color="warning"
        variant="soft"
        icon="i-lucide-unplug"
      >
        {{ $t('journal.botUnreachable', { bot: name }) }}
      </UBadge>
    </div>

    <PanelSection
      :title="$t('journal.calendar')"
      :info="$t('journal.calendarInfo')"
      body-class="p-3 sm:p-4"
    >
      <PnlCalendar />
    </PanelSection>

    <PanelSection :title="$t('journal.closedTrades')" body-class="overflow-x-auto">
      <JournalTradeList />
    </PanelSection>
  </div>
</template>
