<script setup lang="ts">
/** Where every open trade will be sold. The open-trade counterpart of the Next entry panel. */
const botStore = useBotStore();
const { plans } = useExitPlan();
const { loaded } = useNextEntry();
</script>

<template>
  <div class="flex flex-col p-4 text-left">
    <EmptyState
      v-if="plans.length === 0"
      title="No open trades"
      description="When the bot buys, this shows the prices where it will sell."
      icon="mdi:exit-run"
    />
    <template v-else>
      <ul class="flex flex-col divide-y divide-default">
        <li v-for="plan in plans" :key="plan.trade.trade_id" class="py-4 first:pt-0 last:pb-0">
          <ExitPlanItem :plan="plan" @select="botStore.activeBot.setDetailTrade(plan.trade)" />
        </li>
      </ul>
      <p v-if="!loaded" class="mt-3 text-xs text-muted">Loading exit levels…</p>
    </template>
  </div>
</template>
