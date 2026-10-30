import { describe, it, expect } from 'vitest';
import type { ClosedTrade } from '@/types';
import {
  dayKey,
  feeSplit,
  groupByDay,
  monthGrid,
  monthSummary,
  type DayStats,
} from '@/utils/journal';

const ts = Date.UTC(2026, 9, 29, 21, 0);

function trade(values: Partial<ClosedTrade>): ClosedTrade {
  return {
    is_open: false,
    close_timestamp: ts,
    profit_abs: 0,
    botId: 'a',
    ...values,
  } as ClosedTrade;
}

function day(values: Partial<DayStats>): DayStats {
  return {
    date: '2026-10-01',
    profitAbs: 0,
    tradeCount: 0,
    wins: 0,
    grossWin: 0,
    grossLoss: 0,
    byBot: {},
    ...values,
  };
}

describe('dayKey', () => {
  it('uses the given timezone', () => {
    expect(dayKey(ts, 'UTC')).toBe('2026-10-29');
    expect(dayKey(ts, 'Asia/Tehran')).toBe('2026-10-30');
  });
});

describe('groupByDay', () => {
  const trades = [
    trade({ botId: 'a', profit_abs: 2 }),
    trade({ botId: 'b', profit_abs: -0.5 }),
    trade({ botId: 'a', profit_abs: 9, is_open: true }),
  ];

  it('sums closed trades of all bots and skips open trades', () => {
    const days = groupByDay(trades, 'UTC');
    expect(Object.keys(days)).toEqual(['2026-10-29']);
    const d = days['2026-10-29']!;
    expect(d.profitAbs).toBe(1.5);
    expect(d.tradeCount).toBe(2);
    expect(d.wins).toBe(1);
    expect(d.byBot).toEqual({ a: 2, b: -0.5 });
  });

  it('filters by bot', () => {
    expect(groupByDay(trades, 'UTC', ['a'])['2026-10-29']!.profitAbs).toBe(2);
  });
});

describe('monthSummary', () => {
  it('has no NaN for an empty month', () => {
    expect(monthSummary([])).toEqual({
      profitAbs: 0,
      tradeCount: 0,
      winRate: null,
      bestDay: null,
      worstDay: null,
      profitFactor: null,
    });
  });

  it('adds up days', () => {
    const good = day({ date: '2026-10-02', profitAbs: 3, tradeCount: 2, wins: 2, grossWin: 3 });
    const bad = day({ date: '2026-10-03', profitAbs: -1, tradeCount: 1, grossLoss: -1 });
    const summary = monthSummary([good, bad]);
    expect(summary.profitAbs).toBe(2);
    expect(summary.tradeCount).toBe(3);
    expect(summary.winRate).toBeCloseTo(2 / 3);
    expect(summary.profitFactor).toBe(3);
    expect(summary.bestDay).toBe(good);
    expect(summary.worstDay).toBe(bad);
  });
});

describe('monthGrid', () => {
  it('starts weeks on Saturday', () => {
    const grid = monthGrid(2026, 10, 6);
    expect(grid.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(grid[5]).toBe('2026-10-01');
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(31);
  });

  it('starts weeks on Monday', () => {
    const grid = monthGrid(2026, 10, 1);
    expect(grid.slice(0, 3)).toEqual([null, null, null]);
    expect(grid[3]).toBe('2026-10-01');
  });
});

describe('feeSplit', () => {
  it('splits a winning trade', () => {
    const split = feeSplit(trade({ profit_abs: 0.3, fee_open_cost: 0.13, fee_close_cost: 0.13 }));
    expect(split.gross).toBeCloseTo(0.56);
    expect(split.fees).toBeCloseTo(0.26);
    expect(split.net).toBeCloseTo(0.3);
    expect(split.feeShare).toBeCloseTo(0.4643, 4);
  });

  it('has no fee share when there was no gross profit', () => {
    const split = feeSplit(trade({ profit_abs: -0.5, fee_open_cost: 0.1, fee_close_cost: 0.1 }));
    expect(split.gross).toBeCloseTo(-0.3);
    expect(split.feeShare).toBeNull();
  });
});
