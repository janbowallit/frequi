<script setup lang="ts">
import type { AuthStorageWithBotId, BotDescriptor } from '@/types';
import { useSortable } from '@vueuse/integrations/useSortable';

defineProps<{
  small?: boolean;
  /** Rendered inside a page section that has its own heading and "add" action */
  embedded?: boolean;
}>();

const botStore = useBotStore();

const editingBots = ref<string[]>([]);
const loginDialog = useLoginDialog();
const sortContainer = ref<HTMLElement | null>(null);
const botListComp = computed<BotDescriptor[]>(() => {
  //Convert to array
  return botStore.availableBotsSorted;
});

useSortable(sortContainer, botListComp, {
  handle: '.handle',
  onUpdate: (e) => {
    if (e.oldIndex === undefined || e.newIndex === undefined) {
      return;
    }
    const oldBotId = botListComp.value[e.oldIndex]?.botId;
    const newBotId = botListComp.value[e.newIndex]?.botId;
    if (oldBotId && newBotId) {
      botStore.updateBot(oldBotId, { sortId: e.newIndex });
      botStore.updateBot(newBotId, { sortId: e.oldIndex });
    }
  },
});

function editBot(botId: string) {
  if (!editingBots.value.includes(botId)) {
    editingBots.value.push(botId);
  }
}

function editBotLogin(botId: string) {
  const bot = botStore.botStores[botId];
  if (!bot) {
    console.error('Bot not found');
    return;
  }
  const loginInfo: AuthStorageWithBotId = {
    ...bot.getLoginInfo(),
    botId,
  };

  loginDialog({ loginInfo: loginInfo });
}

function stopEditBot(botId: string) {
  if (!editingBots.value.includes(botId)) {
    return;
  }

  editingBots.value.splice(editingBots.value.indexOf(botId), 1);
}
</script>

<template>
  <div v-if="botStore.botCount > 0" class="w-full">
    <h3 v-if="!small && !embedded" class="mb-2 text-lg font-semibold">Available bots</h3>
    <ul
      ref="sortContainer"
      class="flex flex-col divide-y divide-default overflow-hidden rounded-xl border border-default bg-default"
    >
      <li
        v-for="bot in botListComp"
        :key="bot.botId"
        :title="`${bot.botId} - ${bot.botName} - ${bot.botUrl} - ${
          botStore.botStores[bot.botId]?.isBotLoggedIn ? '' : 'Login info expired!'
        }`"
        tabindex="0"
        :aria-current="bot.botId === botStore.selectedBot ? 'true' : undefined"
        class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-elevated/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        :class="{
          'bg-primary/10 font-semibold shadow-[inset_3px_0_0_var(--ui-primary)]':
            bot.botId === botStore.selectedBot,
        }"
        @click="botStore.selectBot(bot.botId)"
        @keydown.enter="botStore.selectBot(bot.botId)"
      >
        <i-mdi-drag-vertical
          v-if="!small"
          class="handle size-5 shrink-0 cursor-grab text-dimmed"
          aria-hidden="true"
          title="Drag to reorder"
        />
        <BotRename
          v-if="editingBots.includes(bot.botId)"
          :bot="bot"
          @saved="stopEditBot(bot.botId)"
          @cancelled="stopEditBot(bot.botId)"
        />

        <BotEntry
          v-else
          :bot="bot"
          :no-buttons="small"
          @edit="editBot"
          @edit-login="editBotLogin"
        />
      </li>
    </ul>
    <UButton
      v-if="!small && !embedded"
      color="neutral"
      variant="outline"
      class="mt-3"
      @click="loginDialog({})"
      icon="mdi:plus"
      label="Add new Bot"
    />
  </div>
</template>
