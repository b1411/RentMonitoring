/**
 * Resolves a plan image's natural aspect ratio (as a CSS `aspect-ratio` string)
 * so the canvas matches the uploaded image instead of forcing it into a square.
 * Keeps polygon fractions aligned with the plan on any image shape.
 */
export function usePlanAspect(url: () => string | undefined) {
  const aspect = ref('1 / 1');

  function load(u?: string) {
    if (!import.meta.client || !u) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        aspect.value = `${img.naturalWidth} / ${img.naturalHeight}`;
      }
    };
    img.src = u;
  }

  onMounted(() => load(url()));
  watch(url, (u) => load(u));

  return aspect;
}
