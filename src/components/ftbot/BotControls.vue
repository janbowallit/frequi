<script setup lang="ts">
import type { ForceExitPayload } from '@/types';

const botStore = useBotStore();
const { confirm } = useConfirmBox();

const { forceEntryDialog } = useForceTrade();

const isRunning = computed((): boolean => {
  return botStore.activeBot.botState?.state === 'running';
});

async function handleStopBot() {
  const result = await confirm({
    title: 'Stop Bot',
    message: 'Stop the bot loop from running?',
  });
  if (result) {
    botStore.activeBot.stopBot();
  }
}

async function handleStopBuy() {
  if (
    await confirm({
      title: 'Pause - Stop Entering',
      message:
        'Freqtrade will continue to handle open trades, but will not enter new trades or increase position sizes. \nReally stop entering?',
    })
  ) {
    botStore.activeBot.stopBuy();
  }
}

async function handleReloadConfig() {
  if (
    await confirm({
      title: 'Reload Config',
      message: 'Reload configuration (including strategy)?',
    })
  ) {
    botStore.activeBot.reloadConfig();
  }
}

async function handleForceExit() {
  if (
    await confirm({
      title: 'ForceExit all',
      message: 'Really forceexit ALL trades?',
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
  <div role="toolbar" aria-label="Bot controls" class="flex flex-wrap items-center gap-1">
    <div class="flex items-center gap-1 rounded-lg border border-default p-1">
      <UTooltip text="Start trading">
        <UButton
          color="success"
          variant="ghost"
          class="size-[40px] justify-center"
          :disabled="!botStore.activeBot.isTrading || isRunning"
          aria-label="Start trading"
          icon="mdi:play"
          @click="botStore.activeBot.startBot()"
        />
      </UTooltip>
      <UTooltip text="Pause - keep managing open trades, but don't enter new ones">
        <UButton
          color="neutral"
          variant="ghost"
          class="size-[40px] justify-center"
          :disabled="!botStore.activeBot.isTrading || !isRunning"
          aria-label="Pause new entries"
          icon="mdi:pause"
          @click="handleStopBuy()"
        />
      </UTooltip>
      <UTooltip text="Stop trading - also stops handling open trades">
        <UButton
          color="neutral"
          variant="ghost"
          class="size-[40px] justify-center"
          :disabled="!botStore.activeBot.isTrading || !isRunning"
          aria-label="Stop trading"
          icon="mdi:stop"
          @click="handleStopBot()"
        />
      </UTooltip>
    </div>
    <div class="flex items-center gap-1 rounded-lg border border-default p-1">
      <UTooltip text="Reload configuration and strategy">
        <UButton
          color="neutral"
          variant="ghost"
          class="size-[40px] justify-center"
          :disabled="!botStore.activeBot.isTrading"
          aria-label="Reload configuration"
          icon="mdi:reload"
          @click="handleReloadConfig()"
        />
      </UTooltip>
      <UTooltip
        v-if="botStore.activeBot.botState && botStore.activeBot.botState.force_entry_enable"
        text="Force entry - open a trade now; exits follow the strategy"
      >
        <UButton
          color="neutral"
          variant="ghost"
          class="size-[40px] justify-center"
          :disabled="!botStore.activeBot.isTrading || !isRunning"
          aria-label="Force entry"
          icon="mdi:plus-box-multiple-outline"
          @click="handleForceEntry"
        />
      </UTooltip>
      <UTooltip text="Force exit all open trades">
        <UButton
          color="error"
          variant="ghost"
          class="size-[40px] justify-center"
          :disabled="!botStore.activeBot.isTrading"
          aria-label="Force exit all trades"
          icon="mdi:close-box-multiple"
          @click="handleForceExit()"
        />
      </UTooltip>
    </div>
  </div>
</template>
