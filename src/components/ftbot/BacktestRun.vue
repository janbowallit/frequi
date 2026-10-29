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
  <form class="flex flex-col gap-4 text-start" @submit.prevent="clickBacktest">
    <fieldset :disabled="botStore.activeBot.backtestRunning" class="flex flex-col gap-4">
      <UFormField :label="$t('backtest.strategy')" required>
        <StrategySelect v-model="btStore.strategy" />
      </UFormField>

      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="$t('backtest.timeframe')">
          <TimeframeSelect v-model="btStore.selectedTimeframe" />
        </UFormField>
        <UFormField
          :label="$t('backtest.detailTimeframe')"
          :help="$t('backtest.detailTimeframeHelp')"
        >
          <TimeframeSelect
            v-model="btStore.selectedDetailTimeframe"
            :below-timeframe="btStore.selectedTimeframe"
          />
        </UFormField>
      </div>

      <TimeRangeSelect v-model="btStore.timerange" />

      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="$t('backtest.startingCapital')">
          <UInputNumber
            v-model="btStore.startingCapital"
            :placeholder="$t('backtest.fromConfig')"
            :increment="false"
            :decrement="false"
            :step="10"
            :min="0"
            :step-snapping="false"
            :format-options="{ maximumFractionDigits: 5 }"
          />
        </UFormField>
        <UFormField :label="$t('backtest.maxOpenTrades')">
          <UInputNumber
            v-model="btStore.maxOpenTrades"
            :placeholder="$t('backtest.fromStrategy')"
            :increment="false"
            :decrement="false"
          />
        </UFormField>
      </div>

      <UFormField :label="$t('backtest.stakePerTrade')">
        <div class="flex flex-col gap-2">
          <UInputNumber
            v-model="btStore.stakeAmount"
            :placeholder="$t('backtest.fromStrategy')"
            :step="10"
            :step-snapping="false"
            :format-options="{ maximumFractionDigits: 5 }"
            :min="0"
            :increment="false"
            :decrement="false"
            :disabled="btStore.stakeAmountUnlimited"
          />
          <BaseCheckbox v-model="btStore.stakeAmountUnlimited">
            {{ $t('backtest.unlimited') }}
          </BaseCheckbox>
        </div>
      </UFormField>

      <UCollapsible class="flex flex-col gap-3">
        <UButton
          color="neutral"
          variant="link"
          class="self-start px-0"
          :label="$t('backtest.moreOptions')"
          trailing-icon="mdi:chevron-down"
          :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform' }"
        />
        <template #content>
          <div class="flex flex-col gap-3 pt-1">
            <BaseCheckbox v-model="btStore.enableProtections">{{
              $t('backtest.protections')
            }}</BaseCheckbox>
            <BaseCheckbox
              v-if="botStore.activeBot.botFeatures.backtestFreqAI"
              v-model="btStore.allowCache"
            >
              {{ $t('backtest.cache') }}
            </BaseCheckbox>
            <template v-if="botStore.activeBot.botFeatures.backtestFreqAI">
              <BaseCheckbox v-model="btStore.freqAI.enabled">
                {{ $t('backtest.freqai') }}
                <template #hint>
                  {{ $t('backtest.freqaiHint') }}
                </template>
              </BaseCheckbox>
              <template v-if="btStore.freqAI.enabled">
                <UFormField :label="$t('backtest.freqaiIdentifier')">
                  <UInput
                    v-model="btStore.freqAI.identifier"
                    :placeholder="$t('backtest.fromConfig')"
                  />
                </UFormField>
                <UFormField :label="$t('backtest.freqaiModel')">
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
        :label="$t('backtest.start')"
        :disabled="!btStore.canRunBacktest || !botStore.activeBot.canRunBacktest"
      />
      <UButton
        v-else
        color="error"
        variant="solid"
        icon="mdi:stop"
        :label="$t('backtest.stop')"
        @click="botStore.activeBot.stopBacktest()"
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="mdi:refresh"
        :label="$t('backtest.fetchLast')"
        :title="$t('backtest.fetchLastHelp')"
        :disabled="botStore.activeBot.backtestRunning || !botStore.activeBot.canRunBacktest"
        @click="botStore.activeBot.pollBacktest()"
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="mdi:delete-outline"
        :label="$t('common.reset')"
        :title="$t('backtest.resetHelp')"
        class="ms-auto"
        :disabled="botStore.activeBot.backtestRunning || !botStore.activeBot.canRunBacktest"
        @click="botStore.activeBot.removeBacktest()"
      />
    </div>
  </form>
</template>
