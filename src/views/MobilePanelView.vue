<script setup lang="ts">
/** Phone pages for the bottom navigation that show one bot panel in a card */
defineProps<{
  panel: 'balance' | 'pairlist';
}>();
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col p-3">
    <div class="card overflow-hidden">
      <BotBalance v-if="panel === 'balance'" />
      <PairListLive v-else />
    </div>
  </div>
</template>
