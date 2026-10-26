<script setup lang="ts">
import type { BotDescriptor } from '@/types';
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
      title: 'Remove bot?',
      message: `Log out of ${props.bot.botName || props.bot.botId} and remove it from this browser? The bot itself keeps running.`,
      confirmText: 'Remove',
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
        :aria-label="`Auto-refresh ${displayName}`"
        :title="`Auto refresh for ${displayName}`"
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
          {{ selectedBotStore.isBotOnline ? 'Online' : 'Offline' }}
        </span>
      </span>
      <span v-else class="flex items-center gap-1 text-xs font-medium text-error">
        <i-mdi-cancel aria-hidden="true" />
        <span :class="{ 'sr-only': noText }">Login expired</span>
      </span>

      <div class="flex items-center gap-0.5">
        <UButton
          v-if="!noButtons && selectedBotStore.isBotLoggedIn"
          color="neutral"
          variant="ghost"
          aria-label="Rename bot"
          title="Rename bot"
          icon="mdi:pencil-outline"
          @click.stop="$emit('edit', bot.botId)"
        />
        <UButton
          v-if="!noRefreshSwitch && !selectedBotStore.isBotLoggedIn"
          variant="soft"
          color="error"
          label="Log in again"
          icon="mdi:login"
          @click.stop="$emit('editLogin', bot.botId)"
        />
        <UButton
          v-if="!noButtons"
          variant="ghost"
          color="error"
          aria-label="Remove bot"
          title="Remove bot"
          icon="mdi:delete-outline"
          @click.stop="removeBotQuestion"
        />
      </div>
    </div>
  </div>
</template>
