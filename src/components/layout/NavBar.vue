<script setup lang="ts">
import Favico from 'favico.js';

import { useRoute } from 'vue-router';
import type { DropdownMenuItem } from '@nuxt/ui';
import { breakpointsTailwind } from '@vueuse/core';
import type { AuthStorageWithBotId } from '@/types';

const botStore = useBotStore();

const settingsStore = useSettingsStore();
const route = useRoute();
const router = useRouter();
const favicon = ref<Favico | undefined>(undefined);
const pingInterval = ref<number>();
const loginDialog = useLoginDialog();
const mobileMenuOpen = ref(false);

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

const isWebserver = computed(() => botStore.activeBotorUndefined?.isWebserverMode ?? false);
const needsWebserver = 'Needs the bot in webserver mode';

// Navigation items array
const navItems = ref([
  {
    label: 'Trade',
    to: '/trade',
    visible: computed(() => !botStore.canRunBacktest),
    icon: 'i-mdi-swap-horizontal',
  },
  {
    label: 'Dashboard',
    to: '/dashboard',
    visible: computed(() => !botStore.canRunBacktest),
    icon: 'i-mdi-view-dashboard-outline',
  },
  {
    label: 'Chart',
    to: '/graph',
    icon: 'i-mdi-chart-line',
  },
  {
    label: 'Logs',
    to: '/logs',
    icon: 'i-mdi-text-box-outline',
  },
]);

// Rarely used pages live under one menu
const toolItems = computed(() => [
  {
    label: 'Backtest',
    to: '/backtest',
    icon: 'i-mdi-history',
    description: 'Test a strategy on past candles',
    disabled: !botStore.canRunBacktest,
  },
  {
    label: 'Pairlist builder',
    to: '/pairlist_config',
    icon: 'i-mdi-format-list-numbered',
    description: 'Combine filters into a pairlist',
    disabled: !(isWebserver.value && botStore.activeBot.botFeatures.pairlistConfig),
  },
  {
    label: 'Download candles',
    to: '/download_data',
    icon: 'i-mdi-download-outline',
    description: 'Fetch history for backtesting',
    disabled: !(isWebserver.value && botStore.activeBot.botFeatures.downloadDataView),
  },
]);

const toolMenuItems = computed<DropdownMenuItem[][]>(() => [
  toolItems.value.map((item) => ({
    label: item.label,
    icon: item.icon,
    to: item.disabled ? undefined : item.to,
    description: item.disabled ? needsWebserver : item.description,
    disabled: item.disabled,
  })),
]);
const isToolRoute = computed(() => toolItems.value.some((t) => route.path === t.to));

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: `Version ${settingsStore.uiVersion}`,
      disabled: true,
    },
  ],
  [
    {
      label: 'Settings',
      icon: 'i-mdi-cog',
      onSelect: () => router.push('/settings'),
    },
  ],
  ...(botStore.hasBots && botStore.botCount === 1
    ? [
        [
          {
            label: 'Sign out',
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
  <header class="relative z-40 border-b border-default bg-default">
    <div class="flex h-14 items-center gap-2 px-3 lg:px-4">
      <RouterLink
        exact
        to="/"
        aria-label="FreqUI home"
        class="flex shrink-0 items-center gap-2 rounded-md pe-1"
      >
        <AppIcon class="h-8 w-8" />
        <AppText class="hidden text-lg lg:inline" />
      </RouterLink>

      <!-- Desktop navigation -->
      <nav v-if="!isMobile" aria-label="Main" class="ms-4 flex h-full items-center gap-1">
        <UButton
          v-for="(item, index) in navItems.filter((item) => item.visible ?? true)"
          :key="index"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          color="neutral"
          variant="ghost"
          class="nav-link text-muted hover:text-highlighted"
          active-class="nav-link-active text-highlighted"
        />
        <UDropdownMenu :items="toolMenuItems" :content="{ align: 'start' }">
          <UButton
            label="Tools"
            icon="i-mdi-toolbox-outline"
            trailing-icon="mdi:chevron-down"
            color="neutral"
            variant="ghost"
            class="nav-link text-muted hover:text-highlighted"
            :class="{ 'nav-link-active text-highlighted': isToolRoute }"
          />
        </UDropdownMenu>
      </nav>

      <div class="ms-auto flex min-w-0 items-center gap-2">
        <template v-if="!isMobile">
          <UTooltip
            v-if="!settingsStore.confirmDialog"
            text="Confirmations are off: force exits run immediately."
          >
            <UBadge
              color="warning"
              variant="subtle"
              icon="mdi:alert-outline"
              label="No confirmations"
              class="cursor-help"
            />
          </UTooltip>

          <!-- Active bot -->
          <div
            v-if="botStore.hasBots"
            class="flex h-9 items-center gap-2 rounded-md border border-default ps-3 pe-1"
          >
            <span class="size-2 shrink-0 rounded-full" :class="botStatus.dot" aria-hidden="true" />
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
              label="Sign in again"
              @click="editBotLogin(botStore.selectedBot)"
            />
            <BotSelect />
            <ReloadControl />
          </div>

          <ThemeSelect />

          <UDropdownMenu v-if="botStore.hasBots" :items="menuItems" :content="{ align: 'end' }">
            <UButton
              color="neutral"
              variant="ghost"
              icon="mdi:account-circle-outline"
              trailing-icon="mdi:chevron-down"
              aria-label="Account and settings"
            />
          </UDropdownMenu>
          <UButton
            v-else-if="route?.path !== '/login'"
            color="primary"
            variant="solid"
            icon="mdi:login"
            label="Sign in"
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
          <USlideover
            v-model:open="mobileMenuOpen"
            title="Menu"
            :close="{ color: 'neutral', variant: 'ghost' }"
          >
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
              <div class="flex h-full flex-col gap-6 text-left">
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
                  <UButton
                    to="/settings"
                    icon="i-mdi-cog-outline"
                    label="Settings"
                    color="neutral"
                    variant="ghost"
                    size="xl"
                    class="justify-start text-muted"
                    active-class="bg-elevated text-highlighted"
                    @click="close()"
                  />
                </nav>

                <section class="flex flex-col gap-1" aria-labelledby="mobile-tools">
                  <h2 id="mobile-tools" class="px-2.5 text-sm font-medium text-muted">Tools</h2>
                  <UButton
                    v-for="item in toolItems"
                    :key="item.to"
                    :to="item.disabled ? undefined : item.to"
                    :disabled="item.disabled"
                    :icon="item.icon"
                    color="neutral"
                    variant="ghost"
                    size="lg"
                    class="justify-start text-muted"
                    active-class="bg-elevated text-highlighted"
                    @click="close()"
                  >
                    <span class="flex flex-col items-start">
                      <span>{{ item.label }}</span>
                      <span class="text-xs text-dimmed">
                        {{ item.disabled ? needsWebserver : item.description }}
                      </span>
                    </span>
                  </UButton>
                </section>

                <section v-if="botStore.hasBots" class="flex flex-col gap-2" aria-labelledby="mobile-bot">
                  <h2 id="mobile-bot" class="px-2.5 text-sm font-medium text-muted">Bot</h2>
                  <div
                    class="flex items-center justify-between gap-2 rounded-md border border-default p-3"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <span class="size-2.5 shrink-0 rounded-full" :class="botStatus.dot" />
                      <span class="truncate font-medium">{{ activeBot?.botName }}</span>
                      <span class="text-sm text-muted">{{ botStatus.label }}</span>
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
                    label="Sign out"
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

<style scoped>
/* Active page: a brass bar sitting on the header's bottom edge */
.nav-link {
  position: relative;
}
.nav-link-active::after {
  content: '';
  position: absolute;
  inset-inline: 0.5rem;
  bottom: calc(-0.75rem - 1px);
  height: 2px;
  border-radius: 2px;
  background: var(--ui-primary);
}
</style>
