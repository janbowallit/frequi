<script setup lang="ts">
import { t } from '@/i18n';

useTitle(
  computed(() => `${t('login.pageTitle')} · FreqUI`),
  { restoreOnUnmount: (original) => original },
);

const features = computed(() => [
  { icon: 'i-lucide-activity', text: t('login.featureStatus') },
  { icon: 'i-lucide-circle-pause', text: t('login.featureControl') },
  { icon: 'i-lucide-shield-check', text: t('login.featurePrivate') },
]);

// Decorative candles for the brand panel: [open, close, low, high] on a 0-100 scale
const candles = [
  [30, 38, 26, 42],
  [38, 34, 31, 41],
  [34, 45, 33, 48],
  [45, 52, 41, 55],
  [52, 47, 44, 56],
  [47, 58, 46, 61],
  [58, 55, 51, 62],
  [55, 66, 54, 70],
  [66, 63, 59, 69],
  [63, 74, 61, 78],
  [74, 70, 66, 77],
  [70, 82, 69, 86],
  [82, 79, 75, 85],
  [79, 90, 78, 94],
] as const;
</script>

<template>
  <div class="grid min-h-dvh bg-default lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <!-- Brand panel (wide screens) -->
    <aside
      class="hidden flex-col overflow-hidden border-e border-default bg-elevated/50 p-10 pb-0 lg:flex xl:p-14 xl:pb-0"
      aria-hidden="true"
    >
      <div class="flex items-center gap-3">
        <AppIcon class="size-9" />
        <AppText class="text-lg" />
      </div>

      <div class="flex max-w-md flex-1 flex-col justify-center gap-6 py-10 text-start">
        <h2 class="text-3xl font-semibold tracking-tight text-balance text-highlighted xl:text-4xl">
          {{ $t('login.brandTitle') }}
        </h2>
        <ul class="flex flex-col gap-3">
          <li v-for="f in features" :key="f.icon" class="flex items-center gap-3 text-muted">
            <span
              class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring ring-primary/20"
            >
              <UIcon :name="f.icon" class="size-4" />
            </span>
            {{ f.text }}
          </li>
        </ul>
      </div>

      <svg
        viewBox="0 0 280 100"
        preserveAspectRatio="none"
        class="-mx-10 h-48 w-[calc(100%+5rem)] shrink-0 opacity-70 xl:-mx-14 xl:w-[calc(100%+7rem)]"
      >
        <g v-for="([o, c, l, h], i) in candles" :key="i">
          <line
            :x1="10 + i * 19.5"
            :x2="10 + i * 19.5"
            :y1="100 - h"
            :y2="100 - l"
            stroke-width="1"
            :class="c >= o ? 'stroke-profit/50' : 'stroke-loss/50'"
          />
          <rect
            :x="5 + i * 19.5"
            :width="10"
            :y="100 - Math.max(o, c)"
            :height="Math.max(Math.abs(c - o), 1.5)"
            rx="1.5"
            :class="c >= o ? 'fill-profit/35' : 'fill-loss/35'"
          />
        </g>
      </svg>
    </aside>

    <!-- Sign in -->
    <main class="flex flex-col px-4 py-6 sm:px-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 lg:invisible">
          <AppIcon class="size-8" />
          <AppText />
        </div>
        <div class="flex items-center">
          <LanguageSelect />
          <ThemeSelect />
        </div>
      </div>

      <div class="flex flex-1 items-center justify-center py-10">
        <div
          class="w-full max-w-[26rem] transition duration-300 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none"
        >
          <header class="mb-8 flex flex-col gap-1.5 text-start">
            <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
              {{ $t('login.title') }}
            </h1>
            <p class="text-muted">{{ $t('login.subtitle') }}</p>
          </header>

          <section :aria-label="$t('common.signIn')">
            <BotLogin />
          </section>

          <p
            class="mt-8 flex items-center gap-2 border-t border-default pt-5 text-start text-sm text-muted"
          >
            <UIcon name="i-lucide-lock" class="size-4 shrink-0" aria-hidden="true" />
            <span>{{ $t('login.tokenOnly') }}</span>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
