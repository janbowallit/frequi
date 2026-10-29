<script setup lang="ts">
import { t } from '@/i18n';

useTitle(
  computed(() => `${t('login.pageTitle')} · FreqUI`),
  { restoreOnUnmount: (original) => original },
);
</script>

<template>
  <div class="relative flex min-h-full items-center justify-center px-4 py-10 sm:py-16">
    <div class="login-panel relative w-full max-w-[26rem]">
      <header class="mb-6 flex flex-col items-start gap-4 text-start">
        <AppIcon class="h-12 w-12" />
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
            {{ $t('login.title') }}
          </h1>
          <p class="text-muted">{{ $t('login.subtitle') }}</p>
        </div>
      </header>

      <section :aria-label="$t('common.signIn')" class="panel p-6 sm:p-7">
        <BotLogin />
      </section>

      <footer class="mt-5 flex items-center justify-between gap-4 text-sm text-muted">
        <p class="flex items-center gap-2 text-start">
          <UIcon name="mdi:shield-lock-outline" class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ $t('login.tokenOnly') }}</span>
        </p>
        <div class="flex shrink-0 items-center">
          <LanguageSelect />
          <ThemeSelect />
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .login-panel {
    animation: login-enter 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

@keyframes login-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
