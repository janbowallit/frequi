<script setup lang="ts">
import { BotStates } from '@/types';
import { ltr, t } from '@/i18n';

/**
 * One line under the navigation that answers "is the bot OK and what is it waiting for".
 * Brass while waiting, green while a trade is open or a signal fired, coral when the bot
 * can't trade (offline, stopped).
 */
const botStore = useBotStore();
const { loaded, supported, verdict, earliest, showEarliest, fmtTime, untilText } = useNextEntry();

const bot = computed(() => botStore.activeBotorUndefined);
const botState = computed(() => bot.value?.botState?.state);

const openProfit = computed(
  () =>
    bot.value?.openTrades.reduce((a, t) => a + (t.total_profit_abs ?? t.profit_abs ?? 0), 0) ?? 0,
);

type Tone = 'waiting' | 'good' | 'bad';

const status = computed<{ label: string; tone: Tone; running?: boolean }>(() => {
  if (!bot.value?.isBotLoggedIn) return { label: t('status.signedOut'), tone: 'bad' };
  if (!bot.value.isBotOnline) return { label: t('common.offline'), tone: 'bad' };
  switch (botState.value) {
    case BotStates.RUNNING:
      return {
        label: t('status.running'),
        tone: bot.value.openTradeCount > 0 || verdict.value.tone === 'ready' ? 'good' : 'waiting',
        running: true,
      };
    case BotStates.PAUSED:
      return { label: t('status.paused'), tone: 'waiting' };
    case BotStates.STOPPED:
      return { label: t('status.stopped'), tone: 'bad' };
    case BotStates.RELOAD_CONFIG:
      return { label: t('status.reloading'), tone: 'waiting' };
    default:
      return { label: t('status.connecting'), tone: 'waiting' };
  }
});

const message = computed<{ title: string; detail?: string }>(() => {
  const b = bot.value;
  if (!b?.isBotLoggedIn) return { title: t('status.signInToSee') };
  if (!b.isBotOnline) return { title: t('status.unreachable'), detail: t('status.retrying') };
  if (botState.value === BotStates.STOPPED)
    return { title: t('status.notTrading'), detail: t('status.notManaged') };
  if (!loaded.value) return { title: t('status.checking') };
  if (!supported.value) {
    return b.openTradeCount > 0 ? { title: t('status.managing') } : { title: t('status.looking') };
  }
  return { title: verdict.value.title, detail: verdict.value.detail };
});

const stakeCurrency = computed(() => bot.value?.stakeCurrency ?? '');
const decimals = computed(() => bot.value?.stakeCurrencyDecimals ?? 3);
const maxTrades = computed(() => bot.value?.botState?.max_open_trades ?? 0);
</script>

<template>
  <div
    v-if="bot && !botStore.isWebserverMode"
    role="status"
    aria-live="polite"
    class="border-b text-sm transition-colors duration-300"
    :class="{
      'border-primary/30 bg-primary/8': status.tone === 'waiting',
      'border-profit/30 bg-profit/8': status.tone === 'good',
      'border-loss/30 bg-loss/8': status.tone === 'bad',
    }"
  >
    <div class="flex min-h-10 items-center gap-x-4 gap-y-1 px-3 py-1.5 lg:px-4">
      <!-- Bot state -->
      <span class="flex shrink-0 items-center gap-2 font-semibold text-highlighted">
        <span class="relative flex size-2.5" aria-hidden="true">
          <span
            v-if="status.tone === 'waiting'"
            class="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50"
          />
          <span
            class="relative inline-flex size-2.5 rounded-full"
            :class="{
              'bg-primary': status.tone === 'waiting',
              'bg-profit': status.tone === 'good',
              'bg-loss': status.tone === 'bad',
            }"
          />
        </span>
        {{ status.label }}
      </span>

      <!-- What the bot is doing -->
      <p class="min-w-0 flex-1 truncate text-start">
        <span class="font-medium text-highlighted">{{ message.title }}</span>
        <span v-if="message.detail" class="ms-2 hidden text-muted md:inline">
          {{ message.detail }}
        </span>
      </p>

      <!-- Open trades and the next possible entry -->
      <div class="hidden shrink-0 items-center gap-4 text-muted sm:flex">
        <RouterLink
          v-if="bot.isBotOnline"
          to="/trade"
          class="rounded-sm tabular-nums hover:text-highlighted"
        >
          <I18nT
            :keypath="maxTrades > 0 ? 'status.openOf' : 'status.open'"
            tag="span"
            scope="global"
          >
            <template #count>
              <span class="text-highlighted">{{ bot.openTradeCount }}</span>
            </template>
            <template #max>{{ maxTrades }}</template>
          </I18nT>
          <span
            v-if="bot.openTradeCount > 0"
            class="ms-1 font-medium"
            :class="openProfit >= 0 ? 'text-profit' : 'text-loss'"
          >
            {{
              ltr(
                `${openProfit > 0 ? '+' : ''}${formatPriceCurrency(openProfit, stakeCurrency, decimals)}`,
              )
            }}
          </span>
        </RouterLink>
        <I18nT
          v-if="showEarliest && earliest && status.running"
          keypath="status.earliest"
          tag="span"
          scope="global"
          class="hidden border-s border-default ps-4 tabular-nums lg:inline"
        >
          <template #time>
            <span class="font-medium text-highlighted">{{ fmtTime(earliest) }}</span>
          </template>
          <template #until>{{ untilText(earliest) }}</template>
        </I18nT>
      </div>

      <UButton
        v-if="bot.isBotOnline && botState === BotStates.STOPPED && bot.isTrading"
        color="neutral"
        variant="solid"
        size="xs"
        icon="lucide:play"
        :label="$t('common.start')"
        @click="bot.startBot()"
      />
    </div>
  </div>
</template>
