<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui';
import { LOCALES, t } from '@/i18n';

/** ⌘K palette: jump to a page, a pair's chart or an open trade, or run a quick action. */
const botStore = useBotStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const loginDialog = useLoginDialog();
const isDark = useDark();
const { mainLinks, toolLinks, settingsLink } = useAppNav();

const bot = computed(() => botStore.activeBotorUndefined);

function openPair(pair: string) {
  if (!bot.value) return;
  bot.value.selectedPair = pair;
  router.push(botStore.canRunBacktest ? '/graph' : '/trade');
}

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => {
  const pages = [
    ...mainLinks.value,
    ...toolLinks.value.filter((l) => !l.disabled),
    settingsLink.value,
  ].map((l) => ({
    id: l.to,
    label: l.label,
    suffix: l.description,
    icon: l.icon,
    to: l.to,
  }));

  const result: CommandPaletteGroup<CommandPaletteItem>[] = [
    { id: 'pages', label: t('nav.pages'), items: pages },
  ];

  if (bot.value?.openTrades.length) {
    result.push({
      id: 'trades',
      label: t('dashboard.openTrades'),
      items: bot.value.openTrades.map((trade) => ({
        id: `trade-${trade.trade_id}`,
        label: trade.pair,
        suffix: `#${trade.trade_id}`,
        icon: 'i-lucide-arrow-left-right',
        onSelect: () => bot.value?.setDetailTrade(trade),
      })),
    });
  }

  if (bot.value?.whitelist.length) {
    result.push({
      id: 'pairs',
      label: t('nav.pairs'),
      items: bot.value.whitelist.map((pair) => ({
        id: `pair-${pair}`,
        label: pair,
        icon: 'i-lucide-chart-candlestick',
        onSelect: () => openPair(pair),
      })),
    });
  }

  result.push({
    id: 'actions',
    label: t('nav.actions'),
    items: [
      {
        id: 'theme',
        label: isDark.value ? t('theme.toLight') : t('theme.toDark'),
        icon: isDark.value ? 'i-lucide-sun' : 'i-lucide-moon',
        onSelect: () => (isDark.value = !isDark.value),
      },
      ...LOCALES.filter((l) => l.code !== settingsStore.locale).map((l) => ({
        id: `lang-${l.code}`,
        label: `${t('language.label')}: ${l.name}`,
        icon: 'i-lucide-languages',
        onSelect: () => (settingsStore.locale = l.code),
      })),
      ...(botStore.hasBots
        ? [
            {
              id: 'refresh',
              label: t('nav.refreshAll'),
              icon: 'i-lucide-refresh-cw',
              onSelect: () => botStore.allRefreshFull(),
            },
          ]
        : []),
      {
        id: 'add-bot',
        label: t('home.addBot'),
        icon: 'i-lucide-plus',
        onSelect: () => loginDialog({}),
      },
    ],
  });
  return result;
});
</script>

<template>
  <UDashboardSearch
    :groups="groups"
    :color-mode="false"
    :placeholder="$t('nav.searchPlaceholder')"
    :fuse="{ resultLimit: 8 }"
  />
</template>
