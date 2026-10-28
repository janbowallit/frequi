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
  <ul class="flex flex-col gap-1 text-left" aria-label="Backtest results">
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
            title="Edit notes"
            aria-label="Edit notes"
            icon="mdi:pencil-outline"
            @click.stop="result.metadata.editing = !result.metadata.editing"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            title="Remove from this list"
            aria-label="Remove from this list"
            icon="mdi:close"
            @click.stop="$emit('removeResult', key)"
          />
        </div>
      </template>
      <template v-else>
        <UTextarea
          v-model="result.metadata.notes"
          placeholder="Notes"
          size="sm"
          class="flex-1"
          @click.stop
        />
        <UButton
          size="sm"
          title="Save notes"
          aria-label="Save notes"
          variant="solid"
          icon="mdi:check"
          @click.stop="confirmInput(key, result)"
        />
      </template>
    </li>
  </ul>
</template>
