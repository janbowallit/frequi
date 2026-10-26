<script setup lang="ts">
import type { ForceExitPayload } from '@/types';
import { BotStates } from '@/types';

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
        label: 'Running',
        description: 'Entering and exiting trades',
        dot: 'bg-success',
      };
    case BotStates.PAUSED:
      return {
        label: 'Paused',
        description: 'Managing open trades, no new entries',
        dot: 'bg-warning',
      };
    case BotStates.STOPPED:
      return { label: 'Stopped', description: 'Not trading', dot: 'bg-error' };
    case BotStates.RELOAD_CONFIG:
      return { label: 'Reloading', description: 'Reloading configuration', dot: 'bg-info' };
    default:
      return { label: 'Unknown', description: 'Waiting for the bot', dot: 'bg-neutral-400' };
  }
});

async function handleStopBot() {
  const result = await confirm({
    title: 'Stop trading?',
    message:
      'The bot stops completely - it will no longer enter new trades or manage open ones (no exits, no stoploss updates).',
    confirmText: 'Stop trading',
    danger: true,
  });
  if (result) {
    botStore.activeBot.stopBot();
  }
}

async function handleStopBuy() {
  if (
    await confirm({
      title: 'Pause new entries?',
      message:
        'The bot keeps managing open trades, but will not enter new trades or increase position sizes. Press Resume to continue.',
      confirmText: 'Pause entries',
    })
  ) {
    botStore.activeBot.stopBuy();
  }
}

async function handleReloadConfig() {
  if (
    await confirm({
      title: 'Reload configuration?',
      message: 'Reloads the configuration file and the strategy. Open trades are kept.',
      confirmText: 'Reload',
    })
  ) {
    botStore.activeBot.reloadConfig();
  }
}

async function handleForceExit() {
  const count = botStore.activeBot.openTradeCount;
  if (
    await confirm({
      title: 'Exit all open trades?',
      message: `This sells ${count === 1 ? 'the 1 open trade' : `all ${count} open trades`} at market right now. This cannot be undone.`,
      confirmText: 'Exit all trades',
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
  <div role="toolbar" aria-label="Bot controls" class="flex w-full flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2" role="status">
        <span class="size-2.5 shrink-0 rounded-full" :class="stateInfo.dot" aria-hidden="true" />
        <span class="text-sm font-semibold text-highlighted">{{ stateInfo.label }}</span>
        <span class="truncate text-sm text-muted">{{ stateInfo.description }}</span>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-1.5">
      <UButton
        color="success"
        :variant="isRunning ? 'soft' : 'solid'"
        class="justify-center"
        :disabled="!canTrade || isRunning"
        :label="isPaused ? 'Resume' : 'Start'"
        icon="mdi:play"
        title="Start trading"
        @click="botStore.activeBot.startBot()"
      />
      <UButton
        color="neutral"
        variant="outline"
        class="justify-center"
        :disabled="!canTrade || !isRunning"
        label="Pause"
        icon="mdi:pause"
        title="Keep managing open trades, but don't enter new ones"
        @click="handleStopBuy()"
      />
      <UButton
        color="neutral"
        variant="outline"
        class="justify-center"
        :disabled="!canTrade || !(isRunning || isPaused)"
        label="Stop"
        icon="mdi:stop"
        title="Stop trading - also stops handling open trades"
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
        label="Force entry"
        icon="mdi:plus-box-outline"
        title="Open a trade now; exits follow the strategy"
        @click="handleForceEntry"
      />
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="!canTrade"
        label="Reload config"
        icon="mdi:reload"
        title="Reload configuration and strategy"
        @click="handleReloadConfig()"
      />
      <UButton
        color="error"
        variant="ghost"
        size="sm"
        class="ms-auto"
        :disabled="!canTrade || botStore.activeBot.openTradeCount === 0"
        label="Exit all"
        icon="mdi:close-box-multiple-outline"
        title="Force exit all open trades at market"
        @click="handleForceExit()"
      />
    </div>
  </div>
</template>
