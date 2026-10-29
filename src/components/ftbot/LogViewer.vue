<script setup lang="ts">
import type { LogLine } from '@/types';
import { t } from '@/i18n';

type LevelFilter = 'all' | 'warning' | 'error';

const AUTO_REFRESH_MS = 10_000;

const botStore = useBotStore();
const scrollContainer = ref<HTMLElement | null>(null);
const loading = ref(false);
const search = ref('');
const levelFilter = ref<LevelFilter>('all');
const autoRefresh = useStorage('ftLogsAutoRefresh', false);
/** Hide routine chatter: this UI's own requests / websockets and the once-a-minute heartbeat */
const hideRoutine = useStorage('ftLogsHideRoutine', true);
/** Keep the view pinned to the newest entry while the user hasn't scrolled up */
const following = ref(true);

const searchTerm = refDebounced(search, 150);

function isRoutine(log: LogLine) {
  const logger = log[2];
  if (log[3] !== 'INFO') return false;
  return (
    logger.startsWith('uvicorn') ||
    logger.startsWith('freqtrade.rpc.api_server.ws') ||
    log[4].startsWith('Bot heartbeat.')
  );
}

function isError(level: string) {
  return level === 'ERROR' || level === 'CRITICAL';
}

const levelCounts = computed(() => {
  let warning = 0;
  let error = 0;
  for (const log of botStore.activeBot.lastLogs) {
    if (log[3] === 'WARNING') warning += 1;
    else if (isError(log[3])) error += 1;
  }
  return { warning, error };
});

const levelOptions = computed(() => [
  { value: 'all' as const, label: t('common.all') },
  { value: 'warning' as const, label: t('logs.warnings', { n: levelCounts.value.warning }) },
  { value: 'error' as const, label: t('logs.errors', { n: levelCounts.value.error }) },
]);

const filteredLogs = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return botStore.activeBot.lastLogs.filter((log) => {
    if (hideRoutine.value && isRoutine(log)) return false;
    if (levelFilter.value === 'error' && !isError(log[3])) return false;
    if (levelFilter.value === 'warning' && log[3] !== 'WARNING' && !isError(log[3])) return false;
    if (!term) return true;
    return log[4].toLowerCase().includes(term) || log[2].toLowerCase().includes(term);
  });
});

async function refreshLogs() {
  loading.value = true;
  try {
    await botStore.activeBot.getLogs();
  } finally {
    loading.value = false;
  }
  if (following.value) scrollToBottom();
}

const { pause, resume } = useIntervalFn(refreshLogs, AUTO_REFRESH_MS, { immediate: false });
watch(
  autoRefresh,
  (enabled) => {
    if (enabled) resume();
    else pause();
  },
  { immediate: true },
);

onMounted(() => {
  refreshLogs();
});

watch(filteredLogs, () => {
  if (following.value) scrollToBottom();
});

function onScroll() {
  const el = scrollContainer.value;
  if (!el) return;
  following.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
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
      following.value = true;
    }
  });
}
</script>

<template>
  <section
    class="panel relative flex h-full flex-col overflow-hidden text-start"
    :aria-label="$t('logs.label')"
  >
    <div class="flex flex-wrap items-center gap-2 border-b border-default px-3 py-2">
      <UInput
        v-model="search"
        type="search"
        icon="mdi:magnify"
        :placeholder="$t('logs.search')"
        :aria-label="$t('logs.searchLabel')"
        class="w-full sm:w-64"
      />
      <USegmentedControl
        v-model="levelFilter"
        :items="levelOptions"
        label-key="label"
        value-key="value"
        size="md"
        :aria-label="$t('logs.levelFilter')"
      />
      <div class="ms-auto flex flex-wrap items-center gap-3">
        <USwitch
          v-model="hideRoutine"
          :label="$t('logs.hideRoutine')"
          :title="$t('logs.hideRoutineHelp')"
        />
        <USwitch v-model="autoRefresh" :label="$t('logs.autoRefresh')" />
        <UButton
          id="refresh-logs"
          color="neutral"
          variant="outline"
          icon="mdi:refresh"
          :label="$t('common.refresh')"
          :loading="loading"
          @click="refreshLogs"
        />
      </div>
    </div>
    <p class="border-b border-default px-3 py-1.5 text-xs text-muted" aria-live="polite">
      <template v-if="filteredLogs.length === botStore.activeBot.lastLogs.length">
        {{ $t('logs.recent', { n: botStore.activeBot.lastLogs.length }) }}
      </template>
      <template v-else>
        {{
          $t('logs.showing', {
            shown: filteredLogs.length,
            total: botStore.activeBot.lastLogs.length,
          })
        }}
      </template>
    </p>
    <div
      ref="scrollContainer"
      class="h-full w-full overflow-auto bg-muted/40 py-2 font-mono text-[13px] leading-relaxed"
      tabindex="0"
      :aria-label="$t('logs.entries')"
      @scroll.passive="onScroll"
    >
      <EmptyState
        v-if="botStore.activeBot.lastLogs.length === 0 && !loading"
        :title="$t('logs.empty')"
        icon="mdi:text-box-outline"
      />
      <EmptyState
        v-else-if="filteredLogs.length === 0 && !loading"
        :title="$t('logs.noMatch')"
        :description="$t('logs.noMatchHelp')"
        icon="mdi:magnify-close"
      >
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :label="$t('logs.clearFilters')"
          @click="
            search = '';
            levelFilter = 'all';
            hideRoutine = false;
          "
        />
      </EmptyState>
      <div
        v-for="(log, index) in filteredLogs"
        :key="`${log[1]}-${index}`"
        class="flex flex-col gap-x-3 px-3 py-1 hover:bg-elevated/50 sm:flex-row sm:py-0.5"
      >
        <span class="flex shrink-0 items-center gap-3">
          <span class="whitespace-nowrap text-dimmed tabular-nums">{{ log[0] }}</span>
          <span
            class="h-fit w-16 shrink-0 rounded px-1.5 text-center text-[11px] font-semibold"
            :class="levelClass(log[3])"
            >{{ log[3] }}</span
          >
        </span>
        <span class="min-w-0 break-words whitespace-pre-wrap">
          <span class="me-2 text-muted" :title="log[2]">{{
            log[2].replace(/^freqtrade\./, '')
          }}</span>
          <span class="text-default">{{ log[4] }}</span>
        </span>
      </div>
    </div>
    <UButton
      v-if="!following && filteredLogs.length > 0"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg"
      color="primary"
      variant="solid"
      size="sm"
      icon="mdi:arrow-down"
      :label="$t('logs.jumpLatest')"
      @click="scrollToBottom"
    />
  </section>
</template>
