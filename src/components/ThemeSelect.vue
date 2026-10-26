<script setup lang="ts">
import type { ThemeName } from '@/types';

const activeTheme = ref('');
const settingsStore = useSettingsStore();

withDefaults(defineProps<{ showText?: boolean }>(), { showText: false });

function setTheme(themeName: ThemeName) {
  // If theme is already active, do nothing.
  if (activeTheme.value === themeName) {
    return;
  }
  if (['bootstrap', 'bootstrap_dark', 'light', 'dark'].includes(themeName.toLowerCase())) {
    // const styles = document.getElementsByTagName('style');
    if (activeTheme.value) {
      // Only transition if simple mode is active
      document.body.classList.add('ft-theme-transition');
      window.setTimeout(() => {
        document.body.classList.remove('ft-theme-transition');
      }, 1000);
    }
    if (themeName.toLowerCase() === 'bootstrap' || themeName.toLowerCase() === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Add the dark theme
      document.documentElement.classList.add('dark');
    }
  }
  // Save the theme as localstorage
  settingsStore.currentTheme = themeName;
  activeTheme.value = themeName;
}

onMounted(() => {
  if (settingsStore.currentTheme) setTheme(settingsStore.currentTheme);
});

const isLight = computed(() => ['light', 'bootstrap'].includes(activeTheme.value));
const toggleLabel = computed(() =>
  isLight.value ? 'Switch to dark mode' : 'Switch to light mode',
);

function toggleNight() {
  setTheme(['light', 'bootstrap'].includes(activeTheme.value) ? 'dark' : 'light');
}
</script>

<template>
  <UButton
    variant="ghost"
    :title="toggleLabel"
    :aria-label="showText ? undefined : toggleLabel"
    color="neutral"
    :label="showText ? toggleLabel : ''"
    :icon="isLight ? 'mdi:weather-night' : 'mdi:white-balance-sunny'"
    @click="toggleNight"
  />
</template>
