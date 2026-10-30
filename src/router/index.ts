import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: 'home.bots',
      allowAnonymous: true,
    },
  },
  {
    path: '/trade',
    name: 'Freqtrade Trading',
    component: () => import('@/views/TradingView.vue'),
  },
  {
    path: '/graph',
    name: 'Freqtrade Graph',
    component: () => import('@/views/ChartsView.vue'),
  },
  {
    path: '/logs',
    name: 'Freqtrade Logs',
    component: () => import('@/views/LogView.vue'),
  },
  {
    path: '/backtest',
    name: 'Freqtrade Backtest',
    component: () => import('@/views/BacktestingView.vue'),
  },
  {
    path: '/dashboard',
    name: 'Freqtrade Dashboard',
    component: () => import('@/views/DashboardView.vue'),
  },
  {
    path: '/journal',
    name: 'Freqtrade Journal',
    meta: { title: 'nav.journal' },
    component: () => import('@/views/JournalView.vue'),
  },
  {
    path: '/balance',
    meta: { title: 'trade.balance' },
    name: 'Freqtrade Balance',
    component: () => import('@/views/MobilePanelView.vue'),
    props: { panel: 'balance' },
  },
  {
    path: '/open_trades',
    meta: { title: 'trade.openTrades' },
    component: () => import('@/views/MobileTradesListView.vue'),
  },

  {
    path: '/trade_history',
    meta: { title: 'trade.closedTrades' },
    component: () => import('@/views/MobileTradesListView.vue'),
    props: { history: true },
  },
  {
    path: '/pairlist',
    meta: { title: 'trade.pairlist' },
    component: () => import('@/views/MobilePanelView.vue'),
    props: { panel: 'pairlist' },
  },
  {
    path: '/settings',
    name: 'Freqtrade Settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      allowAnonymous: true,
      fullscreen: true,
    },
  },
  {
    path: '/pairlist_config',
    name: 'Pairlist Configuration',
    component: () => import('@/views/PairlistConfigView.vue'),
  },
  {
    path: '/download_data',
    name: 'Download Data',
    component: () => import('@/views/DownloadDataView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    component: () => import('@/views/Error404View.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  // Init bots here...
  initBots();
  const botStore = useBotStore();
  if (!to.meta?.allowAnonymous && !botStore.hasBots) {
    // Forward to login if login is required
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    };
  } else {
    return true;
  }
});

export default router;
