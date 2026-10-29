<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { LOCALES } from '@/i18n';

withDefaults(defineProps<{ showText?: boolean }>(), { showText: false });

const settingsStore = useSettingsStore();

const current = computed(() => LOCALES.find((l) => l.code === settingsStore.locale) ?? LOCALES[0]);

const items = computed<DropdownMenuItem[]>(() =>
  LOCALES.map((l) => ({
    label: l.name,
    // Each name is written in its own language and direction
    lang: l.code,
    dir: l.dir,
    type: 'checkbox' as const,
    checked: l.code === settingsStore.locale,
    onSelect: () => {
      settingsStore.locale = l.code;
    },
  })),
);
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      variant="ghost"
      color="neutral"
      icon="mdi:translate"
      :title="$t('language.choose')"
      :aria-label="showText ? undefined : $t('language.choose')"
      :label="showText ? current.name : ''"
    />
  </UDropdownMenu>
</template>
