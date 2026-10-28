<script setup lang="ts">
const botStore = useBotStore();
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-3 md:p-6">
    <PageHeader
      title="Pairlist builder"
      description="Combine filters into a pairlist, test it on the exchange, then copy the config."
    />
    <WebserverOnlyNotice
      v-if="!botStore.activeBot.isWebserverMode"
      feature="The pairlist builder"
    />
    <PairlistConfigurator v-else />
  </div>
</template>
