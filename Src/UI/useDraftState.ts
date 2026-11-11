import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { usePageRequests } from './useUiRequests'

/** Presentation-only baselines. Values/forms remain owned by the business Composables. */
export function useDraftState(scope: string, snapshot: () => Record<string, unknown>, canonicalRefs: () => unknown, writeKeys: (path: string) => string[]) {
  const { requests, status, run } = usePageRequests(scope)
  const serialize = () => Object.fromEntries(Object.entries(snapshot()).map(([key, value]) => [key, JSON.stringify(value)]))
  const baseline = ref<Record<string, string>>(serialize())
  const pending = new Map<number, Record<string, string>>()
  const dirtyKeys = computed(() => Object.entries(serialize()).filter(([key, value]) => value !== baseline.value[key]).map(([key]) => key))
  const dirty = computed(() => dirtyKeys.value.length > 0)
  // Track reads so a hydrated form is only declared dirty when its snapshot
  // actually differs from the server value. Without this, a page mounted before
  // its first load reports every freshly populated field as unsaved and asks
  // the user to discard changes they never made.
  let readStart: { baseline: Record<string, string>; values: Record<string, string> } | null = null
  watch(() => status.reads, async (reads, previous) => {
    if (reads > 0 && previous === 0) {
      readStart = { baseline: { ...baseline.value }, values: serialize() }
      return
    }
    if (reads !== 0 || previous === 0) return
    const started = readStart
    readStart = null
    if (!started) return
    await nextTick()
    const values = serialize()
    for (const key of Object.keys(values)) {
      // Only sections that were pristine when the read began may adopt the
      // newly hydrated value. A section the user edited before or during the
      // request keeps its own baseline and therefore keeps warning.
      if (started.baseline[key] !== started.values[key]) continue
      if (baseline.value[key] !== started.baseline[key]) continue
      baseline.value[key] = values[key]
    }
  }, { flush: 'post' })
  // Replacement by a canonical load/save is different from editing fields in place.
  watch(canonicalRefs, (next, previous) => {
    const values = serialize()
    if (next && typeof next === 'object' && !Array.isArray(next)) {
      const refs = next as Record<string, unknown>
      const old = (previous || {}) as Record<string, unknown>
      for (const key of Object.keys(refs)) if (refs[key] !== old[key]) baseline.value[key] = values[key]
    } else baseline.value = values
  }, { flush: 'post' })
  watch(() => status.started, started => {
    if (!started) return
    pending.set(started.id, serialize())
    if (pending.size > 16) pending.delete(pending.keys().next().value!)
  }, { flush: 'sync' })
  watch(() => status.committed, committed => {
    if (!committed) return
    const submitted = pending.get(committed.id)
    if (submitted) for (const key of writeKeys(committed.path)) baseline.value[key] = submitted[key]
    pending.delete(committed.id)
  }, { flush: 'post' })
  requests?.drafts.set(scope, () => dirty.value)
  onUnmounted(() => requests?.drafts.delete(scope))
  async function allowDiscard(message: string) { return !dirty.value || !requests || await requests.confirm(message) }
  return { dirty, dirtyKeys, status, allowDiscard, run }
}
