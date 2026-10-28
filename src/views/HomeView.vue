<script setup lang="ts">
const botStore = useBotStore();
const loginDialog = useLoginDialog();

const quickLinks = computed(() =>
  [
    {
      to: '/trade',
      icon: 'mdi:swap-horizontal-bold',
      title: 'Trade',
      description: 'Open trades, controls and live chart',
      visible: !botStore.canRunBacktest,
    },
    {
      to: '/dashboard',
      icon: 'mdi:view-dashboard-outline',
      title: 'Dashboard',
      description: 'Profit, performance and history',
      visible: !botStore.canRunBacktest,
    },
    {
      to: '/backtest',
      icon: 'mdi:flask-outline',
      title: 'Backtest',
      description: 'Test strategies on historic data',
      visible: botStore.canRunBacktest,
    },
    {
      to: '/graph',
      icon: 'mdi:chart-line',
      title: 'Chart',
      description: 'Candles with entry and exit signals',
      visible: true,
    },
    {
      to: '/logs',
      icon: 'mdi:text-box-outline',
      title: 'Logs',
      description: 'What the bot is doing right now',
      visible: true,
    },
  ].filter((link) => link.visible),
);
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6 text-left sm:py-10">
    <PageHeader
      title="Bots"
      :description="
        botStore.botCount > 0
          ? 'The bots this browser is connected to.'
          : 'Connect FreqUI to a running bot to see its trades and control it.'
      "
    >
      <template v-if="botStore.botCount > 0" #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="mdi:plus"
          label="Add bot"
          @click="loginDialog({})"
        />
      </template>
    </PageHeader>

    <BotList v-if="botStore.botCount > 0" embedded />
    <div v-else class="rounded-(--app-panel-radius) border border-dashed border-accented">
      <EmptyState title="No bot connected" icon="mdi:robot-outline">
        <UButton
          class="mt-2"
          variant="solid"
          icon="mdi:login"
          label="Connect a bot"
          @click="loginDialog({})"
        />
      </EmptyState>
    </div>

    <nav v-if="botStore.botCount > 0" aria-labelledby="go-heading" class="flex flex-col gap-2">
      <h2 id="go-heading" class="text-sm font-medium text-muted">Go to</h2>
      <ul
        class="panel grid grid-cols-1 divide-y divide-default sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x"
      >
        <li v-for="link in quickLinks" :key="link.to">
          <RouterLink :to="link.to" class="flex h-full flex-col gap-0.5 p-4 hover:bg-elevated/50">
            <span class="flex items-center gap-2 font-semibold text-highlighted">
              <UIcon :name="link.icon" class="size-4 text-muted" aria-hidden="true" />
              {{ link.title }}
            </span>
            <span class="text-sm text-muted">{{ link.description }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <p class="text-sm text-muted">
      Need help? Read the
      <a
        class="font-medium text-highlighted underline underline-offset-2 hover:text-primary"
        href="https://www.freqtrade.io/en/stable/"
        target="_blank"
        rel="noopener noreferrer"
        >Freqtrade documentation</a
      >.
    </p>
  </div>
</template>
