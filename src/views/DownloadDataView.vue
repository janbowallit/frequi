<script setup lang="ts">
const botStore = useBotStore();
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3 md:p-6">
    <PageHeader
      title="Download candles"
      description="Fetch price history from the exchange, for backtesting and charts."
    />
    <WebserverOnlyNotice v-if="!botStore.activeBot.isWebserverMode" feature="Downloading candles" />
    <DownloadDataMain v-else />
  </div>
</template>
