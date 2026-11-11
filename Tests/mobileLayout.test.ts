import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../Src/${path}`, import.meta.url), 'utf8')

test('mobile navigation exposes exactly the three primary destinations and keeps the rest in More', async () => {
  const navigation = await read('Shell/navigation.ts')
  const tabs = navigation.match(/MOBILE_TABS[^=]*=\s*\[([\s\S]*?)\]/)?.[1] || ''
  assert.deepEqual([...tabs.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]), ['nodes', 'subscriptions', 'more'])

  const moreGroups = navigation.match(/MORE_GROUPS[^=]*=\s*\[([\s\S]*?)\n\]\n/)?.[1] || ''
  for (const destination of ['routing', 'dns', 'settings', 'templates', 'maintenance', 'logs']) {
    assert.ok(moreGroups.includes(`id: '${destination}'`), `More links to ${destination}`)
  }
  assert.ok(!moreGroups.includes("id: 'more'"), 'More never links to itself')
})

test('the mobile tab bar is a floating glass surface with safe-area padding and three equal tabs', async () => {
  const tabs = await read('Shell/MobileTabBar.vue')
  const glass = await read('Design/glass.css')
  assert.match(tabs, /class="mobile-tab-bar glass-surface"/)
  assert.equal([...tabs.matchAll(/v-for="item in MOBILE_TABS"/g)].length, 1)
  assert.match(tabs, /:style="\{ '--tab-offset': `\$\{activeIndex \* 100\}%` \}"/)
  assert.match(tabs, /isPrimaryPage\(route\.currentPage\.value\) \? route\.currentPage\.value : 'more'/)
  assert.match(glass, /\.mobile-tab-bar\s*\{[^}]*position: fixed/)
  assert.match(glass, /bottom: calc\(var\(--nova-space-2\) \+ var\(--nova-safe-bottom\)\)/)
  assert.match(glass, /left: max\(var\(--nova-space-3\), var\(--nova-safe-left\)\)/)
  assert.match(glass, /width: calc\(\(100% - 12px\) \/ 3\)/)
  assert.match(glass, /@media \(max-width: 860px\)\s*\{[\s\S]*?\.mobile-tab-bar \{\s*display: flex/)
})

test('the floating Back button appears only on secondary pages and delegates to guarded in-app history', async () => {
  const back = await read('Shell/MobileBackButton.vue')
  const route = await read('Composables/useAppRoute.ts')
  assert.match(back, /v-if="visible"/)
  assert.match(back, /isSecondaryPage\(app\.route\.currentPage\.value\)/)
  assert.match(back, /app\.actions\.goBack\('more'\)/)
  assert.match(route, /window\.history\.back\(\)/)
  assert.match(route, /await navigate\(fallback, 'replace'\)/)
  assert.match(route, /if \(token !== guardToken\) return false/)
})

test('desktop keeps a rail/drawer while mobile hides it and uses the floating bars', async () => {
  const shell = await read('Shell/AppShell.vue')
  const sidebar = await read('Design/sidebar.css')
  const mobile = await read('Design/mobile.css')
  assert.match(shell, /<DesktopSidebar :railed="railed" @toggle-rail="toggleRail" \/>/)
  assert.match(shell, /<MobileTabBar \/>/)
  assert.match(shell, /<MobileBackButton \/>/)
  assert.match(sidebar, /\.desktop-sidebar\s*\{[^}]*height: 100dvh/)
  assert.match(sidebar, /@media \(max-width: 860px\)\s*\{\s*\.desktop-sidebar \{\s*display: none/)
  assert.match(mobile, /@media \(min-width: 861px\)\s*\{\s*\.mobile-only \{\s*display: none !important/)
  assert.match(mobile, /@media \(max-width: 860px\)\s*\{\s*\.desktop-only \{\s*display: none !important/)
  assert.doesNotMatch(mobile, /\.mobile-only \{\s*display: revert/)
})

test('mobile node cards keep selection, current state and the full action set', async () => {
  const cards = await read('Features/Nodes/NodesMobileList.vue')
  assert.match(cards, /class="mobile-card-list nodes-mobile-list"/)
  assert.match(cards, /:class="\{ 'is-current': profile\.isCurrent, 'is-selected': state\.selectedIds\.includes\(profile\.indexId\) \}"/)
  assert.match(cards, /<ActionMenu/)
  assert.match(cards, /<UiCheckbox/)
  for (const action of ['selectProfile', 'startSpeedTest', 'runProfileAction', 'formatDelay', 'formatBytes']) {
    assert.ok(cards.includes(`actions.${action}`), `mobile card exposes ${action}`)
  }
  assert.match(cards, /id: 'edit'|t\('common\.edit'\)/)
  assert.match(cards, /@contextmenu\.prevent/)
})
