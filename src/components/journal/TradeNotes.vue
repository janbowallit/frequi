<script setup lang="ts">
/** The user's note and tags on a trade, saved on the bot a moment after typing stops. */
import type { ClosedTrade, JournalEntry, JournalMap } from '@/types';

const SAVE_DELAY_MS = 800;
const MAX_NOTE = 2000;
const MAX_TAGS = 10;
const MAX_TAG = 30;

const props = defineProps<{
  trade: ClosedTrade;
  bot: {
    journal: JournalMap;
    journalSupported: boolean | null;
    saveJournal: (tradeId: number, note: string, tags: string[]) => Promise<JournalEntry>;
  };
}>();

const saved = props.bot.journal[props.trade.trade_id];
const note = ref(saved?.note ?? '');
const tags = ref<string[]>([...(saved?.tags ?? [])]);
const status = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

/** Tags used on other trades of this bot, offered as one-click suggestions */
const suggestions = computed(() => {
  const own = new Set(tags.value.map((x) => x.toLocaleLowerCase()));
  const all = new Map<string, string>();
  Object.values(props.bot.journal).forEach((entry) =>
    entry.tags.forEach((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!own.has(key) && !all.has(key)) all.set(key, tag);
    }),
  );
  return [...all.values()].slice(0, 8);
});

let timer: ReturnType<typeof setTimeout> | undefined;

async function save() {
  timer = undefined;
  status.value = 'saving';
  try {
    await props.bot.saveJournal(props.trade.trade_id, note.value, tags.value);
    status.value = 'saved';
  } catch {
    status.value = 'error';
  }
}

function scheduleSave() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(save, SAVE_DELAY_MS);
}

function setTags(value: string[]) {
  const seen = new Set<string>();
  tags.value = value
    .map((tag) => tag.trim().slice(0, MAX_TAG))
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TAGS);
  scheduleSave();
}

function onNote(value: string) {
  note.value = value;
  scheduleSave();
}

// Closing the slide-over must not drop an edit that is still waiting to be saved
onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer);
    save();
  }
});
</script>

<template>
  <div v-if="bot.journalSupported !== false" class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold">{{ $t('journal.yourNotes') }}</h3>
      <span v-if="status === 'saving'" class="text-xs text-muted">{{ $t('journal.saving') }}</span>
      <span v-else-if="status === 'saved'" class="text-xs text-profit">{{ $t('journal.saved') }}</span>
      <button
        v-else-if="status === 'error'"
        type="button"
        class="text-xs text-loss underline pointer-coarse:min-h-11"
        @click="save"
      >
        {{ $t('journal.notSaved') }}
      </button>
    </div>
    <UTextarea
      :model-value="note"
      :maxlength="MAX_NOTE"
      :rows="3"
      autoresize
      :placeholder="$t('journal.notePlaceholder')"
      :aria-label="$t('journal.yourNotes')"
      @update:model-value="onNote"
    />
    <UInputTags
      :model-value="tags"
      :max-length="MAX_TAG"
      :max="MAX_TAGS"
      add-on-blur
      :placeholder="tags.length < MAX_TAGS ? $t('journal.tagPlaceholder') : ''"
      :aria-label="$t('journal.tags')"
      @update:model-value="setTags"
    />
    <div v-if="suggestions.length && tags.length < MAX_TAGS" class="flex flex-wrap gap-1">
      <UButton
        v-for="tag in suggestions"
        :key="tag"
        size="xs"
        color="neutral"
        variant="soft"
        icon="i-lucide-plus"
        class="pointer-coarse:min-h-11"
        @click="setTags([...tags, tag])"
      >
        {{ tag }}
      </UButton>
    </div>
  </div>
</template>
