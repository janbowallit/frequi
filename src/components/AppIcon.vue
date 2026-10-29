<script setup lang="ts">
/** App mark: three rising candles on an amber tile. Same drawing as public/favicon.svg. */
// Unique per instance - a hidden copy (desktop sidebar on a phone) would otherwise blank the gradient
const gradientId = useId();
</script>

<template>
  <svg viewBox="0 0 32 32" role="img" :aria-label="$t('common.logo')" class="shrink-0">
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fbbf24" />
        <stop offset="1" stop-color="#d97706" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" :fill="`url(#${gradientId})`" />
    <g fill="#18181b" stroke="#18181b" stroke-width="1.6" stroke-linecap="round">
      <line x1="9" y1="14" x2="9" y2="26" />
      <rect x="7" y="17" width="4" height="6" rx="1" stroke="none" />
      <line x1="16" y1="9" x2="16" y2="23" />
      <rect x="14" y="12" width="4" height="8" rx="1" stroke="none" />
      <line x1="23" y1="5" x2="23" y2="19" />
      <rect x="21" y="7" width="4" height="9" rx="1" stroke="none" />
    </g>
  </svg>
</template>
