<script setup lang="ts">
import type { AuthStorageWithBotId } from '@/types';

export interface LoginModalProps {
  loginInfo?: AuthStorageWithBotId;
}

defineProps<LoginModalProps>();
const emit = defineEmits<{
  close: [value: boolean];
}>();

function loginResult(result: boolean) {
  if (result) {
    // Only close if
    emit('close', result);
  }
}
</script>

<template>
  <UModal
    :title="loginInfo ? $t('loginForm.modalTitleEdit') : $t('loginForm.modalTitleNew')"
    :description="$t('loginForm.modalDescription')"
  >
    <template #body>
      <BotLogin in-modal :existing-auth="loginInfo" @login-result="loginResult" />
    </template>
  </UModal>
</template>
