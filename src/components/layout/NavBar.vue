<script setup lang="ts">
import Favico from 'favico.js';

import { useRoute } from 'vue-router';
import type { DropdownMenuItem } from '@nuxt/ui';
import { breakpointsTailwind } from '@vueuse/core';
import type { AuthStorageWithBotId } from '@/types';
import { LOCALES, t } from '@/i18n';

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
  if (!activeBot.value) return { label: t('nav.noBot'), dot: 'bg-neutral-400' };
  if (!activeBot.value.isBotLoggedIn) return { label: t('nav.loginExpired'), dot: 'bg-error' };
  return activeBot.value.isBotOnline
    ? { label: t('common.online'), dot: 'bg-success' }
    : { label: t('common.offline'), dot: 'bg-error' };
});
const isDryRun = computed(() => activeBot.value?.botState?.dry_run ?? false);

const isWebserver = computed(() => botStore.activeBotorUndefined?.isWebserverMode ?? false);
const needsWebserver = computed(() => t('nav.needsWebserver'));

// Navigation items array
const navItems = computed(() => [
  {
    label: t('nav.trade'),
    to: '/trade',
    visible: !botStore.canRunBacktest,
    icon: 'i-mdi-swap-horizontal',
  },
  {
    label: t('nav.dashboard'),
    to: '/dashboard',
    visible: !botStore.canRunBacktest,
    icon: 'i-mdi-view-dashboard-outline',
  },
  {
    label: t('nav.chart'),
    to: '/graph',
    icon: 'i-mdi-chart-line',
  },
  {
    label: t('nav.logs'),
    to: '/logs',
    icon: 'i-mdi-text-box-outline',
  },
]);

// Rarely used pages live under one menu
const toolItems = computed(() => [
  {
    label: t('nav.backtest'),
    to: '/backtest',
    icon: 'i-mdi-history',
    description: t('nav.backtestHelp'),
    disabled: !botStore.canRunBacktest,
  },
  {
    label: t('nav.pairlist'),
    to: '/pairlist_config',
    icon: 'i-mdi-format-list-numbered',
    description: t('nav.pairlistHelp'),
    disabled: !(isWebserver.value && botStore.activeBot.botFeatures.pairlistConfig),
  },
  {
    label: t('nav.download'),
    to: '/download_data',
    icon: 'i-mdi-download-outline',
    description: t('nav.downloadHelp'),
    disabled: !(isWebserver.value && botStore.activeBot.botFeatures.downloadDataView),
  },
]);

const toolMenuItems = computed<DropdownMenuItem[][]>(() => [
  toolItems.value.map((item) => ({
    label: item.label,
    icon: item.icon,
    to: item.disabled ? undefined : item.to,
    description: item.disabled ? needsWebserver.value : item.description,
    disabled: item.disabled,
  })),
]);
const isToolRoute = computed(() => toolItems.value.some((t) => route.path === t.to));

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('common.version', { version: settingsStore.uiVersion }),
      disabled: true,
    },
  ],
  [
    {
      label: t('common.settings'),
      icon: 'i-mdi-cog',
      onSelect: () => router.push('/settings'),
    },
    {
      label: t('language.label'),
      icon: 'i-mdi-translate',
      children: LOCALES.map((l) => ({
        label: l.name,
        type: 'checkbox' as const,
        checked: l.code === settingsStore.locale,
        onSelect: () => {
          settingsStore.locale = l.code;
        },
      })),
    },
  ],
  ...(botStore.hasBots && botStore.botCount === 1
    ? [
        [
          {
            label: t('common.signOut'),
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
    showAlert(t('nav.botNotFound'), 'warning');
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
        :aria-label="$t('nav.home')"
        class="flex shrink-0 items-center gap-2 rounded-md pe-1"
      >
        <AppIcon class="h-8 w-8" />
        <AppText class="hidden text-lg lg:inline" />
      </RouterLink>

      <!-- Desktop navigation -->
      <nav
        v-if="!isMobile"
        :aria-label="$t('nav.main')"
        class="ms-4 flex h-full items-center gap-1"
      >
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
            :label="$t('nav.tools')"
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
          <UTooltip v-if="!settingsStore.confirmDialog" :text="$t('nav.noConfirmationsHelp')">
            <UBadge
              color="warning"
              variant="subtle"
              icon="mdi:alert-outline"
              :label="$t('nav.noConfirmations')"
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
              {{ activeBot?.botName || $t('nav.noBotSelected') }}
            </span>
            <span class="sr-only">{{ botStatus.label }}</span>
            <UBadge
              v-if="isDryRun"
              color="neutral"
              variant="soft"
              size="sm"
              :label="$t('common.dryRun')"
            />
            <UButton
              v-if="activeBot && !activeBot.isBotLoggedIn"
              color="error"
              variant="soft"
              size="xs"
              :label="$t('nav.signInAgain')"
              @click="editBotLogin(botStore.selectedBot)"
            />
            <BotSelect />
            <ReloadControl />
          </div>

          <ThemeSelect />
          <!-- Without the account menu (signed out) the language choice sits in the header -->
          <LanguageSelect v-if="!botStore.hasBots" />

          <UDropdownMenu v-if="botStore.hasBots" :items="menuItems" :content="{ align: 'end' }">
            <UButton
              color="neutral"
              variant="ghost"
              icon="mdi:account-circle-outline"
              trailing-icon="mdi:chevron-down"
              :aria-label="$t('nav.account')"
            />
          </UDropdownMenu>
          <UButton
            v-else-if="route?.path !== '/login'"
            color="primary"
            variant="solid"
            icon="mdi:login"
            :label="$t('common.signIn')"
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
            :title="$t('nav.menu')"
            :close="{ color: 'neutral', variant: 'ghost' }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              size="xl"
              icon="mdi:menu"
              :aria-label="$t('nav.openMenu')"
            />
            <template #title>
              <div class="flex items-center gap-2">
                <AppIcon class="h-8 w-8" />
                <AppText />
              </div>
            </template>
            <template #body="{ close }">
              <div class="flex h-full flex-col gap-6 text-start">
                <nav :aria-label="$t('nav.main')" class="flex flex-col gap-1">
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
                    :label="$t('nav.settings')"
                    color="neutral"
                    variant="ghost"
                    size="xl"
                    class="justify-start text-muted"
                    active-class="bg-elevated text-highlighted"
                    @click="close()"
                  />
                </nav>

                <section class="flex flex-col gap-1" aria-labelledby="mobile-tools">
                  <h2 id="mobile-tools" class="px-2.5 text-sm font-medium text-muted">
                    {{ $t('nav.tools') }}
                  </h2>
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

                <section
                  v-if="botStore.hasBots"
                  class="flex flex-col gap-2"
                  aria-labelledby="mobile-bot"
                >
                  <h2 id="mobile-bot" class="px-2.5 text-sm font-medium text-muted">
                    {{ $t('common.bot') }}
                  </h2>
                  <div
                    class="flex items-center justify-between gap-2 rounded-md border border-default p-3"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <span class="size-2.5 shrink-0 rounded-full" :class="botStatus.dot" />
                      <span class="truncate font-medium">{{ activeBot?.botName }}</span>
                      <span class="text-sm text-muted">{{ botStatus.label }}</span>
                    </span>
                    <UBadge
                      v-if="isDryRun"
                      color="neutral"
                      variant="soft"
                      :label="$t('common.dryRun')"
                    />
                  </div>
                  <BotSelect />
                  <ReloadControl show-label />
                </section>

                <div class="flex flex-col gap-1">
                  <LanguageSelect show-text class="justify-start" />
                  <ThemeSelect show-text class="justify-start" />
                </div>

                <div class="mt-auto flex items-center justify-between text-sm text-muted">
                  <span>{{ $t('common.version', { version: settingsStore.uiVersion }) }}</span>
                  <UButton
                    v-if="botStore.hasBots && botStore.botCount === 1"
                    color="neutral"
                    variant="outline"
                    icon="mdi:logout"
                    :label="$t('common.signOut')"
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
