<script setup lang="ts">
import { t } from '@/i18n';
import type { DownloadDataPayload, ExchangeSelection } from '@/types';
import { MarginMode, TradingMode } from '@/types';
import type { SelectMenuItem } from '@nuxt/ui';

const botStore = useBotStore();
const pairlistStore = usePairlistConfigStore();
const pairs = ref<string[]>(['BTC/USDT', 'ETH/USDT', '']);
const timeframes = ref<string[]>(['5m', '1h']);

const timeSelection = ref({
  useCustomTimerange: false,
  timerange: '',
  days: 30,
});

const { pairTemplates } = usePairTemplates();

const exchange = ref<{
  customExchange: boolean;
  selectedExchange: ExchangeSelection;
}>({
  customExchange: false,
  selectedExchange: {
    exchange: 'binance',
    trade_mode: {
      margin_mode: MarginMode.NONE,
      trading_mode: TradingMode.SPOT,
    },
  },
});

const advancedOptions = ref({
  erase: false,
  prepend_data: false,
  downloadTrades: false,
  candleTypes: [] as string[],
});

// State to track the collapse status
const isAdvancedOpen = ref(false);
const candleTypes = computed<SelectMenuItem[]>(() => [
  { label: t('download.spot'), value: 'spot' },
  { label: t('download.futures'), value: 'futures' },
  { label: t('download.fundingRate'), value: 'funding_rate' },
  { label: t('download.mark'), value: 'mark' },
  { label: t('download.index'), value: 'index' },
  { label: t('download.premiumIndex'), value: 'premiumIndex' },
]);

function addPairs(_pairs: string[]) {
  pairs.value.push(..._pairs);
}

function replacePairs(_pairs: string[]) {
  pairs.value = [..._pairs];
}

async function startDownload() {
  const payload: DownloadDataPayload = {
    pairs: pairs.value.filter((pair) => pair !== ''),
    timeframes: timeframes.value.filter((tf) => tf !== ''),
  };

  // Add either timerange or days to the payload
  if (timeSelection.value.useCustomTimerange && timeSelection.value.timerange) {
    payload.timerange = timeSelection.value.timerange;
  } else {
    payload.days = timeSelection.value.days;
  }

  // Include advanced options only if the section is open
  if (isAdvancedOpen.value) {
    payload.erase = advancedOptions.value.erase;
    payload.download_trades = advancedOptions.value.downloadTrades;

    if (exchange.value.customExchange) {
      payload.exchange = exchange.value.selectedExchange.exchange;
      payload.trading_mode = exchange.value.selectedExchange.trade_mode.trading_mode;
      payload.margin_mode = exchange.value.selectedExchange.trade_mode.margin_mode;
    }
    if (
      botStore.activeBot.botFeatures.downloadDataCandleTypes &&
      advancedOptions.value.candleTypes.length > 0
    ) {
      payload.candle_types = advancedOptions.value.candleTypes;
    }
    if (botStore.activeBot.botFeatures.downloadDataPrepend && advancedOptions.value.prepend_data) {
      payload.prepend_data = true;
    }
  }

  await botStore.activeBot.startDataDownload(payload);
}
</script>

<template>
  <div class="flex w-full flex-col gap-4 text-start">
    <BackgroundJobTracking />

    <form class="panel flex flex-col divide-y divide-default" @submit.prevent="startDownload">
      <!-- Pairs -->
      <section class="flex flex-col gap-3 p-5" aria-labelledby="dl-pairs">
        <div>
          <h2 id="dl-pairs" class="text-base font-semibold text-highlighted">
            {{ $t('download.pairs') }}
          </h2>
          <p class="text-sm text-muted">{{ $t('download.pairsHelp') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="pt in pairTemplates"
            :key="pt.idx"
            color="neutral"
            variant="outline"
            size="sm"
            icon="mdi:plus"
            :title="pt.pairs.join('\n')"
            :label="pt.description"
            @click="addPairs(pt.pairs)"
          />
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="mdi:format-list-numbered"
            :label="$t('download.fromBuilder')"
            :disabled="pairlistStore.whitelist.length === 0"
            :title="$t('download.fromBuilderHelp')"
            @click="replacePairs(pairlistStore.whitelist)"
          />
        </div>
        <BaseStringList v-model="pairs" :placeholder="$t('download.pairPlaceholder')" />
      </section>

      <!-- Timeframes -->
      <section class="flex flex-col gap-3 p-5" aria-labelledby="dl-timeframes">
        <h2 id="dl-timeframes" class="text-base font-semibold text-highlighted">
          {{ $t('download.timeframes') }}
        </h2>
        <BaseStringList v-model="timeframes" :placeholder="$t('download.timeframePlaceholder')" />
      </section>

      <!-- Time range -->
      <section class="flex flex-col gap-3 p-5" aria-labelledby="dl-range">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="dl-range" class="text-base font-semibold text-highlighted">
            {{ $t('download.timeRange') }}
          </h2>
          <BaseCheckbox v-model="timeSelection.useCustomTimerange">{{
            $t('download.exactDates')
          }}</BaseCheckbox>
        </div>
        <TimeRangeSelect
          v-if="timeSelection.useCustomTimerange"
          v-model="timeSelection.timerange"
        />
        <UFormField v-else :label="$t('download.daysBack')">
          <UInputNumber
            v-model="timeSelection.days"
            :aria-label="$t('download.daysLabel')"
            :min="1"
            :step="1"
            class="w-40"
          />
        </UFormField>
      </section>

      <!-- Advanced -->
      <section class="p-5">
        <BaseCollapsible v-model:open="isAdvancedOpen" :title="$t('download.advanced')">
          <div class="flex flex-col gap-3 pt-3">
            <p class="text-sm text-muted">{{ $t('download.advancedHelp') }}</p>
            <BaseCheckbox v-model="advancedOptions.erase">{{ $t('download.erase') }}</BaseCheckbox>
            <BaseCheckbox
              v-if="botStore.activeBot.botFeatures.downloadDataPrepend"
              v-model="advancedOptions.prepend_data"
            >
              {{ $t('download.prepend') }}
            </BaseCheckbox>
            <BaseCheckbox v-model="advancedOptions.downloadTrades">
              {{ $t('download.trades') }}
            </BaseCheckbox>
            <UFormField
              v-if="botStore.activeBot.botFeatures.downloadDataCandleTypes"
              :label="$t('download.candleTypes')"
              :help="$t('download.candleTypesHelp')"
            >
              <USelectMenu
                v-model="advancedOptions.candleTypes"
                multiple
                :items="candleTypes"
                :placeholder="$t('download.automatic')"
                value-key="value"
                class="w-full sm:w-80"
              />
            </UFormField>
            <UCollapsible v-model:open="exchange.customExchange" class="flex flex-col gap-2">
              <BaseCheckbox v-model="exchange.customExchange">{{
                $t('download.otherExchange')
              }}</BaseCheckbox>
              <template #content>
                <ExchangeSelect v-model="exchange.selectedExchange" />
              </template>
            </UCollapsible>
          </div>
        </BaseCollapsible>
      </section>

      <div class="flex items-center justify-end gap-3 p-4">
        <span class="text-sm text-muted tabular-nums">
          {{
            $t('download.summary', {
              pairs: pairs.filter(Boolean).length,
              timeframes: timeframes.filter(Boolean).length,
            })
          }}
        </span>
        <UButton type="submit" variant="solid" icon="mdi:download" :label="$t('download.title')" />
      </div>
    </form>
  </div>
</template>
