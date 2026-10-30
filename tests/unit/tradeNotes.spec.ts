// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import { i18n } from '@/i18n';
import TradeNotes from '@/components/journal/TradeNotes.vue';
import type { ClosedTrade, JournalEntry } from '@/types';

const trade = { trade_id: 1, botId: 'a' } as ClosedTrade;

function makeBot(save = vi.fn().mockResolvedValue({ trade_id: 1, note: 'late', tags: [] })) {
  return reactive({
    journal: {} as Record<number, JournalEntry>,
    journalSupported: true as boolean | null,
    saveJournal: save,
  });
}

function mountNotes(bot: {
  journal: Record<number, JournalEntry>;
  journalSupported: boolean | null;
  saveJournal: ReturnType<typeof vi.fn>;
}) {
  return mount(TradeNotes, {
    props: { trade, bot },
    global: {
      plugins: [i18n],
      stubs: {
        UTextarea: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        UInputTags: { template: '<div />' },
      },
    },
  });
}

describe('TradeNotes', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves 800 ms after typing stops', async () => {
    const bot = makeBot();
    const wrapper = mountNotes(bot);
    await wrapper.find('textarea').setValue('late');
    vi.advanceTimersByTime(799);
    expect(bot.saveJournal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(bot.saveJournal).toHaveBeenCalledOnce();
    expect(bot.saveJournal).toHaveBeenCalledWith(1, 'late', []);
  });

  it('saves a pending edit when closed early', async () => {
    const bot = makeBot();
    const wrapper = mountNotes(bot);
    await wrapper.find('textarea').setValue('late');
    vi.advanceTimersByTime(200);
    wrapper.unmount();
    expect(bot.saveJournal).toHaveBeenCalledOnce();
    expect(bot.saveJournal).toHaveBeenCalledWith(1, 'late', []);
  });

  it('keeps the text and offers a retry when saving fails', async () => {
    const bot = makeBot(vi.fn().mockRejectedValue(new Error('offline')));
    const wrapper = mountNotes(bot);
    await wrapper.find('textarea').setValue('late');
    vi.advanceTimersByTime(800);
    await flushPromises();
    expect(wrapper.text()).toContain('Not saved – retry');
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('late');
  });

  it('is hidden on a bot without journal endpoints', () => {
    const bot = { ...makeBot(), journalSupported: false };
    expect(mountNotes(bot).find('textarea').exists()).toBe(false);
  });

  it('waits until the journal has loaded', () => {
    const bot = makeBot();
    bot.journalSupported = null;
    expect(mountNotes(bot).find('textarea').exists()).toBe(false);
  });

  it('shows a note that arrives after opening', async () => {
    const bot = makeBot();
    const wrapper = mountNotes(bot);
    bot.journal = { 1: { trade_id: 1, note: 'from my phone', tags: ['late'] } };
    await nextTick();
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('from my phone');
  });

  it('keeps local edits when the journal refreshes', async () => {
    const bot = makeBot();
    const wrapper = mountNotes(bot);
    await wrapper.find('textarea').setValue('mine');
    bot.journal = { 1: { trade_id: 1, note: 'older', tags: [] } };
    await nextTick();
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('mine');
  });
});
