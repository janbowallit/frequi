/** A trade's journal note and tags, as stored on the bot (`/trades/{id}/journal`) */
export interface JournalEntry {
  trade_id: number;
  note: string;
  tags: string[];
  updated_at?: string | null;
}

/** Journal entries keyed by trade id */
export type JournalMap = Record<number, JournalEntry>;

/** What the strategy saw when the trade's entry filled (custom data `entry_snapshot`) */
export interface EntrySnapshot {
  v: 1;
  /** Open time of the candle that gave the signal (ISO) */
  candle: string;
  enter_tag: string | null;
  checks: Record<string, { met: boolean; gap: number | null }>;
  values: Record<string, number | null>;
}
