import { createI18n } from 'vue-i18n';
import en from './locales/en';
import fa from './locales/fa';
import { METRIC_NAMES_FA, WALLET_SUFFIX, WALLET_SUFFIX_FA } from './metricNames';

/**
 * UI languages. English is the source of truth: `fa` is typed against it, so a missing or
 * misspelled key fails the type check.
 *
 * Templates use `$t`, component scripts `useI18n()`, and stores / composables / utils the
 * global `t` exported here (it is reactive, so computeds re-run when the language changes).
 */
export const LOCALES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'fa', name: 'فارسی', dir: 'rtl' },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];

export type MessageSchema = typeof en;

export function isLocale(value: unknown): value is LocaleCode {
  return LOCALES.some((l) => l.code === value);
}

/** Persian for browsers set to Persian, English otherwise */
export function browserLocale(): LocaleCode {
  const lang = typeof navigator === 'undefined' ? '' : navigator.language;
  return lang.toLowerCase().startsWith('fa') ? 'fa' : 'en';
}

export const i18n = createI18n<[MessageSchema], LocaleCode, false>({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, fa },
  // Messages hold plain text, never HTML
  warnHtmlMessage: false,
});

export const t: typeof i18n.global.t = i18n.global.t;

export function currentLocale(): LocaleCode {
  return i18n.global.locale.value;
}

export function isRtl(): boolean {
  return currentLocale() === 'fa';
}

/**
 * BCP 47 tag for Intl formatting. Persian keeps Latin digits (prices must match the exchange)
 * and uses the Solar Hijri calendar for dates. English keeps the browser's own format.
 */
export function intlLocale(): string | undefined {
  return isRtl() ? 'fa-IR-u-ca-persian-nu-latn' : undefined;
}

/** Language for humanize-duration */
export function durationLanguage(): string {
  return currentLocale();
}

/** Delimiter between duration units ("1 hour, 5 minutes" / "۱ ساعت و ۵ دقیقه") */
export function durationDelimiter(): string {
  return isRtl() ? ' و ' : ', ';
}

/**
 * Keeps a number, price or date in left-to-right order inside right-to-left text, so
 * "-0.72%" doesn't render as "0.72%-". A no-op in English.
 */
export function ltr(text: string): string {
  return isRtl() ? `⁦${text}⁩` : text;
}

export function applyLocale(code: LocaleCode) {
  i18n.global.locale.value = code;
  const dir = LOCALES.find((l) => l.code === code)?.dir ?? 'ltr';
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
}

/** "a, b, c" with the language's comma */
export function joinList(items: string[]): string {
  return items.join(t('list.sep'));
}

/** "a and b" / "a, b and c" */
export function joinAnd(items: string[]): string {
  if (items.length < 2) return items.join('');
  return t('list.and', { a: joinList(items.slice(0, -1)), b: items[items.length - 1]! });
}

/** A bot state from the API ("running", "paused", …) in the UI language */
export function botStateLabel(state: string | undefined): string {
  if (!state) return '';
  return i18n.global.te(`botState.${state}`) ? t(`botState.${state}` as 'botState.running') : state;
}

/**
 * Translate a value that comes from the bot's API (order side, order type, exit reason)
 * when a message exists for it, otherwise show it as the bot sent it.
 */
export function apiText(namespace: 'orderSide' | 'orderType', value: string | undefined | null) {
  if (!value) return '';
  const key = `${namespace}.${value.toLowerCase()}`;
  return i18n.global.te(key) ? t(key as 'orderSide.buy') : value;
}

/** A backtest metric or setting name (see metricNames.ts) in the UI language */
export function metricLabel(name: string): string {
  if (!isRtl()) return name;
  if (name.endsWith(WALLET_SUFFIX)) {
    const base = name.slice(0, -WALLET_SUFFIX.length);
    return `${METRIC_NAMES_FA[base] ?? base}${WALLET_SUFFIX_FA}`;
  }
  return METRIC_NAMES_FA[name] ?? name;
}
