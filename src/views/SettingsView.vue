<script setup lang="ts">
import { FtWsMessageTypes } from '@/types/wsMessageTypes';

const settingsStore = useSettingsStore();
const colorStore = useColorStore();

const sections = [
  { id: 'settings-ui-section', label: 'Interface' },
  { id: 'settings-chart-section', label: 'Charts' },
  { id: 'settings-notifications-section', label: 'Notifications' },
  { id: 'settings-backtest-section', label: 'Backtesting' },
];

const timezoneOptions = ['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone];
const openTradesOptions = [
  { value: OpenTradeVizOptions.showPill, text: 'Count on the tab icon' },
  { value: OpenTradeVizOptions.asTitle, text: 'Count in the tab title' },
  { value: OpenTradeVizOptions.noOpenTrades, text: "Don't show" },
];
const colorPreferenceOptions = [
  { value: ColorPreferences.GREEN_UP, text: 'Green up, red down' },
  { value: ColorPreferences.RED_UP, text: 'Red up, green down' },
];
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-3 text-left md:p-6">
    <PageHeader title="Settings" description="Preferences for this browser only.">
      <template #actions>
        <span class="text-sm text-muted tabular-nums">UI {{ settingsStore.uiVersion }}</span>
      </template>
    </PageHeader>

    <div class="grid items-start gap-6 md:grid-cols-[11rem_minmax(0,1fr)]">
      <nav aria-label="Settings sections" class="sticky top-0 hidden flex-col gap-0.5 md:flex">
        <a
          v-for="section in sections"
          :key="section.id"
          :href="`#${section.id}`"
          class="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-elevated hover:text-highlighted"
          >{{ section.label }}</a
        >
      </nav>
      <div class="flex min-w-0 flex-col gap-4">
        <section
          class="panel flex scroll-mt-4 flex-col gap-5 p-5"
          id="settings-ui-section"
          aria-labelledby="settings-ui"
        >
          <h2 id="settings-ui" class="text-base font-semibold text-highlighted">Interface</h2>

          <UFormField label="Open trades in the browser tab">
            <USelect
              v-model="settingsStore.openTradesInTitle"
              :items="openTradesOptions"
              label-key="text"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Timezone" help="UTC is recommended: exchanges usually work in UTC.">
            <USelect v-model="settingsStore.timezone" :items="timezoneOptions" class="w-full" />
          </UFormField>

          <BaseCheckbox v-model="settingsStore.backgroundSync">
            Background sync
            <template #hint>Keep syncing other bots while a different bot is selected.</template>
          </BaseCheckbox>

          <BaseCheckbox v-model="settingsStore.confirmDialog">
            Confirm before force-exiting trades
            <template #hint
              >When off, force exits run immediately and a "No confirmations" warning shows in the
              header.</template
            >
          </BaseCheckbox>
        </section>

        <section
          class="panel flex scroll-mt-4 flex-col gap-5 p-5"
          id="settings-chart-section"
          aria-labelledby="settings-chart"
        >
          <h2 id="settings-chart" class="text-base font-semibold text-highlighted">Charts</h2>

          <UFormField label="Price scale side">
            <URadioGroup
              v-model="settingsStore.chartLabelSide"
              :items="[
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' },
              ]"
              orientation="horizontal"
            />
          </UFormField>

          <BaseCheckbox v-model="settingsStore.useHeikinAshiCandles">
            Heikin Ashi candles
            <template #hint>Smoothed candles that make trends easier to see.</template>
          </BaseCheckbox>

          <BaseCheckbox v-model="settingsStore.useReducedPairCalls">
            Only request needed columns
            <template #hint
              >Smaller downloads for large dataframes. May need extra requests when the plot
              configuration changes.</template
            >
          </BaseCheckbox>

          <UFormField
            label="Candles to show"
            help="Default number of candles in charts (100-2000)."
          >
            <div class="flex w-full items-center gap-4">
              <USlider
                v-model="settingsStore.chartDefaultCandleCount"
                class="flex-1"
                :step="50"
                :min="100"
                :max="2000"
                aria-label="Candles to show"
              />
              <UInputNumber
                v-model="settingsStore.chartDefaultCandleCount"
                :step="50"
                :min="100"
                :max="2000"
                size="sm"
                aria-label="Candles to show"
              />
            </div>
          </UFormField>

          <UFormField label="Candle colors">
            <URadioGroup
              v-model="colorStore.colorPreference"
              :items="colorPreferenceOptions"
              label-key="text"
              value-key="value"
              orientation="horizontal"
            >
              <template #label="{ item }">
                <div class="flex items-center">
                  <span class="mr-2">{{ item.text }}</span>
                  <UIcon
                    :name="
                      item.value === ColorPreferences.GREEN_UP
                        ? 'mdi:arrow-up-thin'
                        : 'mdi:arrow-down-thin'
                    "
                    :color="
                      item.value === ColorPreferences.GREEN_UP
                        ? colorStore.colorProfit
                        : colorStore.colorLoss
                    "
                    class="-ml-2 size-5"
                  />
                  <UIcon
                    :name="
                      item.value === ColorPreferences.GREEN_UP
                        ? 'mdi:arrow-down-thin'
                        : 'mdi:arrow-up-thin'
                    "
                    :color="
                      item.value === ColorPreferences.GREEN_UP
                        ? colorStore.colorLoss
                        : colorStore.colorProfit
                    "
                    class="-ml-2 size-5"
                  />
                </div>
              </template>
            </URadioGroup>
          </UFormField>
        </section>

        <section
          class="panel flex scroll-mt-4 flex-col gap-5 p-5"
          id="settings-notifications-section"
          aria-labelledby="settings-notifications"
        >
          <div>
            <h2 id="settings-notifications" class="text-base font-semibold text-highlighted">
              Notifications
            </h2>
            <p class="text-sm text-muted">Pop-up messages when orders change.</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.entryFill]">
              Entry filled
            </BaseCheckbox>
            <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitFill]">
              Exit filled
            </BaseCheckbox>
            <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.entryCancel]">
              Entry cancelled
            </BaseCheckbox>
            <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitCancel]">
              Exit cancelled
            </BaseCheckbox>
          </div>
        </section>

        <section
          class="panel flex scroll-mt-4 flex-col gap-5 p-5"
          id="settings-backtest-section"
          aria-labelledby="settings-backtest"
        >
          <h2 id="settings-backtest" class="text-base font-semibold text-highlighted">
            Backtesting
          </h2>
          <UFormField
            label="Backtesting metrics"
            help="Metrics shown in the per pair / per tag tables."
          >
            <USelectMenu
              multiple
              id="backtestMetrics"
              v-model="settingsStore.backtestAdditionalMetrics"
              :items="availableBacktestMetrics"
              label-key="header"
              value-key="field"
              class="w-full"
              display="chip"
            />
          </UFormField>
        </section>
      </div>
    </div>
  </div>
</template>
