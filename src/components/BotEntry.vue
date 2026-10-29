<script setup lang="ts">
import type { BotDescriptor } from '@/types';
import { t } from '@/i18n';

const { confirm } = useConfirmBox();

const props = defineProps<{
  bot: BotDescriptor;
  noButtons?: boolean;
  noRefreshSwitch?: boolean;
  noText?: boolean;
}>();

defineEmits<{ edit: [botId: string]; editLogin: [botId: string] }>();

const botStore = useBotStore();

function confirmRemoveBot() {
  botStore.removeBot(props.bot.botId);
}

async function removeBotQuestion() {
  if (
    await confirm({
      title: t('bots.removeTitle'),
      message: t('bots.removeMessage', { bot: props.bot.botName || props.bot.botId }),
      confirmText: t('common.remove'),
      danger: true,
    })
  ) {
    confirmRemoveBot();
  }
}

const selectedBotStore = computed<BotSubStore>(() => {
  return botStore.botStores[props.bot.botId]!;
});

// Bots added without a display name fall back to the name from the bot's config
const displayName = computed(
  () => props.bot.botName || selectedBotStore.value?.uiBotName || props.bot.botId,
);

const autoRefreshLoc = computed({
  get() {
    return selectedBotStore.value.autoRefresh;
  },
  set(newValue) {
    selectedBotStore.value.setAutoRefresh(newValue);
  },
});
</script>

<template>
  <div v-if="bot" class="flex w-full items-center justify-between gap-2">
    <span v-if="!noText" class="min-w-0 truncate">{{ displayName }}</span>

    <div class="flex items-center gap-2">
      <USwitch
        v-if="!noRefreshSwitch"
        v-model="autoRefreshLoc"
        size="sm"
        :aria-label="$t('bots.autoRefresh', { bot: displayName })"
        :title="$t('bots.autoRefresh', { bot: displayName })"
        @click.stop
      />
      <span
        v-if="selectedBotStore.isBotLoggedIn"
        class="flex items-center gap-1.5 text-xs font-medium"
        :class="selectedBotStore.isBotOnline ? 'text-success' : 'text-error'"
      >
        <span
          class="size-2 rounded-full"
          :class="selectedBotStore.isBotOnline ? 'bg-success' : 'bg-error'"
          aria-hidden="true"
        />
        <span :class="{ 'sr-only': noText }">
          {{ selectedBotStore.isBotOnline ? $t('common.online') : $t('common.offline') }}
        </span>
      </span>
      <span v-else class="flex items-center gap-1 text-xs font-medium text-error">
        <ILucideBan aria-hidden="true" />
        <span :class="{ 'sr-only': noText }">{{ $t('nav.loginExpired') }}</span>
      </span>

      <div class="flex items-center gap-1">
        <UButton
          v-if="!noButtons && selectedBotStore.isBotLoggedIn"
          color="neutral"
          variant="ghost"
          :aria-label="$t('bots.rename')"
          :title="$t('bots.rename')"
          icon="lucide:pencil"
          @click.stop="$emit('edit', bot.botId)"
        />
        <UButton
          v-if="!noRefreshSwitch && !selectedBotStore.isBotLoggedIn"
          variant="soft"
          color="error"
          :label="$t('bots.logInAgain')"
          icon="lucide:log-in"
          @click.stop="$emit('editLogin', bot.botId)"
        />
        <UButton
          v-if="!noButtons"
          variant="ghost"
          color="error"
          :aria-label="$t('bots.remove')"
          :title="$t('bots.remove')"
          icon="lucide:trash-2"
          @click.stop="removeBotQuestion"
        />
      </div>
    </div>
  </div>
</template>
