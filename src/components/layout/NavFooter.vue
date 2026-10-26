<script setup lang="ts">
const botStore = useBotStore();

const tabs = [
  { to: '/open_trades', label: 'Trades', icon: 'mdi:swap-horizontal-bold' },
  { to: '/trade_history', label: 'History', icon: 'mdi:history' },
  { to: '/pairlist', label: 'Pairs', icon: 'mdi:format-list-bulleted' },
  { to: '/balance', label: 'Balance', icon: 'mdi:wallet-outline' },
  { to: '/dashboard', label: 'Dashboard', icon: 'mdi:view-dashboard-outline' },
];
</script>

<template>
  <!-- Only visible on phone-sized screens -->
  <nav
    v-if="!botStore.canRunBacktest"
    aria-label="Quick navigation"
    class="border-t border-default bg-default/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
  >
    <ul class="grid grid-cols-5">
      <li v-for="tab in tabs" :key="tab.to">
        <RouterLink
          :to="tab.to"
          class="group flex min-h-14 flex-col items-center justify-center gap-1 text-[12px] font-medium text-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          active-class="is-active text-primary"
        >
          <span
            class="flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150 group-[.is-active]:bg-primary/15"
          >
            <UIcon :name="tab.icon" class="size-5" aria-hidden="true" />
          </span>
          {{ tab.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
