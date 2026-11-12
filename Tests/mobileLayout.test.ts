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
  const [back, route, topbar] = await Promise.all([
    read('Shell/MobileBackButton.vue'),
    read('Composables/useAppRoute.ts'),
    read('Design/topbar.css'),
  ])
  assert.match(back, /v-if="visible"/)
  assert.match(back, /isSecondaryPage\(app\.route\.currentPage\.value\)/)
  assert.match(back, /app\.actions\.goBack\('more'\)/)
  assert.match(route, /window\.history\.back\(\)/)
  assert.match(route, /await navigate\(fallback, 'replace'\)/)
  assert.match(route, /if \(token !== guardToken\) return false/)
  // 48px floating button + 12px inset + a 12px gutter before the title copy.
  assert.match(topbar, /\.mobile-topbar\.has-back\s*\{[^}]*padding-left:\s*calc\(72px \+ var\(--nova-safe-left\)\)/)
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
  const [cards, routing, mobileCss] = await Promise.all([
    read('Features/Nodes/NodesMobileList.vue'),
    read('Features/Routing/RoutingRulesPanel.vue'),
    read('Design/mobile.css'),
  ])
  assert.match(cards, /class="mobile-card-check" @click\.stop/)
  assert.match(routing, /class="mobile-card-check" @click\.stop/)
  assert.match(mobileCss, /\.mobile-card-check \{[^}]*align-self: center/)
  assert.match(cards, /class="mobile-card-list nodes-mobile-list"/)
  assert.match(cards, /:class="\{ 'is-current': profile\.isCurrent, 'is-selected': state\.selectedIds\.includes\(profile\.indexId\) \}"/)
  // The card menu is the shared node context menu, so mobile gets the same
  // nested action groups as the desktop row menu instead of a flat copy.
  assert.match(cards, /@click\.stop="actions\.openContext\(\$event, profile\)"/)
  assert.match(cards, /@click="selectCard\(profile\)"/)
  assert.doesNotMatch(cards, /event\.detail/)
  assert.doesNotMatch(cards, /<ActionMenu/)
  assert.match(cards, /<UiCheckbox/)
  for (const action of ['openContext', 'selectProfile', 'toggleProfile', 'formatDelay', 'formatBytes']) {
    assert.ok(cards.includes(`actions.${action}`), `mobile card exposes ${action}`)
  }
  assert.match(cards, /@contextmenu\.prevent/)
})

test('the node toolbar leaves context-menu actions to the shared node menu on every viewport', async () => {
  const toolbar = await read('Features/Nodes/NodesToolbar.vue')
  assert.match(toolbar, /:items="toolbarTestItems"/)
  assert.match(toolbar, /id: 'test-group'[\s\S]*?id: 'sort-speed'/)
  // Every other test type, delay sorting, stopping a run, organizing and
  // sharing stay in the shared node context menu on desktop and mobile alike.
  assert.doesNotMatch(toolbar, /organizeItems|shareItems|isMobile|useMediaQuery/)
  for (const id of ['tcping', 'realping', 'speedtest', 'udpTest', 'fastRealping', 'mixedtest', 'sort-delay', 'stop-tests']) {
    assert.doesNotMatch(toolbar, new RegExp(`id: '${id}'`))
  }
})

test('mobile subscription cards keep the update action on the update line without a details disclosure', async () => {
  const page = await read('Pages/SubscriptionsPage.vue')
  assert.doesNotMatch(page, /subscription-details/)
  assert.match(page, /class="subscription-update-line"[\s\S]*?class="subscription-update-copy"[\s\S]*?subscription-update-button/)
  assert.match(page, /\.subscription-update-line\s*\{[^}]*justify-content:\s*space-between/)
  assert.match(page, /\.subscription-update-button\s*\{[^}]*flex:\s*0 0 auto/)
})

test('mobile routing cards reveal read-only details on tap and state reads as a chip', async () => {
  const panel = await read('Features/Routing/RoutingRulesPanel.vue')
  const mobileCard = panel.match(/<article[\s\S]*?<\/article>/)?.[0] || ''
  assert.match(panel, /const expandedRuleIds = ref<string\[\]>\(\[\]\)/)
  assert.match(panel, /function toggleRuleDetails\(id: string, event\?: MouseEvent\)/)
  assert.match(mobileCard, /@click="toggleRuleDetails\(rule\.id, \$event\)"/)
  assert.match(mobileCard, /:aria-expanded="isRuleExpanded\(rule\.id\)"/)
  assert.match(mobileCard, /:aria-controls="`rule-details-\$\{rule\.id\}`"/)
  // The detail grid only exists after the disclosure opens, and contains no
  // editable controls.
  assert.match(mobileCard, /v-if="isRuleExpanded\(rule\.id\)"[\s\S]*?class="meta-grid rule-meta"/)
  assert.doesNotMatch(mobileCard, /<(input|textarea|select)\b/)
  assert.doesNotMatch(mobileCard, /contenteditable/)
  // Status is always-readable text instead of a bare dot with a native title
  // tooltip (which never appears on touch devices).
  assert.match(mobileCard, /class="badge rule-status"/)
  assert.match(mobileCard, /t\('common\.disabled'\)[\s\S]*?t\('common\.enabled'\)/)
  assert.doesNotMatch(mobileCard, /status-dot/)
  assert.doesNotMatch(mobileCard, /:title="rule\.enabled/)
  assert.match(panel, /\.rule-card-chevron\s*\{[^}]*transition:/)
  assert.match(panel, /\.rule-card\.is-expanded \.rule-card-chevron\s*\{[^}]*rotate\(180deg\)/)
})
