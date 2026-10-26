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
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:py-10">
    <div class="flex items-center gap-4 text-left">
      <AppIcon class="m-0! h-14 w-14 shrink-0" />
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
          Welcome to Freqtrade<span class="text-primary">UI</span>
        </h1>
        <p class="text-muted">Monitor and control your trading bots.</p>
      </div>
    </div>

    <section aria-labelledby="bots-heading" class="flex flex-col gap-3 text-left">
      <div class="flex items-center justify-between gap-2">
        <h2 id="bots-heading" class="text-sm font-semibold uppercase tracking-wide text-muted">
          Your bots
        </h2>
        <UButton
          v-if="botStore.botCount > 0"
          color="neutral"
          variant="outline"
          icon="mdi:plus"
          label="Add bot"
          @click="loginDialog({})"
        />
      </div>
      <BotList v-if="botStore.botCount > 0" embedded />
      <div v-else class="rounded-xl border border-dashed border-accented bg-default">
        <EmptyState
          title="No bot connected"
          description="Connect FreqUI to a running bot to see its trades and control it."
          icon="mdi:robot-outline"
        >
          <UButton
            class="mt-2"
            variant="solid"
            icon="mdi:login"
            label="Connect a bot"
            @click="loginDialog({})"
          />
        </EmptyState>
      </div>
    </section>

    <section
      v-if="botStore.botCount > 0"
      aria-labelledby="go-heading"
      class="flex flex-col gap-3 text-left"
    >
      <h2 id="go-heading" class="text-sm font-semibold uppercase tracking-wide text-muted">
        Go to
      </h2>
      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="link in quickLinks" :key="link.to">
          <RouterLink
            :to="link.to"
            class="group flex h-full items-start gap-3 rounded-xl border border-default bg-default p-4 transition-colors duration-150 hover:border-primary/50 hover:bg-elevated/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <UIcon :name="link.icon" class="size-5" />
            </span>
            <span class="flex min-w-0 flex-col">
              <span class="flex items-center gap-1 font-semibold text-highlighted">
                {{ link.title }}
                <UIcon
                  name="mdi:arrow-right"
                  class="size-4 text-muted transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              <span class="text-sm text-muted">{{ link.description }}</span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <p class="text-left text-sm text-muted">
      Need help? Read the
      <a
        class="font-medium text-primary underline underline-offset-2"
        href="https://www.freqtrade.io/en/stable/"
        target="_blank"
        rel="noopener noreferrer"
        >Freqtrade documentation</a
      >.
    </p>
  </div>
</template>
