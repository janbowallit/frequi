<script setup lang="ts">
/** Shown on tool pages that a trading bot can't serve. */
defineProps<{ feature: string }>();
</script>

<template>
  <div class="card flex flex-col items-start gap-3 p-6 text-start">
    <UIcon name="lucide:server" class="size-6 text-muted" aria-hidden="true" />
    <div class="flex max-w-prose flex-col gap-1">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('general.webserverTitle', { feature }) }}
      </h2>
      <I18nT keypath="general.webserverDetail" tag="p" scope="global" class="text-sm text-muted">
        <template #command>
          <code class="rounded bg-elevated px-1 font-mono text-xs">webserver</code>
        </template>
      </I18nT>
    </div>
    <UButton
      color="neutral"
      variant="outline"
      icon="lucide:external-link"
      :label="$t('general.webserverDocs')"
      to="https://www.freqtrade.io/en/stable/utils/#webserver-mode"
      target="_blank"
    />
  </div>
</template>
