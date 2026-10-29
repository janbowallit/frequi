<script setup lang="ts">
import { FtWsMessageTypes } from '@/types/wsMessageTypes';
import { LOCALES, metricLabel, t } from '@/i18n';

const settingsStore = useSettingsStore();
const colorStore = useColorStore();

const sections = computed(() => [
  { id: 'settings-ui-section', label: t('settings.interface') },
  { id: 'settings-chart-section', label: t('settings.charts') },
  { id: 'settings-notifications-section', label: t('settings.notifications') },
  { id: 'settings-backtest-section', label: t('settings.backtesting') },
]);

const metricItems = computed(() =>
  availableBacktestMetrics.value.map((m) => ({ ...m, header: metricLabel(m.header) })),
);
const languageOptions = LOCALES.map((l) => ({ value: l.code, text: l.name }));
const timezoneOptions = ['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone];
const openTradesOptions = computed(() => [
  { value: OpenTradeVizOptions.showPill, text: t('settings.countOnIcon') },
  { value: OpenTradeVizOptions.asTitle, text: t('settings.countInTitle') },
  { value: OpenTradeVizOptions.noOpenTrades, text: t('settings.dontShow') },
]);
const colorPreferenceOptions = computed(() => [
  { value: ColorPreferences.GREEN_UP, text: t('settings.greenUp') },
  { value: ColorPreferences.RED_UP, text: t('settings.redUp') },
]);
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-3 text-start md:p-6">
    <PageHeader :title="$t('settings.title')" :description="$t('settings.description')">
      <template #actions>
        <span class="text-sm text-muted tabular-nums">
          {{ $t('settings.uiVersion', { version: settingsStore.uiVersion }) }}
        </span>
      </template>
    </PageHeader>

    <div class="grid items-start gap-6 md:grid-cols-[11rem_minmax(0,1fr)]">
      <nav
        :aria-label="$t('settings.sections')"
        class="sticky top-0 hidden flex-col gap-0.5 md:flex"
      >
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
          <h2 id="settings-ui" class="text-base font-semibold text-highlighted">
            {{ $t('settings.interface') }}
          </h2>

          <UFormField :label="$t('settings.language')" :help="$t('settings.languageHelp')">
            <URadioGroup
              v-model="settingsStore.locale"
              :items="languageOptions"
              label-key="text"
              value-key="value"
              orientation="horizontal"
            />
          </UFormField>

          <UFormField :label="$t('settings.openTradesInTab')">
            <USelect
              v-model="settingsStore.openTradesInTitle"
              :items="openTradesOptions"
              label-key="text"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('settings.timezone')" :help="$t('settings.timezoneHelp')">
            <USelect v-model="settingsStore.timezone" :items="timezoneOptions" class="w-full" />
          </UFormField>

          <BaseCheckbox v-model="settingsStore.backgroundSync">
            {{ $t('settings.backgroundSync') }}
            <template #hint>{{ $t('settings.backgroundSyncHint') }}</template>
          </BaseCheckbox>

          <BaseCheckbox v-model="settingsStore.confirmDialog">
            {{ $t('settings.confirmExit') }}
            <template #hint>{{ $t('settings.confirmExitHint') }}</template>
          </BaseCheckbox>
        </section>

        <section
          class="panel flex scroll-mt-4 flex-col gap-5 p-5"
          id="settings-chart-section"
          aria-labelledby="settings-chart"
        >
          <h2 id="settings-chart" class="text-base font-semibold text-highlighted">
            {{ $t('settings.charts') }}
          </h2>

          <UFormField :label="$t('settings.priceScaleSide')">
            <URadioGroup
              v-model="settingsStore.chartLabelSide"
              :items="[
                { label: $t('settings.left'), value: 'left' },
                { label: $t('settings.right'), value: 'right' },
              ]"
              orientation="horizontal"
            />
          </UFormField>

          <BaseCheckbox v-model="settingsStore.useHeikinAshiCandles">
            {{ $t('settings.heikinAshi') }}
            <template #hint>{{ $t('settings.heikinAshiHint') }}</template>
          </BaseCheckbox>

          <BaseCheckbox v-model="settingsStore.useReducedPairCalls">
            {{ $t('settings.reducedCalls') }}
            <template #hint>{{ $t('settings.reducedCallsHint') }}</template>
          </BaseCheckbox>

          <UFormField :label="$t('settings.candleCount')" :help="$t('settings.candleCountHelp')">
            <div class="flex w-full items-center gap-4">
              <USlider
                v-model="settingsStore.chartDefaultCandleCount"
                class="flex-1"
                :step="50"
                :min="100"
                :max="2000"
                :aria-label="$t('settings.candleCount')"
              />
              <UInputNumber
                v-model="settingsStore.chartDefaultCandleCount"
                :step="50"
                :min="100"
                :max="2000"
                size="sm"
                :aria-label="$t('settings.candleCount')"
              />
            </div>
          </UFormField>

          <UFormField :label="$t('settings.candleColors')">
            <URadioGroup
              v-model="colorStore.colorPreference"
              :items="colorPreferenceOptions"
              label-key="text"
              value-key="value"
              orientation="horizontal"
            >
              <template #label="{ item }">
                <div class="flex items-center">
                  <span class="me-2">{{ item.text }}</span>
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
                    class="-ms-2 size-5"
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
                    class="-ms-2 size-5"
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
              {{ $t('settings.notifications') }}
            </h2>
            <p class="text-sm text-muted">{{ $t('settings.notificationsHelp') }}</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.entryFill]">
              {{ $t('settings.entryFilled') }}
            </BaseCheckbox>
            <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitFill]">
              {{ $t('settings.exitFilled') }}
            </BaseCheckbox>
            <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.entryCancel]">
              {{ $t('settings.entryCancelled') }}
            </BaseCheckbox>
            <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitCancel]">
              {{ $t('settings.exitCancelled') }}
            </BaseCheckbox>
          </div>
        </section>

        <section
          class="panel flex scroll-mt-4 flex-col gap-5 p-5"
          id="settings-backtest-section"
          aria-labelledby="settings-backtest"
        >
          <h2 id="settings-backtest" class="text-base font-semibold text-highlighted">
            {{ $t('settings.backtesting') }}
          </h2>
          <UFormField
            :label="$t('settings.backtestMetrics')"
            :help="$t('settings.backtestMetricsHelp')"
          >
            <USelectMenu
              multiple
              id="backtestMetrics"
              v-model="settingsStore.backtestAdditionalMetrics"
              :items="metricItems"
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
