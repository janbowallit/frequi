<script setup lang="ts">
import { joinList } from '@/i18n';
const newblacklistpair = ref('');
const blacklistSelect = ref<number[]>([]);
const botStore = useBotStore();

function initBlacklist() {
  if (botStore.activeBot.whitelist.length === 0) {
    botStore.activeBot.getWhitelist();
  }
  if (botStore.activeBot.blacklist.length === 0) {
    botStore.activeBot.getBlacklist();
  }
}

const addOpen = ref(false);
function addBlacklistPair() {
  const pair = newblacklistpair.value.trim();
  if (pair) {
    botStore.activeBot.addBlacklist({ blacklist: [pair] });
    newblacklistpair.value = '';
    addOpen.value = false;
  }
}

const loading = ref(false);
async function refreshLists() {
  loading.value = true;
  try {
    await Promise.all([botStore.activeBot.getWhitelist(), botStore.activeBot.getBlacklist()]);
  } finally {
    loading.value = false;
  }
}

function blacklistSelectClick(key: number) {
  const index = blacklistSelect.value.indexOf(key);
  if (index > -1) {
    blacklistSelect.value.splice(index, 1);
  } else {
    blacklistSelect.value.push(key);
  }
}

function deletePairs() {
  if (blacklistSelect.value.length === 0) return;
  // const pairlist = blacklistSelect.value;
  const pairlist = botStore.activeBot.blacklist.filter(
    (value, index) => blacklistSelect.value.indexOf(index) > -1,
  );
  botStore.activeBot.deleteBlacklist(pairlist);
  blacklistSelect.value = [];
}
onMounted(() => {
  initBlacklist();
});
</script>

<template>
  <div class="flex flex-col">
    <PanelHeader :title="$t('pairs.pairlist')">
      <template #actions>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="lucide:refresh-cw"
          :title="$t('common.refresh')"
          :aria-label="$t('pairs.refreshPairlist')"
          :loading="loading"
          @click="refreshLists"
        />
      </template>
    </PanelHeader>

    <!-- Whitelist -->
    <section aria-labelledby="whitelist-heading" class="flex flex-col gap-2 p-3">
      <div class="flex items-baseline justify-between gap-2">
        <h4 id="whitelist-heading" class="text-sm font-medium text-muted">
          {{ $t('pairs.whitelist') }}
          <span class="ms-1 font-normal normal-case tabular-nums">
            ({{ botStore.activeBot.whitelist.length }})
          </span>
        </h4>
        <span
          v-if="botStore.activeBot.pairlistMethods.length"
          class="truncate text-xs text-muted"
          :title="$t('pairs.methods', { methods: joinList(botStore.activeBot.pairlistMethods) })"
        >
          {{ botStore.activeBot.pairlistMethods.join(' · ') }}
        </span>
      </div>
      <ul v-if="botStore.activeBot.whitelist.length" class="flex flex-wrap gap-1.5">
        <li v-for="pair in botStore.activeBot.whitelist" :key="pair">
          <UBadge color="neutral" variant="outline" size="md" :label="pair" class="font-medium" />
        </li>
      </ul>
      <p v-else class="text-sm text-muted">
        {{ $t('pairs.whitelistUnavailable') }}
      </p>
    </section>

    <USeparator />

    <!-- Blacklist -->
    <section aria-labelledby="blacklist-heading" class="flex flex-col gap-2 p-3">
      <div class="flex min-h-8 items-center gap-2">
        <h4 id="blacklist-heading" class="me-auto text-sm font-medium text-muted">
          {{ $t('pairs.blacklist') }}
          <span class="ms-1 font-normal normal-case tabular-nums">
            ({{ botStore.activeBot.blacklist.length }})
          </span>
        </h4>
        <UButton
          v-if="botStore.activeBot.botFeatures.botBlacklistModify && blacklistSelect.length"
          color="error"
          variant="soft"
          size="xs"
          icon="lucide:trash-2"
          :label="$t('pairs.removeN', { n: blacklistSelect.length })"
          @click="deletePairs"
        />
        <UPopover v-model:open="addOpen">
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            icon="lucide:plus"
            :label="$t('common.add')"
          />
          <template #content>
            <form class="flex w-64 flex-col gap-3 p-3" @submit.prevent="addBlacklistPair">
              <UFormField :label="$t('pairs.pairToBlacklist')" required>
                <UInput
                  id="blacklist-pair"
                  v-model="newblacklistpair"
                  :placeholder="$t('pairs.pairPlaceholder')"
                  required
                  autofocus
                  class="w-full"
                />
              </UFormField>
              <UButton
                id="blacklist-submit"
                type="submit"
                :label="$t('pairs.addToBlacklist')"
                block
              />
            </form>
          </template>
        </UPopover>
      </div>
      <template v-if="botStore.activeBot.blacklist.length">
        <ul class="flex flex-wrap gap-1.5" :aria-label="$t('pairs.blacklisted')">
          <li v-for="(pair, key) in botStore.activeBot.blacklist" :key="pair">
            <UButton
              size="xs"
              :color="blacklistSelect.includes(key) ? 'error' : 'neutral'"
              :variant="blacklistSelect.includes(key) ? 'soft' : 'outline'"
              :icon="blacklistSelect.includes(key) ? 'lucide:circle-check' : undefined"
              :label="pair"
              :aria-pressed="blacklistSelect.includes(key)"
              :disabled="!botStore.activeBot.botFeatures.botBlacklistModify"
              @click="blacklistSelectClick(key)"
            />
          </li>
        </ul>
        <p v-if="botStore.activeBot.botFeatures.botBlacklistModify" class="text-xs text-muted">
          {{ $t('pairs.selectToRemove') }}
        </p>
      </template>
      <p v-else class="text-sm text-muted">{{ $t('pairs.noBlacklist') }}</p>
    </section>
  </div>
</template>
