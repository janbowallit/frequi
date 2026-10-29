<script setup lang="ts">
import EditValue from '../general/EditValue.vue';
const pairlistStore = usePairlistConfigStore();
</script>
<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
    <UFormField :label="$t('pairlistBuilder.configuration')" class="min-w-0 grow">
      <EditValue
        v-model="pairlistStore.config.name"
        :editable-name="$t('pairlistBuilder.editableName')"
        :allow-add="true"
        :allow-duplicate="true"
        :allow-edit="true"
        class="flex grow"
        @delete="pairlistStore.deleteConfig"
        @duplicate="(oldName: string, newName: string) => pairlistStore.duplicateConfig(newName)"
        @new="(name: string) => pairlistStore.newConfig(name)"
        @rename="(oldName: string, newName: string) => pairlistStore.saveConfig(newName)"
      >
        <USelect
          v-model="pairlistStore.configName"
          class="w-full text-start"
          :items="pairlistStore.savedConfigs.map((c) => c.name)"
          :placeholder="$t('pairlistBuilder.choose')"
          @update:model-value="(config) => pairlistStore.selectOrCreateConfig(config as string)"
        />
      </EditValue>
    </UFormField>
    <div class="flex gap-2">
      <UButton
        color="neutral"
        variant="outline"
        icon="lucide:save"
        :label="$t('common.save')"
        @click="pairlistStore.saveConfig(pairlistStore.config.name)"
      />
      <UButton
        :disabled="pairlistStore.evaluating || !pairlistStore.pairlistValid"
        variant="solid"
        :loading="pairlistStore.evaluating"
        :label="$t('pairlistBuilder.evaluate')"
        icon="lucide:play"
        :title="$t('pairlistBuilder.evaluateHelp')"
        @click="pairlistStore.startPairlistEvaluation()"
      />
    </div>
  </div>
</template>
