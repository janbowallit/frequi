/** Tracks when a GridLayout has placed its items, with a fallback in case the event is missed. */
export function useGridReady(fallbackMs = 800) {
  const isReady = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function onLayoutReady() {
    // Wait one frame so items have their final position before showing them
    requestAnimationFrame(() => {
      isReady.value = true;
    });
  }

  onMounted(() => {
    timer = setTimeout(() => {
      isReady.value = true;
    }, fallbackMs);
  });
  onBeforeUnmount(() => clearTimeout(timer));

  return { isReady, onLayoutReady };
}
