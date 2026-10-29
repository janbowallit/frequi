<script setup lang="ts">
const botStore = useBotStore();

const tabs = [
  { to: '/trade', label: 'nav.trade', icon: 'mdi:swap-horizontal' },
  { to: '/dashboard', label: 'nav.dashboard', icon: 'mdi:view-dashboard-outline' },
  { to: '/graph', label: 'nav.chart', icon: 'mdi:chart-line' },
  { to: '/logs', label: 'nav.logs', icon: 'mdi:text-box-outline' },
  { to: '/settings', label: 'nav.settings', icon: 'mdi:cog-outline' },
] as const;
</script>

<template>
  <!-- Only visible on phone-sized screens -->
  <nav
    v-if="!botStore.canRunBacktest"
    :aria-label="$t('nav.quick')"
    class="border-t border-default bg-default pb-[env(safe-area-inset-bottom)] md:hidden"
  >
    <ul class="grid grid-cols-5">
      <li v-for="tab in tabs" :key="tab.to">
        <RouterLink
          :to="tab.to"
          class="group flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-muted"
          active-class="is-active text-highlighted"
        >
          <span
            class="flex h-7 w-12 items-center justify-center rounded-full group-[.is-active]:bg-primary/15 group-[.is-active]:text-primary"
          >
            <UIcon :name="tab.icon" class="size-5" aria-hidden="true" />
          </span>
          {{ $t(tab.label) }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
