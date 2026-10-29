<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { t } from '@/i18n';

const botStore = useBotStore();
const settingsStore = useSettingsStore();
const { mainLinks, toolLinks, settingsLink } = useAppNav();

const open = ref(false);
// Close the phone slideover after navigating
const route = useRoute();
watch(
  () => route.fullPath,
  () => (open.value = false),
);

const mainItems = computed<NavigationMenuItem[]>(() =>
  mainLinks.value.map((l) => ({
    label: l.label,
    icon: l.icon,
    to: l.to,
    badge: l.badge ? { label: String(l.badge), color: 'primary', variant: 'soft' } : undefined,
    tooltip: true,
  })),
);

const toolItems = computed<NavigationMenuItem[]>(() => [
  { type: 'label', label: t('nav.tools') },
  ...toolLinks.value.map((l) => ({
    label: l.label,
    icon: l.icon,
    to: l.disabled ? undefined : l.to,
    disabled: l.disabled,
    tooltip: { text: l.description },
  })),
]);

const footerItems = computed<NavigationMenuItem[]>(() => [
  {
    label: settingsLink.value.label,
    icon: settingsLink.value.icon,
    to: settingsLink.value.to,
    tooltip: true,
  },
]);
</script>

<template>
  <UDashboardSidebar
    v-model:open="open"
    collapsible
    resizable
    :min-size="14"
    :default-size="16"
    :max-size="22"
    :collapsed-size="4"
    :ui="{
      root: 'bg-default',
      header: 'px-3',
      body: 'gap-5 px-3',
      footer: 'flex-col items-stretch gap-1 border-t border-default px-3 py-3',
    }"
  >
    <template #header="{ collapsed }">
      <RouterLink
        to="/"
        :aria-label="$t('nav.home')"
        class="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
        :class="collapsed ? 'mx-auto' : ''"
      >
        <AppIcon class="size-8" />
        <AppText v-if="!collapsed" />
      </RouterLink>
    </template>

    <template #default="{ collapsed }">
      <SidebarBot v-if="botStore.hasBots" :collapsed="collapsed" />

      <UDashboardSearchButton
        :collapsed="collapsed"
        :label="$t('nav.search')"
        variant="outline"
        class="bg-default"
      />

      <UNavigationMenu
        :collapsed="collapsed"
        :items="mainItems"
        orientation="vertical"
        :aria-label="$t('nav.main')"
        tooltip
      />

      <UNavigationMenu
        :collapsed="collapsed"
        :items="toolItems"
        orientation="vertical"
        :aria-label="$t('nav.tools')"
      />
    </template>

    <template #footer="{ collapsed }">
      <UNavigationMenu :collapsed="collapsed" :items="footerItems" orientation="vertical" />
      <div class="flex items-center gap-1" :class="collapsed ? 'flex-col' : ''">
        <ThemeSelect />
        <LanguageSelect />
        <UTooltip v-if="!settingsStore.confirmDialog" :text="$t('nav.noConfirmationsHelp')">
          <UIcon
            name="i-lucide-shield-alert"
            class="mx-2 size-4 text-warning"
            :aria-label="$t('nav.noConfirmations')"
          />
        </UTooltip>
        <span v-if="!collapsed" class="ms-auto truncate text-xs text-dimmed tabular-nums">
          {{ settingsStore.uiVersion }}
        </span>
      </div>
    </template>
  </UDashboardSidebar>
</template>
