import ValuePair from '@/components/general/ValuePair.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

describe('ValuePair.vue', () => {
  it('Renders a message', async () => {
    const msg = 'Test description';
    const wrapper = mount(ValuePair, { props: { description: msg } });
    expect(wrapper.text()).toContain(msg);
  });
});
