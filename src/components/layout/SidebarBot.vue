<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import type { AuthStorageWithBotId } from '@/types';
import { t } from '@/i18n';

/** The active bot at the top of the sidebar: its state at a glance, and a menu to switch or manage bots. */
defineProps<{ collapsed?: boolean }>();

const botStore = useBotStore();
const router = useRouter();
const loginDialog = useLoginDialog();

const bot = computed(() => botStore.activeBotorUndefined);

const status = computed<{ label: string; dot: string }>(() => {
  if (!bot.value) return { label: t('nav.noBot'), dot: 'bg-dimmed' };
  if (!bot.value.isBotLoggedIn) return { label: t('nav.loginExpired'), dot: 'bg-error' };
  return bot.value.isBotOnline
    ? { label: t('common.online'), dot: 'bg-success' }
    : { label: t('common.offline'), dot: 'bg-error' };
});
const modeLabel = computed(() =>
  bot.value?.botState?.dry_run ? t('common.dryRun') : t('nav.live'),
);

function signInAgain() {
  const id = botStore.selectedBot;
  const store = botStore.botStores[id];
  if (!store) return;
  const loginInfo: AuthStorageWithBotId = { ...store.getLoginInfo(), botId: id };
  loginDialog({ loginInfo });
}

async function signOut() {
  botStore.removeBot(botStore.selectedBot);
  await router.push('/');
}

const items = computed<DropdownMenuItem[][]>(() => [
  [
    { type: 'label', label: t('nav.switchBot') },
    ...botStore.availableBotsSorted.map((b) => ({
      label: b.botName,
      type: 'checkbox' as const,
      checked: b.botId === botStore.selectedBot,
      onSelect: () => botStore.selectBot(b.botId),
    })),
    { label: t('home.addBot'), icon: 'i-lucide-plus', onSelect: () => loginDialog({}) },
  ],
  [
    ...(bot.value && !bot.value.isBotLoggedIn
      ? [{ label: t('nav.signInAgain'), icon: 'i-lucide-log-in', onSelect: signInAgain }]
      : []),
    { label: t('nav.refreshAll'), icon: 'i-lucide-refresh-cw', onSelect: botStore.allRefreshFull },
    {
      label: t('nav.autoRefresh'),
      type: 'checkbox' as const,
      checked: botStore.globalAutoRefresh,
      onUpdateChecked: (v: boolean) => botStore.setGlobalAutoRefresh(v),
      onSelect: (e: Event) => e.preventDefault(),
    },
  ],
  [{ label: t('common.signOut'), icon: 'i-lucide-log-out', color: 'error', onSelect: signOut }],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'start', side: collapsed ? 'right' : 'bottom' }"
    :ui="{ content: collapsed ? 'w-56' : 'w-(--reka-dropdown-menu-trigger-width) min-w-56' }"
  >
    <button
      type="button"
      :aria-label="`${bot?.botName ?? $t('nav.noBot')} - ${status.label}`"
      class="group flex w-full items-center gap-2.5 rounded-lg text-start transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary data-[state=open]:bg-elevated"
      :class="collapsed ? 'size-9 justify-center' : 'border border-default p-2'"
    >
      <span
        class="relative flex size-8 shrink-0 items-center justify-center rounded-md bg-elevated text-muted ring ring-default"
      >
        <UIcon name="i-lucide-bot" class="size-4.5" aria-hidden="true" />
        <span
          class="absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-(--ui-bg)"
          :class="status.dot"
          aria-hidden="true"
        />
      </span>
      <span v-if="!collapsed" class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="truncate text-sm font-semibold text-highlighted">
          {{ bot?.botName || $t('nav.noBotSelected') }}
        </span>
        <span class="flex items-center gap-1.5 truncate text-xs text-muted">
          {{ status.label }}
          <template v-if="bot?.botState">
            <span aria-hidden="true">·</span>
            <span :class="bot.botState.dry_run ? '' : 'font-medium text-primary'">{{
              modeLabel
            }}</span>
          </template>
        </span>
      </span>
      <UIcon
        v-if="!collapsed"
        name="i-lucide-chevrons-up-down"
        class="size-4 shrink-0 text-dimmed group-hover:text-muted"
        aria-hidden="true"
      />
    </button>
  </UDropdownMenu>
</template>
