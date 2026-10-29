const STORE_UI_COLORS = 'ftUIColorSettings';

export enum ColorPreferences {
  GREEN_UP = 'greenUp',
  RED_UP = 'redUp',
}

// Candle colors work on both themes; profit / loss follow the theme (see tailwind.css)
const CANDLE_GREEN = '#2fb383';
const CANDLE_RED = '#e5604f';
const MONEY_COLORS = {
  dark: { profit: '#34d399', loss: '#f87171' },
  light: { profit: '#047857', loss: '#b91c1c' },
};

export const useColorStore = defineStore('colorStore', {
  state: () => {
    return {
      colorPreference: ColorPreferences.GREEN_UP,
      colorUp: CANDLE_GREEN,
      colorDown: CANDLE_RED,
    };
  },
  getters: {
    colorProfit(): string {
      return MONEY_COLORS[useSettingsStore().currentTheme === 'light' ? 'light' : 'dark'].profit;
    },
    colorLoss(): string {
      return MONEY_COLORS[useSettingsStore().currentTheme === 'light' ? 'light' : 'dark'].loss;
    },
  },
  actions: {
    updateProfitLossColor() {
      const [colorUp, colorDown] =
        this.colorPreference === ColorPreferences.GREEN_UP
          ? [CANDLE_GREEN, CANDLE_RED]
          : [CANDLE_RED, CANDLE_GREEN];
      this.colorUp = colorUp;
      this.colorDown = colorDown;
    },
  },
  persist: {
    key: STORE_UI_COLORS,
    pick: ['colorPreference'],
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useColorStore, import.meta.hot));
}
