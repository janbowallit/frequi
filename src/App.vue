<script setup lang="ts">
const settingsStore = useSettingsStore();
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
    <div id="app" class="flex flex-col h-dvh" :style="colorStore.cssVars">
      <NavBar v-if="showAppChrome" />
      <BodyLayout class="grow overflow-auto" />
      <NavFooter v-if="showAppChrome" />
    </div>
  </UApp>
</template>

<style scoped>
#app {
  font-family: var(--app-font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}

/* * {
  outline: 1px solid #f00 !important;
} */
</style>
