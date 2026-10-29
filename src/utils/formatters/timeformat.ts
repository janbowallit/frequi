import { parse, toDate } from 'date-fns';
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';
import humanizeDuration from 'humanize-duration';
import { durationDelimiter, durationLanguage, intlLocale, isRtl, ltr, t } from '@/i18n';

/** Parse date from string, returns date in UTC! */
export function dateFromString(datestring: string, format: string): Date {
  const localTime = parse(datestring, format, 0);
  return fromZonedTime(localTime, 'UTC');
}

let locTimeZone = 'UTC';

/**
 * Set global timezone to use by conversion functions
 * @param tz Timezone to set
 */
export function setTimezone(tz: string) {
  locTimeZone = tz;
}

function getTimeZone(tz?: string): string {
  return tz || locTimeZone;
}

function formatDate(date: Date, formatPattern: string, timezone?: string): string {
  const timezoneRes = getTimeZone(timezone);
  return format(toZonedTime(date, timezoneRes), formatPattern, {
    timeZone: timezoneRes,
  });
}

/**
 * Solar Hijri date for the Persian UI, laid out like the English one: 1405/08/07 22:11:39.
 * Only for display - API values (time ranges, hours) always use the Gregorian helpers.
 */
function formatPersianDate(
  date: Date,
  { time = true, zone = false, timezone }: { time?: boolean; zone?: boolean; timezone?: string },
): string {
  const parts = new Intl.DateTimeFormat(intlLocale(), {
    timeZone: getTimeZone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(time ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' } : {}),
    ...(zone ? { timeZoneName: 'short' } : {}),
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  let text = `${part('year')}/${part('month')}/${part('day')}`;
  if (time) text += ` ${part('hour')}:${part('minute')}:${part('second')}`;
  if (zone) text += ` (${part('timeZoneName')})`;
  return ltr(text);
}

/** Date and time for display, in the UI language's calendar */
function displayDate(
  date: Date,
  {
    time = true,
    zone = false,
    timezone,
  }: { time?: boolean; zone?: boolean; timezone?: string } = {},
): string {
  if (isRtl()) return formatPersianDate(date, { time, zone, timezone });
  const pattern = `yyyy-MM-dd${time ? ' HH:mm:ss' : ''}${zone ? ' (z)' : ''}`;
  return formatDate(date, pattern, timezone);
}

/**
 * Convert a timestamp / Date object to String
 * @param ts Timestamp as number or date (in utc!!)
 */
export function timestampms(ts: number | Date): string {
  return displayDate(toDate(ts));
}

/**
 * Convert a timestamp / Date object to String.
 * Returns 'N/A' if ts is null
 * @param ts Timestamp as number or date (in utc!!)
 */
export function timestampmsOrNa(ts: number | Date | null): string {
  return ts ? displayDate(toDate(ts)) : t('common.na');
}

/**
 * Convert a timestamp / Date object to String
 * @param ts Timestamp as number or date (in utc!!)
 * @param timezone timezone to use
 * @returns formatted date in desired timezone (or globally configured timezone)
 */
export function timestampmsWithTimezone(ts: number | Date | null, timezone?: string): string {
  if (!ts) {
    return t('common.na');
  }
  return displayDate(toDate(ts), { zone: true, timezone });
}

/**
 * Converts timestamp or Date object to yyyy-MM-dd format (Solar Hijri in the Persian UI).
 * @param ts
 */
export function timestampToDateString(ts: number | Date): string {
  return displayDate(toDate(ts), { time: false });
}

/**
 * Converts timestamp or Date object to yyyyMMdd format.
 * Used for timerange displays
 * @param ts
 */
export function timestampToTimeRangeString(ts: number | Date): string {
  return formatDate(toDate(ts), 'yyyyMMdd');
}

export function timestampHour(ts: number): number {
  return Number(formatDate(toDate(ts), 'HH'));
}

/**
 * humanize-duration in the UI language ("2 hours, 5 minutes" / "2 ساعت و 5 دقیقه")
 * @param ms Duration in milliseconds
 */
export function humanizeMs(ms: number, options: humanizeDuration.Options = {}): string {
  return humanizeDuration(ms, {
    language: durationLanguage(),
    delimiter: durationDelimiter(),
    ...options,
  });
}

/**
 *  Get humanized Duration from seconds
 * @param duration Duration in seconds
 */
export function humanizeDurationFromSeconds(duration: number | undefined): string {
  return duration ? humanizeMs(duration * 1000) : t('common.na');
}

export default {
  timestampms,
  timestampmsWithTimezone,
  timestampToDateString,
  setTimezone,
};

export const exportForTesting = {
  getTimeZone,
  formatDate,
};
