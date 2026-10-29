<script setup lang="ts">
import { en as uiEn, fa_ir as uiFa } from '@nuxt/ui/locale';
import { applyLocale, isLocale } from '@/i18n';

const settingsStore = useSettingsStore();
const botStore = useBotStore();
const colorStore = useColorStore();
const route = useRoute();
// Pages like login use the full screen - app navigation is useless before signing in.
const showAppChrome = computed(() => !route.meta.fullscreen);
// Nuxt UI's color mode (light / dark / system) is the single source of truth for the theme -
// mirror it into the settings so charts render with the matching theme.
const isDark = useDark();
watch(
  isDark,
  (dark) => {
    settingsStore.currentTheme = dark ? 'dark' : 'light';
  },
  { immediate: true },
);
// The chosen language drives the messages, <html lang/dir> and Nuxt UI's own labels
watch(
  () => settingsStore.locale,
  (code) => applyLocale(isLocale(code) ? code : 'en'),
  { immediate: true },
);
useTitleBadge();
const uiLocale = computed(() => (settingsStore.locale === 'fa' ? uiFa : uiEn));
onMounted(() => {
  setTimezone(settingsStore.timezone);
  colorStore.updateProfitLossColor();
});
watch(
  () => settingsStore.timezone,
  (tz) => {
    console.log('timezone changed', tz);
    setTimezone(tz);
  },
);
</script>

<template>
  <UApp :locale="uiLocale" :tooltip="{ delayDuration: 250 }">
    <UDashboardGroup v-if="showAppChrome" unit="rem" storage-key="ft-shell">
      <AppSidebar />
      <UDashboardPanel
        id="ft-main"
        :ui="{ body: 'gap-0 bg-neutral-50 p-0 sm:gap-0 sm:p-0 dark:bg-neutral-950' }"
      >
        <template #header>
          <AppTopbar />
          <StatusStrip v-if="botStore.hasBots" />
        </template>
        <template #body>
          <RouterView />
        </template>
        <template #footer>
          <NavFooter />
        </template>
      </UDashboardPanel>
      <AppSearch />
    </UDashboardGroup>
    <RouterView v-else />
    <TradeDetailSlideover v-if="botStore.hasBots" />
  </UApp>
</template>
