<script setup lang="ts">
import { t } from '@/i18n';

const botStore = useBotStore();
const loginDialog = useLoginDialog();

const quickLinks = computed(() =>
  [
    {
      to: '/trade',
      icon: 'i-lucide-chart-candlestick',
      title: t('nav.trade'),
      description: t('home.tradeHelp'),
      visible: !botStore.canRunBacktest,
    },
    {
      to: '/dashboard',
      icon: 'lucide:layout-dashboard',
      title: t('nav.dashboard'),
      description: t('home.dashboardHelp'),
      visible: !botStore.canRunBacktest,
    },
    {
      to: '/backtest',
      icon: 'lucide:flask-conical',
      title: t('nav.backtest'),
      description: t('home.backtestHelp'),
      visible: botStore.canRunBacktest,
    },
    {
      to: '/graph',
      icon: 'lucide:chart-line',
      title: t('nav.chart'),
      description: t('home.chartHelp'),
      visible: true,
    },
    {
      to: '/logs',
      icon: 'lucide:scroll-text',
      title: t('nav.logs'),
      description: t('home.logsHelp'),
      visible: true,
    },
  ].filter((link) => link.visible),
);
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 text-start sm:py-8 lg:p-8">
    <PageHeader
      :description="botStore.botCount > 0 ? $t('home.connected') : $t('home.connectHint')"
    >
      <template v-if="botStore.botCount > 0" #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="lucide:plus"
          :label="$t('home.addBot')"
          @click="loginDialog({})"
        />
      </template>
    </PageHeader>

    <BotList v-if="botStore.botCount > 0" embedded />
    <div v-else class="rounded-xl border border-dashed border-accented">
      <EmptyState :title="$t('home.noBot')" icon="lucide:bot">
        <UButton
          class="mt-2"
          variant="solid"
          icon="lucide:log-in"
          :label="$t('home.connect')"
          @click="loginDialog({})"
        />
      </EmptyState>
    </div>

    <nav v-if="botStore.botCount > 0" aria-labelledby="go-heading" class="flex flex-col gap-3">
      <h2 id="go-heading" class="text-sm font-medium text-muted">{{ $t('home.goTo') }}</h2>
      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <li v-for="link in quickLinks" :key="link.to">
          <RouterLink
            :to="link.to"
            class="group flex h-full items-start gap-3 card p-4 transition-[color,background-color,border-color,box-shadow,translate] duration-200 hover:border-accented hover:bg-elevated/40 hover:shadow-md motion-safe:hover:-translate-y-0.5 dark:hover:shadow-none focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring ring-primary/20 ring-inset"
            >
              <UIcon :name="link.icon" class="size-4.5" aria-hidden="true" />
            </span>
            <span class="flex min-w-0 flex-col gap-1">
              <span class="font-semibold text-highlighted">{{ link.title }}</span>
              <span class="text-sm text-muted">{{ link.description }}</span>
            </span>
            <UIcon
              name="i-lucide-arrow-right"
              class="ms-auto size-4 shrink-0 self-center text-dimmed transition-transform group-hover:translate-x-0.5 group-hover:text-muted rtl:-scale-x-100"
              aria-hidden="true"
            />
          </RouterLink>
        </li>
      </ul>
    </nav>

    <I18nT keypath="home.help" tag="p" scope="global" class="text-sm text-muted">
      <template #link>
        <a
          class="font-medium text-highlighted underline underline-offset-2 hover:text-primary"
          href="https://www.freqtrade.io/en/stable/"
          target="_blank"
          rel="noopener noreferrer"
          >{{ $t('home.docs') }}</a
        >
      </template>
    </I18nT>
  </div>
</template>
