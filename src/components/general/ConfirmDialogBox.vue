<script setup lang="ts">
export interface ConfirmDialogBoxProps {
  title: string;
  description?: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  /** Destructive action - red confirm button, and focus starts on Cancel */
  danger?: boolean;
}
withDefaults(defineProps<ConfirmDialogBoxProps>(), {
  description: 'Confirmation',
  cancelText: 'Cancel',
  confirmText: 'Ok',
  danger: false,
});
defineEmits<{
  close: [value: boolean];
}>();
</script>

<template>
  <UModal
    :title="title"
    :description="description"
    :ui="{ description: 'sr-only', footer: 'justify-end gap-2' }"
  >
    <template #body>
      <p class="whitespace-pre-wrap text-default">
        {{ message }}
      </p>
    </template>
    <template #footer>
      <UButton
        class="min-w-24 justify-center"
        :label="cancelText"
        variant="outline"
        color="neutral"
        :autofocus="danger"
        @click="$emit('close', false)"
      />
      <UButton
        class="min-w-24 justify-center"
        :label="confirmText"
        :color="danger ? 'error' : 'primary'"
        variant="solid"
        :autofocus="!danger"
        @click="$emit('close', true)"
      />
    </template>
  </UModal>
</template>
