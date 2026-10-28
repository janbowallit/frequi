<script setup lang="ts">
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
  <UApp>
    <div id="app" class="flex flex-col h-dvh">
      <NavBar v-if="showAppChrome" />
      <StatusStrip v-if="showAppChrome && botStore.hasBots" />
      <BodyLayout class="grow overflow-auto" />
      <NavFooter v-if="showAppChrome" />
      <TradeDetailSlideover v-if="botStore.hasBots" />
    </div>
  </UApp>
</template>
