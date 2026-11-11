import { computed, ref } from 'vue'

export const APP_PAGES = ['nodes', 'subscriptions', 'more', 'routing', 'dns', 'settings', 'templates', 'maintenance', 'logs'] as const
export type AppPage = typeof APP_PAGES[number]

const PRIMARY_PAGES: AppPage[] = ['nodes', 'subscriptions', 'more']

export function isAppPage(value: unknown): value is AppPage {
  return typeof value === 'string' && (APP_PAGES as readonly string[]).includes(value)
}

export function isPrimaryPage(page: AppPage): boolean {
  return PRIMARY_PAGES.includes(page)
}

/** Secondary pages expose the floating glass Back button on touch layouts. */
export function isSecondaryPage(page: AppPage): boolean {
  return !isPrimaryPage(page)
}

function readHashPage(): AppPage {
  const raw = window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0]
  if (isAppPage(raw)) return raw
  if (raw === 'profiles') return 'nodes'
  if (raw === 'subs') return 'subscriptions'
  return 'nodes'
}

interface HistoryState {
  novaDepth?: number
  novaPage?: string
}

function stateDepth(): number {
  const depth = (window.history.state as HistoryState | null)?.novaDepth
  return typeof depth === 'number' && Number.isFinite(depth) && depth >= 0 ? depth : 0
}

/**
 * Hash router that owns one history entry per in-app page. Navigation is
 * guarded once, before either URL or application state changes. Browser Back
 * and manually edited hashes pass through the same guard, including the
 * restoration of the previous hash when a draft is kept.
 */
export function useAppRoute(options: {
  beforeNavigate?: (to: AppPage, from: AppPage) => boolean | Promise<boolean>
} = {}) {
  const currentPage = ref<AppPage>(readHashPage())
  const depth = ref(stateDepth())
  const navigationPending = ref(false)
  let guardToken = 0
  let externalScheduled = false

  // Always materialize a state record for the current entry so Back can tell an
  // in-app entry from a direct deep link opened in a fresh tab.
  window.history.replaceState(
    { ...(window.history.state as HistoryState | null), novaDepth: depth.value, novaPage: currentPage.value },
    '',
    `${window.location.pathname}${window.location.search}#/${currentPage.value}`,
  )

  const canGoBack = computed(() => depth.value > 0)

  function canonicalUrl(page: AppPage) {
    return `${window.location.pathname}${window.location.search}#/${page}`
  }

  function canonicalizeLocation() {
    if (window.location.hash === `#/${currentPage.value}`) return
    const state: HistoryState = { ...(window.history.state as HistoryState | null), novaDepth: depth.value, novaPage: currentPage.value }
    window.history.replaceState(state, '', canonicalUrl(currentPage.value))
  }

  function commit(page: AppPage, nextDepth: number, mode: 'push' | 'replace') {
    currentPage.value = page
    depth.value = Math.max(0, nextDepth)
    const state: HistoryState = { ...(window.history.state as HistoryState | null), novaDepth: depth.value, novaPage: page }
    const url = canonicalUrl(page)
    if (mode === 'replace') window.history.replaceState(state, '', url)
    else window.history.pushState(state, '', url)
  }

  async function navigate(page: AppPage, mode: 'push' | 'replace' = 'push'): Promise<boolean> {
    if (!isAppPage(page) || page === currentPage.value) return true
    if (navigationPending.value) return false
    const token = ++guardToken
    navigationPending.value = true
    try {
      if (options.beforeNavigate && !(await options.beforeNavigate(page, currentPage.value))) return false
      if (token !== guardToken) return false
      const nextDepth = mode === 'replace' ? depth.value : depth.value + 1
      commit(page, nextDepth, mode)
      return true
    } finally {
      if (token === guardToken) navigationPending.value = false
    }
  }

  /**
   * Back with a deterministic fallback. Deep-linked secondary pages have depth
   * 0 and therefore never send the browser out of the application.
   */
  async function goBack(fallback: AppPage = 'more'): Promise<void> {
    if (canGoBack.value && window.history.length > 1) {
      window.history.back()
      return
    }
    await navigate(fallback, 'replace')
  }

  async function acceptExternalLocation(): Promise<void> {
    const page = readHashPage()
    if (page === currentPage.value) {
      depth.value = stateDepth()
      canonicalizeLocation()
      return
    }
    const landedDepth = stateDepth()
    const token = ++guardToken
    navigationPending.value = true
    try {
      if (options.beforeNavigate && !(await options.beforeNavigate(page, currentPage.value))) {
        if (token !== guardToken) return
        // The URL moved before the guard answered. Return to our own history
        // entry instead of adding a duplicate: forward after Back, back after
        // Forward, and an in-place restore for manually edited hashes.
        if (landedDepth < depth.value) window.history.forward()
        else if (landedDepth > depth.value) window.history.back()
        else {
          window.history.replaceState(
            { ...(window.history.state as HistoryState | null), novaDepth: depth.value, novaPage: currentPage.value },
            '',
            `${window.location.pathname}${window.location.search}#/${currentPage.value}`,
          )
        }
        return
      }
      if (token !== guardToken) return
      currentPage.value = page
      depth.value = landedDepth
      canonicalizeLocation()
    } finally {
      if (token === guardToken) navigationPending.value = false
    }
  }

  function scheduleExternalLocation() {
    // A hash history move fires both popstate and hashchange. Coalesce them so
    // the unsaved-changes guard is asked exactly once per user action.
    if (externalScheduled) return
    externalScheduled = true
    queueMicrotask(() => {
      externalScheduled = false
      void acceptExternalLocation()
    })
  }

  function onPopState() { scheduleExternalLocation() }
  function onHashChange() {
    if (readHashPage() !== currentPage.value) scheduleExternalLocation()
    else depth.value = stateDepth()
  }

  window.addEventListener('popstate', onPopState)
  window.addEventListener('hashchange', onHashChange)

  function dispose() {
    window.removeEventListener('popstate', onPopState)
    window.removeEventListener('hashchange', onHashChange)
  }

  return { currentPage, depth, canGoBack, navigationPending, navigate, goBack, dispose, isSecondaryPage }
}
