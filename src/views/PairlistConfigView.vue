<script setup lang="ts">
const botStore = useBotStore();
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-3 md:p-6">
    <PageHeader
      :title="$t('pairlistBuilder.title')"
      :description="$t('pairlistBuilder.description')"
    />
    <WebserverOnlyNotice
      v-if="!botStore.activeBot.isWebserverMode"
      :feature="$t('general.featurePairlist')"
    />
    <PairlistConfigurator v-else />
  </div>
</template>
