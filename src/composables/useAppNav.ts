import { t } from '@/i18n';

export interface AppNavLink {
  label: string;
  to: string;
  icon: string;
  description?: string;
  disabled?: boolean;
  badge?: number;
}

/**
 * The app's pages in one place, shared by the sidebar, the phone tab bar and the search palette.
 * Tools (backtest, pairlist, download) only work while the bot runs in webserver mode.
 */
export function useAppNav() {
  const botStore = useBotStore();
  const isWebserver = computed(() => botStore.activeBotorUndefined?.isWebserverMode ?? false);

  const mainLinks = computed<AppNavLink[]>(() =>
    [
      {
        label: t('nav.trade'),
        to: '/trade',
        icon: 'i-lucide-chart-candlestick',
        description: t('home.tradeHelp'),
        badge: botStore.activeBotorUndefined?.openTradeCount || undefined,
        visible: !botStore.canRunBacktest,
      },
      {
        label: t('nav.dashboard'),
        to: '/dashboard',
        icon: 'i-lucide-layout-dashboard',
        description: t('home.dashboardHelp'),
        visible: !botStore.canRunBacktest,
      },
      {
        label: t('nav.journal'),
        to: '/journal',
        icon: 'i-lucide-notebook-pen',
        description: t('home.journalHelp'),
        visible: !botStore.canRunBacktest,
      },
      {
        label: t('nav.chart'),
        to: '/graph',
        icon: 'i-lucide-chart-line',
        description: t('home.chartHelp'),
        visible: true,
      },
      {
        label: t('nav.logs'),
        to: '/logs',
        icon: 'i-lucide-scroll-text',
        description: t('home.logsHelp'),
        visible: true,
      },
    ]
      .filter((l) => l.visible)
      .map(({ visible: _, ...l }) => l),
  );

  const toolLinks = computed<AppNavLink[]>(() => {
    const needsWebserver = t('nav.needsWebserver');
    const pairlist = isWebserver.value && botStore.activeBotorUndefined?.botFeatures.pairlistConfig;
    const download =
      isWebserver.value && botStore.activeBotorUndefined?.botFeatures.downloadDataView;
    return [
      {
        label: t('nav.backtest'),
        to: '/backtest',
        icon: 'i-lucide-flask-conical',
        description: botStore.canRunBacktest ? t('nav.backtestHelp') : needsWebserver,
        disabled: !botStore.canRunBacktest,
      },
      {
        label: t('nav.pairlist'),
        to: '/pairlist_config',
        icon: 'i-lucide-list-filter',
        description: pairlist ? t('nav.pairlistHelp') : needsWebserver,
        disabled: !pairlist,
      },
      {
        label: t('nav.download'),
        to: '/download_data',
        icon: 'i-lucide-hard-drive-download',
        description: download ? t('nav.downloadHelp') : needsWebserver,
        disabled: !download,
      },
    ];
  });

  const settingsLink = computed<AppNavLink>(() => ({
    label: t('nav.settings'),
    to: '/settings',
    icon: 'i-lucide-settings',
  }));

  return { mainLinks, toolLinks, settingsLink };
}
