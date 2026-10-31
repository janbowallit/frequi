import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ColorPreferences, useColorStore } from '@/stores/colors';
import { useSettingsStore } from '@/stores/settings';

/** WCAG contrast ratio of two #rrggbb colors */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const PAGE = { light: '#ffffff', dark: '#18181b' };

describe('color store text colors for up / down', () => {
  beforeEach(() => setActivePinia(createPinia()));

  for (const theme of ['light', 'dark'] as const) {
    it(`are readable as text in the ${theme} theme`, () => {
      useSettingsStore().currentTheme = theme;
      const colors = useColorStore();
      expect(contrast(colors.textUp, PAGE[theme])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.textDown, PAGE[theme])).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('follow the red-up preference', () => {
    useSettingsStore().currentTheme = 'light';
    const colors = useColorStore();
    const greenUp = colors.textUp;
    colors.colorPreference = ColorPreferences.RED_UP;
    expect(colors.textDown).toBe(greenUp);
    expect(colors.textUp).not.toBe(greenUp);
  });
});
