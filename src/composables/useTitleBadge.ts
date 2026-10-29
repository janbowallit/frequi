import Favico from 'favico.js';

/**
 * Shows the open trade count in the tab title or as a favicon badge (Settings > open trades),
 * and pings all bots every minute so their online state stays current.
 */
export function useTitleBadge() {
  const botStore = useBotStore();
  const settingsStore = useSettingsStore();
  let favicon: Favico | undefined;

  function setBadge(tradeCount: number) {
    favicon ??= new Favico({ animation: 'none', bgColor: '#d97706', textColor: '#18181b' });
    if (tradeCount !== 0 && settingsStore.openTradesInTitle === OpenTradeVizOptions.showPill) {
      favicon.badge(tradeCount);
    } else {
      favicon.reset();
    }
  }

  function setTitle() {
    const bot = botStore.activeBotorUndefined;
    let title = 'FreqUI';
    if (settingsStore.openTradesInTitle === OpenTradeVizOptions.asTitle && bot) {
      title = `(${bot.openTradeCount}) ${title}`;
    }
    if (bot?.botName) title = `${title} - ${bot.botName}`;
    document.title = title;
  }

  watch(
    [
      () => settingsStore.openTradesInTitle,
      () => botStore.activeBotorUndefined?.botName,
      () => botStore.activeBotorUndefined?.openTradeCount,
    ],
    () => {
      setTitle();
      setBadge(botStore.activeBotorUndefined?.openTradeCount ?? 0);
    },
    { immediate: true },
  );

  useIntervalFn(() => botStore.pingAll(), 60000);
  onMounted(() => settingsStore.loadUIVersion());
}
