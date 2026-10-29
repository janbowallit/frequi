<script setup lang="ts">
const botStore = useBotStore();
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3 md:p-6">
    <PageHeader :description="$t('download.description')" />
    <WebserverOnlyNotice
      v-if="!botStore.activeBot.isWebserverMode"
      :feature="$t('general.featureDownload')"
    />
    <DownloadDataMain v-else />
  </div>
</template>
