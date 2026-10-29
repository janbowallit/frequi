<script setup lang="ts">
/** Phone tab bar: the four pages used most, plus settings. */
const botStore = useBotStore();
const { mainLinks, settingsLink } = useAppNav();
const tabs = computed(() => [...mainLinks.value, settingsLink.value].slice(0, 5));
</script>

<template>
  <nav
    v-if="!botStore.canRunBacktest"
    :aria-label="$t('nav.quick')"
    class="border-t border-default bg-default/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
  >
    <ul class="grid grid-flow-col auto-cols-fr">
      <li v-for="tab in tabs" :key="tab.to">
        <RouterLink
          :to="tab.to"
          class="group flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted transition-colors"
          active-class="is-active text-highlighted"
        >
          <span
            class="relative flex h-7 w-12 items-center justify-center rounded-full transition-colors group-[.is-active]:bg-primary/15 group-[.is-active]:text-primary"
          >
            <UIcon :name="tab.icon" class="size-5" aria-hidden="true" />
            <span
              v-if="tab.badge"
              class="absolute -top-1 end-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-semibold text-inverted tabular-nums"
            >
              {{ tab.badge }}
            </span>
          </span>
          {{ tab.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
