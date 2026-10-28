<script setup lang="ts">
/** Shown on tool pages that a trading bot can't serve. */
defineProps<{ feature: string }>();
</script>

<template>
  <div class="panel flex flex-col items-start gap-3 p-6 text-left">
    <UIcon name="mdi:server-network-outline" class="size-6 text-muted" aria-hidden="true" />
    <div class="flex max-w-prose flex-col gap-1">
      <h2 class="text-base font-semibold text-highlighted">
        {{ feature }} needs the bot in webserver mode
      </h2>
      <p class="text-sm text-muted">
        The connected bot is trading, so it can't run this. Start a second freqtrade instance with
        the <code class="rounded bg-elevated px-1 font-mono text-xs">webserver</code> command and
        add it as another bot.
      </p>
    </div>
    <UButton
      color="neutral"
      variant="outline"
      icon="mdi:open-in-new"
      label="Webserver mode docs"
      to="https://www.freqtrade.io/en/stable/utils/#webserver-mode"
      target="_blank"
    />
  </div>
</template>
