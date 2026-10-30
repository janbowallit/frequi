import { formatInTimeZone } from 'date-fns-tz';
import type { ClosedTrade } from '@/types';

/** Closed trades of one calendar day */
export interface DayStats {
  /** yyyy-MM-dd in the chosen timezone */
  date: string;
  profitAbs: number;
  tradeCount: number;
  wins: number;
  /** Sum of winning trades' profit */
  grossWin: number;
  /** Sum of losing trades' profit (zero or negative) */
  grossLoss: number;
  /** Net profit per bot id */
  byBot: Record<string, number>;
}

/** Calendar day (yyyy-MM-dd) of a timestamp in the given timezone */
export function dayKey(ts: number, timeZone: string): string {
  return formatInTimeZone(ts, timeZone, 'yyyy-MM-dd');
}

/**
 * Closed trades grouped by the day they closed in `timeZone`.
 * Open trades and trades without a close time are skipped. `botIds` limits the bots when given.
 */
export function groupByDay(
  trades: ClosedTrade[],
  timeZone: string,
  botIds?: string[],
): Record<string, DayStats> {
  const days: Record<string, DayStats> = {};
  for (const trade of trades) {
    if (trade.is_open || !trade.close_timestamp) continue;
    if (botIds && !botIds.includes(trade.botId)) continue;

    const date = dayKey(trade.close_timestamp, timeZone);
    const profit = trade.profit_abs ?? 0;
    const d = (days[date] ??= {
      date,
      profitAbs: 0,
      tradeCount: 0,
      wins: 0,
      grossWin: 0,
      grossLoss: 0,
      byBot: {},
    });
    d.profitAbs += profit;
    d.tradeCount += 1;
    if (profit > 0) {
      d.wins += 1;
      d.grossWin += profit;
    } else {
      d.grossLoss += profit;
    }
    d.byBot[trade.botId] = (d.byBot[trade.botId] ?? 0) + profit;
  }
  return days;
}

/** Totals for a set of days; ratios are null when there is nothing to divide by */
export function monthSummary(days: DayStats[]) {
  let profitAbs = 0;
  let tradeCount = 0;
  let wins = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let bestDay: DayStats | null = null;
  let worstDay: DayStats | null = null;
  for (const d of days) {
    profitAbs += d.profitAbs;
    tradeCount += d.tradeCount;
    wins += d.wins;
    grossWin += d.grossWin;
    grossLoss += d.grossLoss;
    if (d.tradeCount === 0) continue;
    if (!bestDay || d.profitAbs > bestDay.profitAbs) bestDay = d;
    if (!worstDay || d.profitAbs < worstDay.profitAbs) worstDay = d;
  }
  return {
    profitAbs,
    tradeCount,
    winRate: tradeCount ? wins / tradeCount : null,
    bestDay,
    worstDay,
    profitFactor: grossLoss !== 0 ? grossWin / Math.abs(grossLoss) : null,
  };
}

/**
 * Days of a month laid out in weeks: yyyy-MM-dd strings padded with null before the first
 * and after the last day, so the length is a multiple of 7.
 * @param month 1-12
 * @param weekStartsOn 0 = Sunday, 1 = Monday, 6 = Saturday
 */
export function monthGrid(year: number, month: number, weekStartsOn: 0 | 1 | 6): (string | null)[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (firstWeekday - weekStartsOn + 7) % 7;

  const grid: (string | null)[] = Array(lead).fill(null);
  const mm = String(month).padStart(2, '0');
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(`${year}-${mm}-${String(d).padStart(2, '0')}`);
  }
  while (grid.length % 7) grid.push(null);
  return grid;
}

/** Profit before fees, fees paid and net profit of a closed trade */
export function feeSplit(trade: ClosedTrade) {
  const fees = (trade.fee_open_cost ?? 0) + (trade.fee_close_cost ?? 0);
  const net = trade.profit_abs ?? 0;
  const gross = net + fees;
  return { gross, fees, net, feeShare: gross > 0 ? fees / gross : null };
}

/** Value of the "all tags" option - Select items can't use an empty string */
export const ALL_TAGS = '__all__';

/** Options for the tag filter: "all tags" first, then every tag */
export function tagFilterItems(tags: string[], allLabel: string) {
  return [{ label: allLabel, value: ALL_TAGS }, ...tags.map((tag) => ({ label: tag, value: tag }))];
}
