import assert from 'node:assert/strict'
import test from 'node:test'
import { createSourceHarness } from './helpers/loadSource.ts'
import { isPrimaryPage, isSecondaryPage } from '../Src/Composables/useAppRoute.ts'

function installBrowser(t, initialHash = '') {
  const entries = [{ state: null, hash: initialHash }]
  let index = 0
  const listeners = new Map()
  const path = '/nova/'
  const search = '?embed=1'
  const location = {
    pathname: path,
    search,
    hash: initialHash,
  }
  function apply(entry) {
    location.hash = entry.hash
  }
  function urlHash(url) {
    return String(url).includes('#') ? `#${String(url).split('#')[1]}` : location.hash
  }
  const history = {
    get state() { return entries[index].state },
    get length() { return entries.length },
    replaceState(state, _title, url) {
      entries[index] = { state, hash: urlHash(url) }
      apply(entries[index])
    },
    pushState(state, _title, url) {
      entries.splice(index + 1)
      entries.push({ state, hash: urlHash(url) })
      index += 1
      apply(entries[index])
    },
    back() {
      if (index === 0) return
      index -= 1
      apply(entries[index])
      emit('popstate')
    },
    forward() {
      if (index >= entries.length - 1) return
      index += 1
      apply(entries[index])
      emit('popstate')
    },
    go(delta) {
      index = Math.max(0, Math.min(entries.length - 1, index + delta))
      apply(entries[index])
      emit('popstate')
    },
  }
  function emit(name) {
    for (const handler of listeners.get(name) || []) handler({ type: name })
    if (name === 'popstate') for (const handler of listeners.get('hashchange') || []) handler({ type: 'hashchange' })
  }
  const testWindow = {
    location,
    history,
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name).add(handler)
    },
    removeEventListener(name, handler) {
      listeners.get(name)?.delete(handler)
    },
  }
  const previous = globalThis.window
  globalThis.window = testWindow
  t.after(() => {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  })
  return {
    location,
    history,
    entries,
    view: () => ({ index, length: entries.length }),
    setHash(hash) {
      location.hash = hash
      emit('popstate')
    },
    dispatch(name) { emit(name) },
  }
}

function loadRouter(t, beforeNavigate) {
  const harness = createSourceHarness()
  const { useAppRoute } = harness.loadSource('Src/Composables/useAppRoute.ts')
  const router = harness.setup(() => useAppRoute({ beforeNavigate }))
  t.after(() => harness.dispose())
  return { harness, router }
}

const flush = () => new Promise((resolve) => setImmediate(resolve))

test('deep links start at depth zero and Back uses an in-app fallback instead of leaving the app', async (t) => {
  const browser = installBrowser(t, '#/settings')
  const { router } = loadRouter(t)
  assert.equal(router.currentPage.value, 'settings')
  assert.equal(router.depth.value, 0)
  assert.equal(router.canGoBack.value, false)
  assert.equal(browser.location.hash, '#/settings')

  await router.goBack()
  assert.equal(router.currentPage.value, 'more')
  assert.equal(router.depth.value, 0)
  assert.equal(browser.location.hash, '#/more')
})

test('in-app navigation owns one history entry per page and Back restores the previous page', async (t) => {
  const browser = installBrowser(t, '#/nodes')
  const { router } = loadRouter(t)
  assert.equal(router.currentPage.value, 'nodes')

  assert.equal(await router.navigate('routing'), true)
  assert.equal(await router.navigate('dns'), true)
  assert.equal(router.depth.value, 2)
  assert.equal(browser.location.hash, '#/dns')
  assert.equal(router.canGoBack.value, true)

  await router.goBack()
  await flush()
  assert.equal(router.currentPage.value, 'routing')
  assert.equal(router.depth.value, 1)
  assert.equal(browser.location.hash, '#/routing')

  await router.goBack()
  await flush()
  assert.equal(router.currentPage.value, 'nodes')
  assert.equal(router.depth.value, 0)
})

test('a rejected navigation restores the previous URL and asks the guard once per Back action', async (t) => {
  const browser = installBrowser(t, '#/nodes')
  let questions = 0
  const { router } = loadRouter(t, async (to) => {
    questions += 1
    return to !== 'settings'
  })
  await router.navigate('subscriptions')
  await flush()
  questions = 0

  browser.setHash('#/settings')
  await flush()
  await flush()
  assert.equal(questions, 1, 'popstate and hashchange share one guard evaluation')
  assert.equal(router.currentPage.value, 'subscriptions')
  assert.equal(browser.location.hash, '#/subscriptions')
  assert.equal(router.depth.value, 1)

  browser.setHash('#/routing')
  await flush()
  assert.equal(questions, 2)
  assert.equal(router.currentPage.value, 'routing')
})

test('manual hash edits and hash aliases resolve to a canonical page', async (t) => {
  const browser = installBrowser(t, '#/profiles')
  const { router } = loadRouter(t)
  assert.equal(router.currentPage.value, 'nodes')
  assert.equal(browser.location.hash, '#/nodes')

  browser.setHash('#/subs')
  await flush()
  assert.equal(router.currentPage.value, 'subscriptions')
  assert.equal(browser.location.hash, '#/subscriptions')

  browser.setHash('#/not-a-page')
  await flush()
  assert.equal(router.currentPage.value, 'nodes')
  assert.equal(browser.location.hash, '#/nodes')
})

test('only the three mobile destinations are primary pages', () => {
  assert.equal(isPrimaryPage('nodes'), true)
  assert.equal(isPrimaryPage('subscriptions'), true)
  assert.equal(isPrimaryPage('more'), true)
  for (const page of ['routing', 'dns', 'settings', 'templates', 'maintenance', 'logs']) {
    assert.equal(isPrimaryPage(page), false)
    assert.equal(isSecondaryPage(page), true)
  }
})
