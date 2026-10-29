<script setup lang="ts">
import { t } from '@/i18n';

withDefaults(defineProps<{ showText?: boolean }>(), { showText: false });

// Shared with Nuxt UI's color mode - App.vue mirrors it into the settings store for charts.
const isDark = useDark();

const toggleLabel = computed(() => (isDark.value ? t('theme.toLight') : t('theme.toDark')));

function toggleNight() {
  document.body.classList.add('ft-theme-transition');
  window.setTimeout(() => {
    document.body.classList.remove('ft-theme-transition');
  }, 1000);
  isDark.value = !isDark.value;
}
</script>

<template>
  <UButton
    variant="ghost"
    :title="toggleLabel"
    :aria-label="showText ? undefined : toggleLabel"
    color="neutral"
    :label="showText ? toggleLabel : ''"
    :icon="isDark ? 'lucide:sun' : 'lucide:moon'"
    @click="toggleNight"
  />
</template>
