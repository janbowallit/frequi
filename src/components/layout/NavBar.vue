<script setup lang="ts">
import Favico from 'favico.js';

import { useRoute } from 'vue-router';
import type { DropdownMenuItem } from '@nuxt/ui';
import { breakpointsTailwind } from '@vueuse/core';
import type { AuthStorageWithBotId } from '@/types';

const botStore = useBotStore();

const settingsStore = useSettingsStore();
const layoutStore = useLayoutStore();
const route = useRoute();
const router = useRouter();
const favicon = ref<Favico | undefined>(undefined);
const pingInterval = ref<number>();
const loginDialog = useLoginDialog();

const breakpoints = useBreakpoints(breakpointsTailwind);

const isMobile = breakpoints.smallerOrEqual('md');

async function clickLogout() {
  botStore.removeBot(botStore.selectedBot);
  // TODO: This should be per bot
  await router.push('/');
}

const setOpenTradesAsPill = (tradeCount: number) => {
  if (!favicon.value) {
    favicon.value = new Favico({
      animation: 'none',
      // position: 'up',
      // fontStyle: 'normal',
      // bgColor: '#',
      // textColor: '#FFFFFF',
    });
  }
  if (tradeCount !== 0 && settingsStore.openTradesInTitle === 'showPill') {
    favicon.value.badge(tradeCount);
  } else {
    favicon.value.reset();
    console.log('reset');
  }
};
const resetDynamicLayout = (): void => {
  console.log(`resetLayout called for ${route?.fullPath}`);
  switch (route?.fullPath) {
    case '/trade':
      layoutStore.resetTradingLayout();
      break;
    case '/dashboard':
      layoutStore.resetDashboardLayout();
      break;
    default:
  }
};
const setTitle = () => {
  let title = 'freqUI';
  if (settingsStore.openTradesInTitle === OpenTradeVizOptions.asTitle) {
    title = `(${botStore.activeBotorUndefined?.openTradeCount}) ${title}`;
  }
  if (botStore.activeBotorUndefined?.botName) {
    title = `${title} - ${botStore.activeBotorUndefined?.botName}`;
  }
  document.title = title;
};

onBeforeUnmount(() => {
  if (pingInterval.value) {
    clearInterval(pingInterval.value);
  }
});

onMounted(async () => {
  await settingsStore.loadUIVersion();
  pingInterval.value = window.setInterval(botStore.pingAll, 60000);
});

settingsStore.$subscribe((_, state) => {
  const needsUpdate = settingsStore.openTradesInTitle !== state.openTradesInTitle;
  if (needsUpdate) {
    setTitle();
    setOpenTradesAsPill(botStore.activeBotorUndefined?.openTradeCount || 0);
  }
});

watch(
  () => botStore.activeBotorUndefined?.botName,
  () => setTitle(),
);
watch(
  () => botStore.activeBotorUndefined?.openTradeCount,
  () => {
    if (settingsStore.openTradesInTitle === OpenTradeVizOptions.showPill) {
      setOpenTradesAsPill(botStore.activeBotorUndefined?.openTradeCount ?? 0);
    } else if (settingsStore.openTradesInTitle === OpenTradeVizOptions.asTitle) {
      setTitle();
    }
  },
);

const activeBot = computed(() => botStore.activeBotorUndefined);
const botStatus = computed<{ label: string; dot: string }>(() => {
  if (!activeBot.value) return { label: 'No bot', dot: 'bg-neutral-400' };
  if (!activeBot.value.isBotLoggedIn) return { label: 'Login expired', dot: 'bg-error' };
  return activeBot.value.isBotOnline
    ? { label: 'Online', dot: 'bg-success' }
    : { label: 'Offline', dot: 'bg-error' };
});
const isDryRun = computed(() => activeBot.value?.botState?.dry_run ?? false);

// Navigation items array
const navItems = ref([
  {
    label: 'Trade',
    to: '/trade',
    visible: computed(() => !botStore.canRunBacktest),
    icon: 'i-mdi-currency-usd',
  },
  {
    label: 'Dashboard',
    to: '/dashboard',
    visible: computed(() => !botStore.canRunBacktest),
    icon: 'i-mdi-view-dashboard',
  },
  {
    label: 'Chart',
    to: '/graph',
    icon: 'i-mdi-chart-line',
  },
  {
    label: 'Logs',
    to: '/logs',
    icon: 'i-mdi-format-list-bulleted',
  },
  {
    label: 'Settings',
    to: '/settings',
    mobileOnly: true,
    icon: 'i-mdi-cog',
  },
  {
    label: 'Backtest',
    to: '/backtest',
    visible: computed(() => botStore.canRunBacktest),
    icon: 'i-mdi-currency-usd',
  },
  {
    label: 'Download Data',
    to: '/download_data',
    visible: computed(
      () => botStore.isWebserverMode && botStore.activeBot.botFeatures.downloadDataView,
    ),
    icon: 'i-mdi-download',
  },
  {
    label: 'Pairlist Config',
    to: '/pairlist_config',
    icon: 'i-mdi-format-list-numbered-rtl',
    visible: computed(
      () =>
        (botStore.activeBot?.isWebserverMode ?? false) &&
        botStore.activeBot.botFeatures.pairlistConfig,
    ),
  },
]);

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: `V: ${settingsStore.uiVersion}`,
      disabled: true,
    },
  ],
  [
    {
      label: 'Settings',
      icon: 'i-mdi-cog',
      onSelect: () => router.push('/settings'),
    },
    {
      label: layoutStore.layoutLocked ? 'Unlock Layout' : 'Lock Layout',
      icon: layoutStore.layoutLocked ? 'i-mdi-lock' : 'i-mdi-lock-open',
      onSelect: () => {
        layoutStore.layoutLocked = !layoutStore.layoutLocked;
      },
    },
    {
      label: 'Reset Layout',
      icon: 'i-mdi-lock-reset',
      onSelect: resetDynamicLayout,
    },
  ],
  ...(botStore.hasBots && botStore.botCount === 1
    ? [
        [
          {
            label: 'Logout',
            icon: 'i-mdi-logout',
            onSelect: clickLogout,
          },
        ],
      ]
    : []),
]);

function editBotLogin(botId: string) {
  const bot = botStore.botStores[botId];
  if (!bot) {
    showAlert('Bot not found', 'warning');
    return;
  }
  const loginInfo: AuthStorageWithBotId = {
    ...bot.getLoginInfo(),
    botId,
  };

  loginDialog({ loginInfo: loginInfo });
}
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-default bg-default/85 backdrop-blur supports-[backdrop-filter]:bg-default/70"
  >
    <div class="flex h-14 items-center gap-2 px-3 lg:px-4">
      <RouterLink
        exact
        to="/"
        aria-label="FreqUI home"
        class="flex shrink-0 items-center gap-2 rounded-md pe-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <AppIcon class="h-8 w-8" />
        <AppText class="hidden text-lg lg:inline" />
      </RouterLink>

      <!-- Desktop navigation -->
      <nav v-if="!isMobile" aria-label="Main" class="ms-3 flex items-center gap-1">
        <UButton
          v-for="(item, index) in navItems.filter(
            (item) => (item.visible ?? true) && !item.mobileOnly,
          )"
          :key="index"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          color="neutral"
          variant="ghost"
          size="md"
          class="text-muted hover:text-highlighted"
          active-class="bg-elevated text-highlighted"
        />
      </nav>

      <div class="ms-auto flex min-w-0 items-center gap-2">
        <template v-if="!isMobile">
          <UTooltip
            v-if="!settingsStore.confirmDialog"
            text="Confirm dialogs are off - force exits run immediately."
          >
            <UBadge
              color="warning"
              variant="subtle"
              icon="mdi:alert-outline"
              label="No confirmations"
              class="cursor-help"
            />
          </UTooltip>

          <!-- Active bot status -->
          <div
            v-if="botStore.hasBots"
            class="flex h-9 items-center gap-2 rounded-full border border-default bg-elevated/40 ps-3 pe-1"
          >
            <span class="relative flex size-2.5 shrink-0" aria-hidden="true">
              <span
                v-if="botStatus.label === 'Online'"
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden"
              />
              <span class="relative inline-flex size-2.5 rounded-full" :class="botStatus.dot" />
            </span>
            <span class="max-w-40 truncate text-sm font-medium text-highlighted">
              {{ activeBot?.botName || 'No bot selected' }}
            </span>
            <span class="sr-only">{{ botStatus.label }}</span>
            <UBadge v-if="isDryRun" color="neutral" variant="soft" size="sm" label="Dry run" />
            <UButton
              v-if="activeBot && !activeBot.isBotLoggedIn"
              color="error"
              variant="soft"
              size="xs"
              label="Log in again"
              @click="editBotLogin(botStore.selectedBot)"
            />
            <BotSelect />
            <ReloadControl />
          </div>
        </template>

        <ThemeSelect v-if="!isMobile" />

        <template v-if="!isMobile">
          <UDropdownMenu v-if="botStore.hasBots" :items="menuItems" size="lg">
            <UButton
              color="neutral"
              variant="ghost"
              icon="mdi:account-circle-outline"
              trailing-icon="mdi:chevron-down"
              aria-label="Account and layout menu"
            />
          </UDropdownMenu>
          <UButton
            v-else-if="route?.path !== '/login'"
            color="primary"
            variant="solid"
            icon="mdi:login"
            label="Login"
            @click="loginDialog({})"
          />
        </template>

        <!-- Mobile menu -->
        <template v-else>
          <span
            v-if="botStore.hasBots"
            class="flex min-w-0 items-center gap-2 text-sm text-muted"
            :title="botStatus.label"
          >
            <span class="size-2 shrink-0 rounded-full" :class="botStatus.dot" aria-hidden="true" />
            <span class="truncate">{{ activeBot?.botName }}</span>
          </span>
          <USlideover title="Menu" :close="{ color: 'neutral', variant: 'ghost' }">
            <UButton
              color="neutral"
              variant="ghost"
              size="xl"
              icon="mdi:menu"
              aria-label="Open menu"
            />
            <template #title>
              <div class="flex items-center gap-2">
                <AppIcon class="h-8 w-8" />
                <AppText />
              </div>
            </template>
            <template #body="{ close }">
              <div class="flex h-full flex-col gap-6">
                <nav aria-label="Main" class="flex flex-col gap-1">
                  <UButton
                    v-for="(item, index) in navItems.filter((item) => item.visible ?? true)"
                    :key="index"
                    :to="item.to"
                    :icon="item.icon"
                    :label="item.label"
                    color="neutral"
                    variant="ghost"
                    size="xl"
                    class="justify-start text-muted"
                    active-class="bg-elevated text-highlighted"
                    @click="close()"
                  />
                </nav>

                <section v-if="botStore.hasBots" class="flex flex-col gap-3" aria-label="Bot">
                  <h2 class="text-xs font-semibold uppercase tracking-wide text-muted">Bot</h2>
                  <div
                    class="flex items-center justify-between gap-2 rounded-lg border border-default p-3"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <span class="size-2.5 shrink-0 rounded-full" :class="botStatus.dot" />
                      <span class="truncate font-medium">{{ activeBot?.botName }}</span>
                      <span class="text-sm text-muted">· {{ botStatus.label }}</span>
                    </span>
                    <UBadge v-if="isDryRun" color="neutral" variant="soft" label="Dry run" />
                  </div>
                  <BotSelect />
                  <ReloadControl show-label />
                </section>

                <ThemeSelect show-text class="justify-start" />

                <div class="mt-auto flex items-center justify-between text-sm text-muted">
                  <span>Version {{ settingsStore.uiVersion }}</span>
                  <UButton
                    v-if="botStore.hasBots && botStore.botCount === 1"
                    color="neutral"
                    variant="outline"
                    icon="mdi:logout"
                    label="Logout"
                    @click="
                      close();
                      clickLogout();
                    "
                  />
                </div>
              </div>
            </template>
          </USlideover>
        </template>
      </div>
    </div>
  </header>
</template>
