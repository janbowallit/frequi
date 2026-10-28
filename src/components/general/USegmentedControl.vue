<script
  setup
  lang="ts"
  generic="
    T extends string | number | boolean | object,
    VK extends GetItemKeys<T> | undefined = undefined
  "
>
import type { GetItemKeys, GetItemValue } from '@nuxt/ui';

/**
 * SegmentedControl — NuxtUI replacement for PrimeVue SelectButton.
 * A segmented track of UButtons.
 */
const props = withDefaults(
  defineProps<{
    items: T[];
    labelKey?: GetItemKeys<T>;
    valueKey?: VK;
    allowEmpty?: boolean;
    disabledKey?: GetItemKeys<T>;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  }>(),
  {
    allowEmpty: false,
    size: 'sm',
  },
);

const modelValue = defineModel<GetItemValue<T, VK>>();

function asRecord(item: T): Record<string, unknown> | null {
  if (typeof item === 'object' && item !== null) {
    return item as Record<string, unknown>;
  }

  return null;
}

function getRecordValue(record: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((value, segment) => {
    if (typeof value === 'object' && value !== null) {
      return (value as Record<string, unknown>)[segment];
    }

    return undefined;
  }, record);
}

function getLabel(item: T): string {
  const record = asRecord(item);

  if (record) {
    return String(
      (props.labelKey ? getRecordValue(record, props.labelKey) : undefined) ?? record.label ?? item,
    );
  }

  return String(item);
}

function getValue(item: T): GetItemValue<T, VK> {
  const record = asRecord(item);

  if (record && props.valueKey) {
    return getRecordValue(record, props.valueKey) as GetItemValue<T, VK>;
  }

  return item as GetItemValue<T, VK>;
}

function isSelected(item: T): boolean {
  return modelValue.value === getValue(item);
}

function isDisabled(item: T): boolean {
  const record = asRecord(item);

  if (record && props.disabledKey) {
    return !!getRecordValue(record, props.disabledKey);
  }

  return false;
}

function select(item: T) {
  const val = getValue(item);
  if (!props.allowEmpty && isSelected(item)) {
    return; // Do not allow deselect when allowEmpty is false
  }
  modelValue.value = isSelected(item) ? undefined : val;
}
</script>

<template>
  <!-- A track holding the options; the selected one is raised, like a native segmented control -->
  <div
    role="group"
    class="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-elevated p-0.5 ring ring-inset ring-default"
  >
    <UButton
      v-for="item in items"
      :key="String(getValue(item))"
      :size="size"
      variant="ghost"
      color="neutral"
      class="shrink-0 justify-center rounded-md transition-colors duration-150"
      :class="
        isSelected(item)
          ? 'bg-default font-semibold text-highlighted shadow-sm ring ring-default hover:bg-default'
          : 'text-muted hover:bg-accented/50 hover:text-highlighted'
      "
      :aria-pressed="isSelected(item)"
      :disabled="isDisabled(item)"
      @click="select(item)"
    >
      {{ getLabel(item) }}
    </UButton>
  </div>
</template>
