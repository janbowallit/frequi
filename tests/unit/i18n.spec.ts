import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en';
import fa from '@/i18n/locales/fa';
import { i18n, ltr, metricLabel } from '@/i18n';
import { formatPercent } from '@/utils/formatters/numberformat';
import { timestampms } from '@/utils/formatters/timeformat';

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ''): Record<string, string> {
  return Object.entries(messages).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(vue|ts)$/.test(name) && !name.endsWith('.d.ts') ? [path] : [];
  });
}

/** `{name}` placeholders of every plural form */
function placeholders(message: string): string[] {
  return [...new Set([...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))].sort();
}

const enFlat = flatten(en as Messages);
const faFlat = flatten(fa as Messages);

describe('i18n messages', () => {
  it('every key used in the source exists in English', () => {
    const srcDir = resolve(__dirname, '../../src');
    const keyPattern =
      /(?:\$t|(?<![\w.$])t|\bte)\(\s*'([\w.]+)'|keypath="'?([\w.]+)'?"|source: '([\w.]+)'/g;
    const missing: string[] = [];
    for (const file of sourceFiles(srcDir)) {
      if (file.includes('/i18n/locales/')) continue;
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(keyPattern)) {
        const key = m[1] ?? m[2] ?? m[3]!;
        // Only dotted paths are message keys (skips e.g. t('x') helpers in other contexts)
        if (key.includes('.') && !(key in enFlat)) missing.push(`${key} (${file})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('Persian has the same keys and placeholders as English', () => {
    expect(Object.keys(faFlat).sort()).toEqual(Object.keys(enFlat).sort());
    const mismatched = Object.keys(enFlat).filter(
      (key) => placeholders(enFlat[key]!).join() !== placeholders(faFlat[key] ?? '').join(),
    );
    expect(mismatched).toEqual([]);
  });

  it('plural messages keep the same number of forms', () => {
    const forms = (s: string) => s.split(' | ').length;
    const mismatched = Object.keys(enFlat).filter(
      (key) => forms(enFlat[key]!) !== forms(faFlat[key] ?? ''),
    );
    expect(mismatched).toEqual([]);
  });

  it('Persian keeps prices in Latin digits, in left-to-right order', () => {
    i18n.global.locale.value = 'fa';
    try {
      expect(formatPercent(-0.0072, 2)).toEqual('⁦-0.72%⁩');
      expect(ltr('+1.5%')).toEqual('⁦+1.5%⁩');
      expect(metricLabel('Sharpe (wallet balance)')).toEqual('نسبت شارپ (موجودی کیف پول)');
      // 2026-10-29 00:00 UTC is 7 Aban 1405
      expect(timestampms(Date.UTC(2026, 9, 29, 0, 0, 0))).toEqual('⁦1405/08/07 00:00:00⁩');
    } finally {
      i18n.global.locale.value = 'en';
    }
    expect(formatPercent(-0.0072, 2)).toEqual('-0.72%');
  });
});
