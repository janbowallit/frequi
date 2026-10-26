<script setup lang="ts">
const botStore = useBotStore();
const scrollContainer = ref<HTMLElement | null>(null);
const loading = ref(false);

onMounted(async () => {
  refreshLogs();
});

async function refreshLogs() {
  loading.value = true;
  try {
    await botStore.activeBot.getLogs();
  } finally {
    loading.value = false;
  }
  scrollToBottom();
}

function levelClass(logLevel: string) {
  switch (logLevel) {
    case 'WARNING':
      return 'bg-warning/15 text-warning';
    case 'ERROR':
    case 'CRITICAL':
      return 'bg-error/15 text-error';
    case 'DEBUG':
      return 'bg-elevated text-dimmed';
    default:
      return 'bg-elevated text-muted';
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}
</script>

<template>
  <section
    class="flex h-full flex-col overflow-hidden rounded-xl border border-default bg-default text-left"
    aria-label="Bot logs"
  >
    <div class="flex items-center justify-between gap-2 border-b border-default px-3 py-2">
      <p class="text-sm text-muted">
        <span class="font-medium text-highlighted tabular-nums">{{
          botStore.activeBot.lastLogs.length
        }}</span>
        recent entries
      </p>
      <div class="flex items-center gap-1">
        <UButton
          id="refresh-logs"
          color="neutral"
          variant="outline"
          icon="mdi:refresh"
          label="Refresh"
          :loading="loading"
          @click="refreshLogs"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="mdi:arrow-down"
          aria-label="Jump to latest entry"
          title="Jump to latest entry"
          @click="scrollToBottom"
        />
      </div>
    </div>
    <div
      ref="scrollContainer"
      class="h-full w-full overflow-auto bg-muted/40 py-2 font-mono text-[13px] leading-relaxed"
      tabindex="0"
      aria-label="Log entries"
    >
      <EmptyState
        v-if="botStore.activeBot.lastLogs.length === 0 && !loading"
        title="No log entries yet"
        icon="mdi:text-box-outline"
      />
      <div
        v-for="(log, index) in botStore.activeBot.lastLogs"
        :key="index"
        class="flex gap-3 px-3 py-0.5 hover:bg-elevated/50"
      >
        <span class="shrink-0 whitespace-nowrap text-dimmed tabular-nums">{{ log[0] }}</span>
        <span
          class="h-fit w-16 shrink-0 rounded px-1.5 text-center text-[11px] font-semibold"
          :class="levelClass(log[3])"
          >{{ log[3] }}</span
        >
        <span class="min-w-0 break-words whitespace-pre-wrap">
          <span class="me-2 text-muted">{{ log[2] }}</span>
          <span class="text-default">{{ log[4] }}</span>
        </span>
      </div>
    </div>
  </section>
</template>
