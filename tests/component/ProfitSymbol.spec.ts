import ProfitSymbol from '@/components/general/ProfitSymbol.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

describe('ProfitSymbol.vue', () => {
  it('calculates isProfitable with negative profit', () => {
    const wrapper = mount(ProfitSymbol, { props: { profit: -0.5 } });
    expect(wrapper.classes()).toContain('text-loss');
    expect(wrapper.classes()).toContain('rotate-180');
    expect(wrapper.classes()).not.toContain('text-profit');
  });

  it('calculates isProfitable with positive profit', () => {
    const wrapper = mount(ProfitSymbol, { props: { profit: 0.5 } });
    expect(wrapper.classes()).toContain('text-profit');
    expect(wrapper.classes()).not.toContain('rotate-180');
    expect(wrapper.classes()).not.toContain('text-loss');
  });
});
