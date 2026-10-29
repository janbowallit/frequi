<script setup lang="ts"></script>

<template>
  <div class="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 p-3 md:p-6">
    <PageHeader :description="$t('logPage.description')" />
    <LogViewer class="min-h-0 flex-1" />
  </div>
</template>
