<template>
  <div class="flex min-h-full items-center justify-center px-4 py-16">
    <div class="flex max-w-md flex-col items-center gap-4 text-center">
      <p class="text-6xl font-semibold tracking-tight text-dimmed tabular-nums">404</p>
      <h1 class="text-2xl font-semibold text-highlighted">{{ $t('notFound.title') }}</h1>
      <p class="text-muted">{{ $t('notFound.detail') }}</p>
      <UButton to="/" variant="solid" icon="mdi:home-outline" :label="$t('notFound.home')" />
    </div>
  </div>
</template>
