<script setup lang="ts">
import type { EntryCondition } from '@/composables/useNextEntry';
import { fmtGap, needText } from '@/composables/useNextEntry';
import { joinList, t } from '@/i18n';

/**
 * Shows how close every whitelisted pair is to an entry, and the earliest time the next
 * trade can start. Data comes from useNextEntry (shared with the status strip).
 */
withDefaults(
  defineProps<{
    /** Hide the verdict - the status strip above already shows it */
    compact?: boolean;
  }>(),
  { compact: false },
);

const route = useRoute();
const router = useRouter();
const botStore = useBotStore();
const {
  loading,
  loaded,
  failedPairs,
  whitelist,
  timeframe,
  supported,
  marketKeys,
  marketConditions,
  pairs,
  latestCandleTs,
  earliest,
  verdict,
  showEarliest,
  fmtTime,
  untilText,
} = useNextEntry();

function pairConditions(conditions: EntryCondition[]) {
  return conditions.filter((c) => !marketKeys.value.has(c.key));
}

function metCount(conditions: EntryCondition[]) {
  return conditions.filter((c) => c.met).length;
}

/** The market gate is closed (some shared check unmet) */
const gateClosed = computed(() => marketConditions.value.some((c) => !c.met));

function readinessText(conditions: EntryCondition[]) {
  const own = pairConditions(conditions);
  const counts = { met: metCount(own), total: own.length };
  return gateClosed.value && counts.met === counts.total
    ? t('nextEntry.waitingGate', counts)
    : t('nextEntry.checksMet', counts);
}

/** The per-coin checks, explained once under the list */
const pairChecks = computed(() =>
  (pairs.value[0]?.conditions ?? []).filter((c) => !marketKeys.value.has(c.key)),
);

function badgeLabel(c: EntryCondition) {
  if (c.met) return c.label;
  return c.gap === null ? t('nextEntry.notYet', { label: c.label }) : `${c.label} ${fmtGap(c.gap)}`;
}

function selectPair(pair: string) {
  botStore.activeBot.selectedPair = pair;
  if (route.path !== '/trade') router.push('/trade');
}
</script>

<template>
  <div class="@container flex flex-col gap-6 p-4 text-start">
    <div v-if="!loaded" class="flex flex-col gap-2" aria-busy="true">
      <USkeleton class="h-14 w-full" />
      <USkeleton v-for="i in 4" :key="i" class="h-8 w-full" />
    </div>

    <EmptyState
      v-else-if="whitelist.length === 0"
      :title="$t('nextEntry.noPairs')"
      :description="$t('nextEntry.noPairsDetail')"
      icon="lucide:list"
    />

    <EmptyState v-else-if="!supported" :title="$t('nextEntry.unsupported')" icon="lucide:radar">
      <I18nT
        keypath="nextEntry.unsupportedDetail"
        tag="p"
        scope="global"
        class="max-w-sm text-sm text-muted"
      >
        <template #check><code>entry_check__&lt;name&gt;</code></template>
        <template #gap><code>entry_gap__</code></template>
        <template #target><code>entry_target__</code></template>
        <template #at><code>entry_at__</code></template>
        <template #fn><code>populate_indicators</code></template>
      </I18nT>
    </EmptyState>

    <template v-else>
      <!-- Verdict -->
      <div
        v-if="!compact"
        role="status"
        class="flex flex-col gap-2 border-s-2 ps-3 @md:flex-row @md:items-start @md:justify-between"
        :class="{
          'border-profit': verdict.tone === 'ready',
          'border-primary': verdict.tone === 'waiting',
          'border-accented': verdict.tone === 'blocked',
        }"
      >
        <div class="flex flex-col gap-1 min-w-0">
          <p class="text-base font-semibold text-highlighted">{{ verdict.title }}</p>
          <p class="text-sm text-muted">{{ verdict.detail }}</p>
        </div>
        <p v-if="showEarliest && earliest" class="shrink-0 text-sm text-muted @md:text-end">
          {{ $t('nextEntry.earliest') }}
          <span class="block text-base font-semibold text-highlighted tabular-nums">
            {{ fmtTime(earliest) }}
          </span>
          <span class="tabular-nums">{{ untilText(earliest) }}</span>
        </p>
      </div>

      <!-- Step 1: conditions shared by every pair (e.g. the BTC filter) -->
      <section
        v-if="marketConditions.length"
        aria-labelledby="next-entry-market"
        class="flex flex-col gap-3"
      >
        <div class="flex flex-col gap-1">
          <h3 id="next-entry-market" class="text-sm font-semibold text-highlighted">
            {{ $t('nextEntry.marketGate') }}
          </h3>
          <p class="text-sm text-muted">{{ $t('nextEntry.marketGateHelp') }}</p>
        </div>
        <ul class="flex flex-col gap-2">
          <li
            v-for="c in marketConditions"
            :key="c.key"
            class="flex items-start gap-3 rounded-lg border p-3"
            :class="
              c.met
                ? 'border-success/30 bg-success/5'
                : c.gap === null
                  ? 'border-default bg-elevated/40'
                  : 'border-primary/30 bg-primary/5'
            "
          >
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-md"
              :class="
                c.met
                  ? 'bg-success/10 text-success'
                  : c.gap === null
                    ? 'bg-elevated text-muted'
                    : 'bg-primary/10 text-primary'
              "
            >
              <UIcon
                :name="c.met ? 'i-lucide-lock-open' : 'i-lucide-lock'"
                class="size-4"
                aria-hidden="true"
              />
            </span>
            <div class="flex min-w-0 flex-col gap-1">
              <p class="text-sm font-semibold" :class="c.met ? 'text-success' : 'text-highlighted'">
                {{
                  c.met ? $t('nextEntry.gateOpen', { label: c.label }) : `${c.label} ${needText(c)}`
                }}
              </p>
              <p class="text-sm text-muted">
                {{ c.help }}
                <template v-if="!c.met && c.at">
                  {{ $t('nextEntry.nextCheck', { time: fmtTime(c.at) }) }}</template
                >
              </p>
            </div>
          </li>
        </ul>
      </section>

      <!-- Step 2: each coin's own checks -->
      <section aria-labelledby="next-entry-pairs" class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <h3 id="next-entry-pairs" class="text-sm font-semibold text-highlighted">
            {{
              marketConditions.length
                ? $t('nextEntry.ownChecksNumbered')
                : $t('nextEntry.ownChecks')
            }}
          </h3>
          <p class="text-sm text-muted">
            {{
              marketConditions.length
                ? $t('nextEntry.ownChecksHelpGate', { timeframe })
                : $t('nextEntry.ownChecksHelp', { timeframe })
            }}
          </p>
        </div>

        <div class="overflow-hidden rounded-lg border border-default">
          <!-- Column headings (wide panels only - narrow rows stack) -->
          <div
            class="hidden grid-cols-[8rem_7rem_1fr] gap-x-4 border-b border-default bg-elevated/40 px-3 py-2 text-xs font-medium text-muted @lg:grid"
            aria-hidden="true"
          >
            <span>{{ $t('nextEntry.colCoin') }}</span>
            <span>{{ $t('nextEntry.colReady') }}</span>
            <span>{{ $t('nextEntry.colChecks') }}</span>
          </div>
          <ul class="flex flex-col divide-y divide-default">
            <li
              v-for="r in pairs"
              :key="r.pair"
              class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-3 py-2.5 transition-colors hover:bg-elevated/40 @lg:grid-cols-[8rem_7rem_1fr]"
            >
              <button
                type="button"
                class="justify-self-start truncate rounded-sm text-start text-sm font-medium text-highlighted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                :title="$t('nextEntry.showOnChart', { pair: r.pair })"
                @click="selectPair(r.pair)"
              >
                {{ r.pair }}
              </button>

              <!-- Readiness: one segment per check, plus the count -->
              <div class="flex items-center gap-2">
                <UBadge
                  v-if="r.inTrade"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  :label="$t('nextEntry.inTrade')"
                />
                <UBadge
                  v-else-if="r.signal"
                  color="success"
                  variant="solid"
                  size="sm"
                  :label="$t('nextEntry.signal')"
                />
                <span
                  v-else
                  class="flex items-center gap-2"
                  role="img"
                  :aria-label="readinessText(r.conditions)"
                  :title="readinessText(r.conditions)"
                >
                  <span class="flex h-1.5 w-12 gap-0.5">
                    <span
                      v-for="i in pairConditions(r.conditions).length"
                      :key="i"
                      class="flex-1 rounded-full"
                      :class="
                        i <= metCount(pairConditions(r.conditions)) ? 'bg-profit' : 'bg-accented'
                      "
                    />
                  </span>
                  <span class="text-xs text-muted tabular-nums">
                    {{ metCount(pairConditions(r.conditions)) }}/{{
                      pairConditions(r.conditions).length
                    }}
                  </span>
                  <UIcon
                    v-if="
                      gateClosed &&
                      metCount(pairConditions(r.conditions)) === pairConditions(r.conditions).length
                    "
                    name="i-lucide-lock"
                    class="size-3.5 shrink-0 text-primary"
                  />
                </span>
              </div>

              <ul class="col-span-2 flex min-w-0 flex-wrap gap-1.5 @lg:col-span-1">
                <li
                  v-for="c in pairConditions(r.conditions)"
                  :key="c.key"
                  class="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs whitespace-nowrap ring ring-inset"
                  :class="
                    c.met
                      ? 'bg-success/10 font-medium text-success ring-success/25'
                      : 'bg-elevated/60 text-muted ring-default'
                  "
                  :title="
                    c.help ??
                    (c.met ? $t('nextEntry.met', { label: c.label }) : `${c.label}: ${needText(c)}`)
                  "
                >
                  <UIcon
                    v-if="c.met"
                    name="i-lucide-check"
                    class="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span class="tabular-nums">{{ badgeLabel(c) }}</span>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <!-- What each check means -->
      <section
        v-if="pairChecks.some((c) => c.help)"
        aria-labelledby="next-entry-legend"
        class="flex flex-col gap-2"
      >
        <h3 id="next-entry-legend" class="text-xs font-medium text-muted">
          {{ $t('nextEntry.legendTitle') }}
        </h3>
        <dl class="grid gap-x-4 gap-y-2 text-sm @md:grid-cols-[8rem_1fr]">
          <template v-for="c in pairChecks" :key="c.key">
            <dt class="font-medium text-highlighted">{{ c.label }}</dt>
            <dd class="text-muted">{{ c.help ?? $t('nextEntry.definedByStrategy') }}</dd>
          </template>
        </dl>
      </section>

      <UAlert
        v-if="failedPairs.length"
        color="warning"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="$t('nextEntry.loadFailed', { pairs: joinList(failedPairs) })"
      />

      <footer class="flex flex-col gap-1 border-t border-default pt-3 text-xs text-muted">
        <p>{{ $t('nextEntry.keyHint') }}</p>
        <p class="flex items-center gap-1.5">
          {{
            latestCandleTs
              ? $t('nextEntry.updatedLatest', { timeframe, time: timestampms(latestCandleTs) })
              : $t('nextEntry.updated', { timeframe })
          }}
          <UIcon
            v-if="loading"
            name="i-lucide-loader-circle"
            class="size-3 shrink-0 animate-spin"
          />
        </p>
      </footer>
    </template>
  </div>
</template>
