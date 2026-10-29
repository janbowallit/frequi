<script setup lang="ts">
import { t } from '@/i18n';

const botStore = useBotStore();
const loginDialog = useLoginDialog();

const quickLinks = computed(() =>
  [
    {
      to: '/trade',
      icon: 'mdi:swap-horizontal-bold',
      title: t('nav.trade'),
      description: t('home.tradeHelp'),
      visible: !botStore.canRunBacktest,
    },
    {
      to: '/dashboard',
      icon: 'mdi:view-dashboard-outline',
      title: t('nav.dashboard'),
      description: t('home.dashboardHelp'),
      visible: !botStore.canRunBacktest,
    },
    {
      to: '/backtest',
      icon: 'mdi:flask-outline',
      title: t('nav.backtest'),
      description: t('home.backtestHelp'),
      visible: botStore.canRunBacktest,
    },
    {
      to: '/graph',
      icon: 'mdi:chart-line',
      title: t('nav.chart'),
      description: t('home.chartHelp'),
      visible: true,
    },
    {
      to: '/logs',
      icon: 'mdi:text-box-outline',
      title: t('nav.logs'),
      description: t('home.logsHelp'),
      visible: true,
    },
  ].filter((link) => link.visible),
);
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6 text-start sm:py-10">
    <PageHeader
      :title="$t('home.bots')"
      :description="botStore.botCount > 0 ? $t('home.connected') : $t('home.connectHint')"
    >
      <template v-if="botStore.botCount > 0" #actions>
        <UButton
          color="neutral"
          variant="outline"
          icon="mdi:plus"
          :label="$t('home.addBot')"
          @click="loginDialog({})"
        />
      </template>
    </PageHeader>

    <BotList v-if="botStore.botCount > 0" embedded />
    <div v-else class="rounded-(--app-panel-radius) border border-dashed border-accented">
      <EmptyState :title="$t('home.noBot')" icon="mdi:robot-outline">
        <UButton
          class="mt-2"
          variant="solid"
          icon="mdi:login"
          :label="$t('home.connect')"
          @click="loginDialog({})"
        />
      </EmptyState>
    </div>

    <nav v-if="botStore.botCount > 0" aria-labelledby="go-heading" class="flex flex-col gap-2">
      <h2 id="go-heading" class="text-sm font-medium text-muted">{{ $t('home.goTo') }}</h2>
      <ul
        class="panel grid grid-cols-1 divide-y divide-default sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x rtl:lg:divide-x-reverse"
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
