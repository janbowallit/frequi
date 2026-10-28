<script setup lang="ts">
import type { BacktestPayload } from '@/types';

const botStore = useBotStore();
const btStore = useBtStore();

function clickBacktest() {
  const btPayload: BacktestPayload = {
    strategy: btStore.strategy,
    timerange: btStore.timerange,
    enable_protections: btStore.enableProtections,
  };
  if (btStore.maxOpenTrades) {
    btPayload.max_open_trades = btStore.maxOpenTrades;
  }
  if (btStore.stakeAmountUnlimited) {
    btPayload.stake_amount = 'unlimited';
  } else {
    const stakeAmountLoc = Number(btStore.stakeAmount);
    if (stakeAmountLoc) {
      btPayload.stake_amount = stakeAmountLoc.toString();
    }
  }

  const startingCapitalLoc = Number(btStore.startingCapital);
  if (startingCapitalLoc) {
    btPayload.dry_run_wallet = startingCapitalLoc;
  }

  if (btStore.selectedTimeframe) {
    btPayload.timeframe = btStore.selectedTimeframe;
  }
  if (btStore.selectedDetailTimeframe) {
    btPayload.timeframe_detail = btStore.selectedDetailTimeframe;
  }
  if (!btStore.allowCache) {
    btPayload.backtest_cache = 'none';
  }
  if (btStore.freqAI.enabled) {
    btPayload.freqaimodel = btStore.freqAI.model;
    if (btStore.freqAI.identifier !== '') {
      btPayload.freqai = { identifier: btStore.freqAI.identifier };
    }
  }

  botStore.activeBot.startBacktest(btPayload);
}
</script>

<template>
  <form class="flex flex-col gap-4 text-left" @submit.prevent="clickBacktest">
    <fieldset :disabled="botStore.activeBot.backtestRunning" class="flex flex-col gap-4">
      <UFormField label="Strategy" required>
        <StrategySelect v-model="btStore.strategy" />
      </UFormField>

      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Timeframe">
          <TimeframeSelect v-model="btStore.selectedTimeframe" />
        </UFormField>
        <UFormField label="Detail timeframe" help="Optional. Simulates moves inside each candle.">
          <TimeframeSelect
            v-model="btStore.selectedDetailTimeframe"
            :below-timeframe="btStore.selectedTimeframe"
          />
        </UFormField>
      </div>

      <TimeRangeSelect v-model="btStore.timerange" />

      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Starting capital">
          <UInputNumber
            v-model="btStore.startingCapital"
            placeholder="From config"
            :increment="false"
            :decrement="false"
            :step="10"
            :min="0"
            :step-snapping="false"
            :format-options="{ maximumFractionDigits: 5 }"
          />
        </UFormField>
        <UFormField label="Max open trades">
          <UInputNumber
            v-model="btStore.maxOpenTrades"
            placeholder="From strategy"
            :increment="false"
            :decrement="false"
          />
        </UFormField>
      </div>

      <UFormField label="Stake per trade">
        <div class="flex flex-col gap-2">
          <UInputNumber
            v-model="btStore.stakeAmount"
            placeholder="From strategy"
            :step="10"
            :step-snapping="false"
            :format-options="{ maximumFractionDigits: 5 }"
            :min="0"
            :increment="false"
            :decrement="false"
            :disabled="btStore.stakeAmountUnlimited"
          />
          <BaseCheckbox v-model="btStore.stakeAmountUnlimited">
            Unlimited (split the balance between trades)
          </BaseCheckbox>
        </div>
      </UFormField>

      <UCollapsible class="flex flex-col gap-3">
        <UButton
          color="neutral"
          variant="link"
          class="self-start px-0"
          label="More options"
          trailing-icon="mdi:chevron-down"
          :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform' }"
        />
        <template #content>
          <div class="flex flex-col gap-3 pt-1">
            <BaseCheckbox v-model="btStore.enableProtections">Use protections</BaseCheckbox>
            <BaseCheckbox
              v-if="botStore.activeBot.botFeatures.backtestFreqAI"
              v-model="btStore.allowCache"
            >
              Reuse cached results
            </BaseCheckbox>
            <template v-if="botStore.activeBot.botFeatures.backtestFreqAI">
              <BaseCheckbox v-model="btStore.freqAI.enabled">
                Use FreqAI
                <template #hint>
                  Needs a FreqAI configuration and a FreqAI strategy, otherwise the run fails.
                </template>
              </BaseCheckbox>
              <template v-if="btStore.freqAI.enabled">
                <UFormField label="FreqAI identifier">
                  <UInput v-model="btStore.freqAI.identifier" placeholder="From config" />
                </UFormField>
                <UFormField label="FreqAI model">
                  <FreqaiModelSelect v-model="btStore.freqAI.model" />
                </UFormField>
              </template>
            </template>
          </div>
        </template>
      </UCollapsible>
    </fieldset>

    <div class="flex flex-wrap items-center gap-2 border-t border-default pt-4">
      <UButton
        v-if="!botStore.activeBot.backtestRunning"
        type="submit"
        variant="solid"
        icon="mdi:play"
        label="Start backtest"
        :disabled="!btStore.canRunBacktest || !botStore.activeBot.canRunBacktest"
      />
      <UButton
        v-else
        color="error"
        variant="solid"
        icon="mdi:stop"
        label="Stop backtest"
        @click="botStore.activeBot.stopBacktest()"
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="mdi:refresh"
        label="Fetch last result"
        title="Load the result of the last backtest from the bot"
        :disabled="botStore.activeBot.backtestRunning || !botStore.activeBot.canRunBacktest"
        @click="botStore.activeBot.pollBacktest()"
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="mdi:delete-outline"
        label="Reset"
        title="Clear the backtest state on the bot"
        class="ms-auto"
        :disabled="botStore.activeBot.backtestRunning || !botStore.activeBot.canRunBacktest"
        @click="botStore.activeBot.removeBacktest()"
      />
    </div>
  </form>
</template>
