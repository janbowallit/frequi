<script setup lang="ts">
import type { BacktestResultInMemory, BacktestResultUpdate } from '@/types';

withDefaults(
  defineProps<{
    backtestHistory: Record<string, BacktestResultInMemory>;
    selectedBacktestResultKey?: string;
    canUseModify?: boolean;
  }>(),
  {
    selectedBacktestResultKey: '',
    canUseModify: false,
  },
);

const emit = defineEmits<{
  selectionChange: [value: string];
  removeResult: [value: string];
  updateResult: [value: BacktestResultUpdate];
}>();

const setBacktestResult = (key: string) => {
  emit('selectionChange', key);
};

function confirmInput(run_id: string, result: BacktestResultInMemory) {
  result.metadata.editing = !result.metadata.editing;
  if (result.metadata.filename) {
    emit('updateResult', {
      run_id: run_id,
      notes: result.metadata.notes ?? '',
      filename: result.metadata.filename,
      strategy: result.metadata.strategyName,
    });
  }
}
</script>

<template>
  <ul class="flex flex-col gap-1 text-start" :aria-label="$t('backtest.resultsList')">
    <li
      v-for="[key, result] in Object.entries(backtestHistory)"
      :key="key"
      class="flex items-start gap-2 rounded-md border-s-2 px-2.5 py-2 text-sm"
      :class="
        key === selectedBacktestResultKey
          ? 'border-primary bg-primary/10'
          : 'cursor-pointer border-transparent hover:bg-elevated'
      "
      :aria-current="key === selectedBacktestResultKey ? 'true' : undefined"
      @click="setBacktestResult(key)"
    >
      <template v-if="!result.metadata.editing">
        <BacktestResultSelectEntry
          class="min-w-0 flex-1"
          :backtest-result="result"
          :can-use-modify="canUseModify"
        />
        <div class="flex shrink-0">
          <UButton
            v-if="canUseModify"
            size="xs"
            color="neutral"
            variant="ghost"
            :title="$t('backtest.editNotes')"
            :aria-label="$t('backtest.editNotes')"
            icon="lucide:pencil"
            @click.stop="result.metadata.editing = !result.metadata.editing"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :title="$t('backtest.removeFromList')"
            :aria-label="$t('backtest.removeFromList')"
            icon="lucide:x"
            @click.stop="$emit('removeResult', key)"
          />
        </div>
      </template>
      <template v-else>
        <UTextarea
          v-model="result.metadata.notes"
          :placeholder="$t('backtest.notes')"
          size="sm"
          class="flex-1"
          @click.stop
        />
        <UButton
          size="sm"
          :title="$t('backtest.saveNotes')"
          :aria-label="$t('backtest.saveNotes')"
          variant="solid"
          icon="lucide:check"
          @click.stop="confirmInput(key, result)"
        />
      </template>
    </li>
  </ul>
</template>
