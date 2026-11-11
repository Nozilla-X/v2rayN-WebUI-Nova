import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/** Reactive matchMedia with listener cleanup; safe in non-browser test shims. */
export function useMediaQuery(query: string): Ref<boolean> {
  const media = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(query)
    : null
  const matches = ref(Boolean(media?.matches))
  function update() { matches.value = Boolean(media?.matches) }
  onMounted(() => media?.addEventListener('change', update))
  onUnmounted(() => media?.removeEventListener('change', update))
  return matches
}
