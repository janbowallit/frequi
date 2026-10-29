<script setup lang="ts">
import type { Pairlist } from '@/types';
import { useSortable, moveArrayElement } from '@vueuse/integrations/useSortable';

const botStore = useBotStore();
const pairlistStore = usePairlistConfigStore();

const availablePairlists = ref<Pairlist[]>([]);
const pairlistConfigsEl = ref<HTMLElement | null>(null);
const availablePairlistsEl = ref<HTMLElement | null>(null);
const selectedView = ref<'Config' | 'Results'>('Config');

const configEmpty = computed(() => {
  return pairlistStore.config.pairlists.length == 0;
});

useSortable(availablePairlistsEl, availablePairlists.value, {
  group: {
    name: 'configurator',
    pull: 'clone',
    put: false,
  },
  sort: false,
  filter: '.no-drag',
  dragClass: 'dragging',
});

useSortable(pairlistConfigsEl, pairlistStore.config.pairlists, {
  handle: '.handle',
  group: 'configurator',
  onUpdate: async (e) => {
    if (e.oldIndex === undefined || e.newIndex === undefined) {
      return;
    }
    moveArrayElement(pairlistStore.config.pairlists, e.oldIndex, e.newIndex);
  },
  onAdd: (e) => {
    if (e.oldIndex === undefined || e.newIndex === undefined) {
      return;
    }
    const pairlist = availablePairlists.value[e.oldIndex];
    if (!pairlist) {
      console.error('Pairlist not found');
      return;
    }
    pairlistStore.addToConfig(pairlist, e.newIndex);
    // quick fix from: https://github.com/SortableJS/Sortable/issues/1515
    e.clone.replaceWith(e.item);
    e.clone.remove();
  },
});

onMounted(async () => {
  availablePairlists.value = (await botStore.activeBot.getPairlists()).pairlists.sort((a, b) =>
    // Sort by is_pairlist_generator (by name), then by name.
    // TODO: this might need to be improved
    a.is_pairlist_generator === b.is_pairlist_generator
      ? a.name.localeCompare(b.name)
      : a.is_pairlist_generator
        ? -1
        : 1,
  );
  pairlistStore.selectOrCreateConfig(
    pairlistStore.isSavedConfig(pairlistStore.configName) ? pairlistStore.configName : 'default',
  );
});

watch(
  () => pairlistStore.whitelist,
  () => {
    selectedView.value = 'Results';
  },
);

if (pairlistStore.whitelist.length > 0) {
  selectedView.value = 'Results';
}
</script>

<template>
  <div
    class="grid w-full grid-cols-1 items-start gap-4 text-start xl:grid-cols-[20rem_minmax(0,1fr)_22rem]"
  >
    <!-- 1. What can be added -->
    <PanelSection
      :title="$t('pairlistBuilder.available')"
      :info="$t('pairlistBuilder.availableHelp')"
      body-class="max-h-[70vh] overflow-auto"
    >
      <ul ref="availablePairlistsEl" class="flex flex-col divide-y divide-default">
        <li
          v-for="pairlist in availablePairlists"
          :key="pairlist.name"
          :class="{
            'no-drag opacity-50 hover:cursor-default':
              pairlistStore.config.pairlists.length === 0 && !pairlist.is_pairlist_generator,
          }"
          class="flex items-start gap-2 px-4 py-2.5 hover:cursor-grab [.dragging]:bg-elevated"
        >
          <div class="flex min-w-0 grow flex-col">
            <span class="font-medium text-highlighted">{{ pairlist.name }}</span>
            <span class="text-xs text-muted">{{ pairlist.description }}</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="
              pairlistStore.config.pairlists.length === 0 && !pairlist.is_pairlist_generator
            "
            icon="lucide:arrow-right"
            :ui="{ leadingIcon: 'rtl:-scale-x-100' }"
            :aria-label="$t('pairlistBuilder.addFilter', { name: pairlist.name })"
            :title="$t('pairlistBuilder.addFilter', { name: pairlist.name })"
            @click="pairlistStore.addToConfig(pairlist, pairlistStore.config.pairlists.length)"
          />
        </li>
      </ul>
    </PanelSection>

    <!-- 2. The pairlist being built -->
    <div class="flex min-w-0 flex-col gap-4">
      <PanelSection :title="$t('pairlistBuilder.yours')" body-class="flex flex-col gap-4 p-4">
        <PairlistConfigActions />
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField :label="$t('pairlistBuilder.stakeCurrency')">
            <UInput v-model="pairlistStore.stakeCurrency" class="w-full" />
          </UFormField>
          <div class="flex flex-col gap-2 sm:pt-6">
            <BaseCheckbox v-model="pairlistStore.customExchange">{{
              $t('pairlistBuilder.otherExchange')
            }}</BaseCheckbox>
            <ExchangeSelect
              v-if="pairlistStore.customExchange"
              v-model="pairlistStore.selectedExchange"
            />
          </div>
        </div>
        <PairlistConfigBlacklist />
        <UAlert
          v-if="
            pairlistStore.config.pairlists.length > 0 && !pairlistStore.firstPairlistIsGenerator
          "
          color="warning"
          icon="lucide:triangle-alert"
          :title="$t('pairlistBuilder.needsGenerator')"
          :description="$t('pairlistBuilder.needsGeneratorHelp')"
        />
        <div class="flex flex-col gap-1.5">
          <h3 class="text-sm font-medium text-muted">{{ $t('pairlistBuilder.steps') }}</h3>
          <div class="relative">
            <div
              ref="pairlistConfigsEl"
              class="flex min-h-32 flex-col gap-2 rounded-md border border-dashed border-default p-2"
            >
              <PairlistConfigItem
                v-for="(pairlist, i) in pairlistStore.config.pairlists"
                :key="pairlist.id"
                v-model="pairlistStore.config.pairlists[i]!"
                :index="i"
                @remove="pairlistStore.removeFromConfig"
              />
            </div>
            <p
              v-if="configEmpty"
              class="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted"
            >
              <UIcon name="i-lucide-mouse-pointer-2" class="size-4" aria-hidden="true" />
              {{ $t('pairlistBuilder.dropHint') }}
            </p>
          </div>
        </div>
      </PanelSection>
    </div>

    <!-- 3. Output -->
    <PanelSection :title="$t('pairlistBuilder.output')" body-class="flex flex-col gap-3 p-4">
      <template #actions>
        <USegmentedControl
          v-model="selectedView"
          label-key="label"
          value-key="value"
          size="xs"
          :items="[
            { label: $t('pairlistBuilder.config'), value: 'Config' },
            {
              label: $t('pairlistBuilder.pairs'),
              value: 'Results',
              disabled: pairlistStore.whitelist.length === 0,
            },
          ]"
          disabled-key="disabled"
        />
      </template>
      <p class="text-xs text-muted">
        {{
          selectedView === 'Config'
            ? $t('pairlistBuilder.configHelp')
            : $t('pairlistBuilder.pairsHelp', { n: pairlistStore.whitelist.length })
        }}
      </p>
      <div class="relative overflow-auto">
        <CopyableTextfield
          v-if="selectedView === 'Config'"
          class="w-full"
          :content="pairlistStore.configJSON"
          :is-valid="pairlistStore.pairlistValid"
        />
        <CopyableTextfield
          v-if="selectedView === 'Results'"
          class="w-full"
          :content="pairlistStore.whitelist"
        />
      </div>
    </PanelSection>
  </div>
</template>
