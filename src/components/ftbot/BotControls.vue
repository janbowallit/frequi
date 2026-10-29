<script setup lang="ts">
import type { ForceExitPayload } from '@/types';
import { BotStates } from '@/types';
import { t } from '@/i18n';

// In a narrow panel the icons push the labels into an ellipsis - drop the icons there instead.
const narrowButtonUi = { leadingIcon: 'hidden @[18rem]:inline-flex' };

const botStore = useBotStore();
const { confirm } = useConfirmBox();

const { forceEntryDialog } = useForceTrade();

const botState = computed(() => botStore.activeBot.botState?.state);
const isRunning = computed((): boolean => botState.value === BotStates.RUNNING);
const isPaused = computed((): boolean => botState.value === BotStates.PAUSED);
const canTrade = computed(() => botStore.activeBot.isTrading);

const stateInfo = computed<{ label: string; description: string; dot: string }>(() => {
  switch (botState.value) {
    case BotStates.RUNNING:
      return {
        label: t('controls.running'),
        description: t('controls.runningHelp'),
        dot: 'bg-success',
      };
    case BotStates.PAUSED:
      return {
        label: t('controls.paused'),
        description: t('controls.pausedHelp'),
        dot: 'bg-warning',
      };
    case BotStates.STOPPED:
      return {
        label: t('controls.stopped'),
        description: t('controls.stoppedHelp'),
        dot: 'bg-error',
      };
    case BotStates.RELOAD_CONFIG:
      return {
        label: t('controls.reloading'),
        description: t('controls.reloadingHelp'),
        dot: 'bg-info',
      };
    default:
      return {
        label: t('controls.unknown'),
        description: t('controls.unknownHelp'),
        dot: 'bg-neutral-400',
      };
  }
});

async function handleStopBot() {
  const result = await confirm({
    title: t('controls.stopTitle'),
    message: t('controls.stopMessage'),
    confirmText: t('controls.stopConfirm'),
    danger: true,
  });
  if (result) {
    botStore.activeBot.stopBot();
  }
}

async function handleStopBuy() {
  if (
    await confirm({
      title: t('controls.pauseTitle'),
      message: t('controls.pauseMessage'),
      confirmText: t('controls.pauseConfirm'),
    })
  ) {
    botStore.activeBot.stopBuy();
  }
}

async function handleReloadConfig() {
  if (
    await confirm({
      title: t('controls.reloadTitle'),
      message: t('controls.reloadMessage'),
      confirmText: t('common.reload'),
    })
  ) {
    botStore.activeBot.reloadConfig();
  }
}

async function handleForceExit() {
  const count = botStore.activeBot.openTradeCount;
  if (
    await confirm({
      title: t('controls.exitAllTitle'),
      message: t('controls.exitAllMessage', { n: count }, count),
      confirmText: t('controls.exitAllConfirm'),
      danger: true,
    })
  ) {
    const payload: ForceExitPayload = {
      tradeid: 'all',
      // TODO: support ordertype (?)
    };
    botStore.activeBot.forceexit(payload);
  }
}

async function handleForceEntry() {
  await forceEntryDialog({
    pair: botStore.activeBot.selectedPair,
  });
}
</script>

<template>
  <div
    role="toolbar"
    :aria-label="$t('controls.toolbar')"
    class="@container flex w-full flex-col gap-2"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 flex-wrap items-center gap-x-2" role="status">
        <span class="size-2.5 shrink-0 rounded-full" :class="stateInfo.dot" aria-hidden="true" />
        <span class="text-sm font-semibold text-highlighted">{{ stateInfo.label }}</span>
        <span class="text-sm text-muted">{{ stateInfo.description }}</span>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-1.5">
      <UButton
        :color="isRunning ? 'neutral' : 'success'"
        :variant="isRunning ? 'outline' : 'solid'"
        class="justify-center"
        :disabled="!canTrade || isRunning"
        :label="isPaused ? $t('controls.resume') : $t('common.start')"
        icon="lucide:play"
        :ui="narrowButtonUi"
        :title="$t('controls.startHelp')"
        @click="botStore.activeBot.startBot()"
      />
      <UButton
        color="neutral"
        variant="outline"
        class="justify-center"
        :disabled="!canTrade || !isRunning"
        :label="$t('controls.pause')"
        icon="lucide:pause"
        :ui="narrowButtonUi"
        :title="$t('controls.pauseHelp')"
        @click="handleStopBuy()"
      />
      <UButton
        color="neutral"
        variant="outline"
        class="justify-center"
        :disabled="!canTrade || !(isRunning || isPaused)"
        :label="$t('common.stop')"
        icon="lucide:square"
        :ui="narrowButtonUi"
        :title="$t('controls.stopHelp')"
        @click="handleStopBot()"
      />
    </div>
    <div class="flex flex-wrap items-center gap-1.5">
      <UButton
        v-if="botStore.activeBot.botState && botStore.activeBot.botState.force_entry_enable"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="!canTrade || !isRunning"
        :label="$t('controls.forceEntry')"
        icon="lucide:square-plus"
        :title="$t('controls.forceEntryHelp')"
        @click="handleForceEntry"
      />
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="!canTrade"
        :label="$t('controls.reloadConfig')"
        icon="lucide:rotate-cw"
        :title="$t('controls.reloadConfigHelp')"
        @click="handleReloadConfig()"
      />
      <UButton
        :color="botStore.activeBot.openTradeCount === 0 ? 'neutral' : 'error'"
        variant="ghost"
        size="sm"
        class="ms-auto"
        :disabled="!canTrade || botStore.activeBot.openTradeCount === 0"
        :label="$t('controls.exitAll')"
        icon="lucide:copy-x"
        :title="$t('controls.exitAllHelp')"
        @click="handleForceExit()"
      />
    </div>
  </div>
</template>
