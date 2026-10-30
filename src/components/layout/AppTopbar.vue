<script setup lang="ts">
import { t } from '@/i18n';

/** Page title bar: sidebar toggle on phones, the page name, and page-wide shortcuts on the right. */
const route = useRoute();
const botStore = useBotStore();
const { mainLinks, toolLinks, settingsLink } = useAppNav();

const page = computed(() =>
  [...mainLinks.value, ...toolLinks.value, settingsLink.value].find((l) => l.to === route.path),
);
const title = computed(() => {
  const key = route.meta.title as string | undefined;
  return page.value?.label ?? (key ? t(key) : '');
});
</script>

<template>
  <!-- pointer-coarse: 44px touch targets on phones and tablets -->
  <UDashboardNavbar
    :title="title"
    :icon="page?.icon"
    :toggle="{ class: 'pointer-coarse:size-11 justify-center' }"
    :ui="{ root: 'bg-default/80 backdrop-blur' }"
  >
    <template #leading>
      <UDashboardSidebarCollapse class="hidden lg:inline-flex" />
    </template>
    <template #right>
      <UDashboardSearchButton
        :label="undefined"
        collapsed
        class="justify-center lg:hidden pointer-coarse:size-11"
      />
      <ReloadControl v-if="botStore.hasBots" />
    </template>
  </UDashboardNavbar>
</template>
