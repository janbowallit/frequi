import type { MaybeRefOrGetter } from 'vue';

/**
 * For a horizontally scrolling UTabs list: fades the edges that still hide tabs, so it's clear
 * there is more to scroll to, and keeps the active tab in view when it changes.
 * Pass the UTabs component ref and the v-model value; put `fadeClass` on the `list` slot class.
 */
export function useTabOverflow(
  tabs: MaybeRefOrGetter<object | null | undefined>,
  active: MaybeRefOrGetter<unknown>,
) {
  const list = computed<HTMLElement | null>(() => {
    // UTabs' exposed type only lists triggersRef, but every component instance has $el
    const root = (toValue(tabs) as { $el?: unknown } | null | undefined)?.$el;
    return root instanceof HTMLElement ? root.querySelector('[role="tablist"]') : null;
  });
  const { arrivedState, measure } = useScroll(list);
  const overflows = ref(false);

  useResizeObserver(list, () => {
    const el = list.value;
    overflows.value = !!el && el.scrollWidth > el.clientWidth + 1;
    measure();
  });

  const fadeClass = computed(() =>
    overflows.value
      ? [
          !arrivedState.left && 'mask-l-from-[calc(100%-3rem)]',
          !arrivedState.right && 'mask-r-from-[calc(100%-3rem)]',
        ]
          .filter(Boolean)
          .join(' ')
      : '',
  );

  watch(
    () => toValue(active),
    async () => {
      await nextTick();
      list.value
        ?.querySelector('[data-state="active"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    },
    { flush: 'post' },
  );

  return { fadeClass };
}
