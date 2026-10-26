<script setup lang="ts">
useTitle('Sign in · FreqUI', { restoreOnUnmount: (original) => original });
</script>

<template>
  <div class="login-page relative flex min-h-full items-center justify-center px-4 py-10 sm:py-16">
    <div aria-hidden="true" class="login-backdrop pointer-events-none absolute inset-0" />

    <div class="login-panel relative w-full max-w-[26rem]">
      <header class="mb-8 flex flex-col items-center gap-4 text-center">
        <AppIcon class="h-14 w-14" />
        <div class="flex flex-col gap-1.5">
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
            Sign in to Freqtrade<span class="text-primary">UI</span>
          </h1>
          <p class="text-base text-muted">Connect to your bot to monitor and control trading.</p>
        </div>
      </header>

      <section
        aria-label="Sign in"
        class="rounded-2xl border border-default bg-default/90 p-6 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-8 dark:shadow-black/40"
      >
        <BotLogin />
      </section>

      <footer class="mt-6 flex items-center justify-between gap-4 text-sm text-muted">
        <p class="flex items-center gap-2 text-left">
          <UIcon name="mdi:shield-lock-outline" class="size-4 shrink-0" aria-hidden="true" />
          <span>Your password is never stored, only a session token.</span>
        </p>
        <ThemeSelect />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.login-backdrop {
  background:
    radial-gradient(
      48rem 28rem at 50% -8%,
      color-mix(in oklab, var(--color-brand-400) 16%, transparent),
      transparent 70%
    ),
    radial-gradient(
      32rem 20rem at 85% 110%,
      color-mix(in oklab, var(--color-brand-600) 10%, transparent),
      transparent 70%
    );
}

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
