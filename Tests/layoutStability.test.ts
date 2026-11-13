import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../Src/${path}`, import.meta.url), 'utf8')

test('background reads never insert a page-feedback banner between the toolbar and content', async () => {
  const feedback = await read('Components/Material/PageFeedback.vue')
  assert.match(feedback, /status\.error/)
  assert.match(feedback, /errorFromWrite/)
  assert.match(feedback, /showNotice\(message, 'error'\)/)
  assert.doesNotMatch(feedback, /class="page-feedback"/)
  assert.doesNotMatch(feedback, /status\.reads|status\.writes/)
})

test('the routing profiles pane stretches to the rules pane height', async () => {
  const [page, panel] = await Promise.all([
    read('Pages/RoutingPage.vue'),
    read('Features/Routing/RoutingProfilesPanel.vue'),
  ])
  assert.match(page, /\.routing-workspace\s*\{[^}]*align-items:\s*stretch/)
  assert.match(panel, /@media \(min-width: 1101px\)\s*\{\s*\.route-list\s*\{[^}]*flex:\s*1 1 auto[^}]*max-height:\s*none/)
})

test('selection counts stay on the select-all badge instead of in the layout', async () => {
  const [logs, routing, profiles, nodes, nodesPage] = await Promise.all([
    read('Features/Logs/LogsList.vue'),
    read('Features/Routing/RoutingRulesPanel.vue'),
    read('Features/Routing/RoutingProfilesPanel.vue'),
    read('Features/Nodes/NodesTable.vue'),
    read('Pages/NodesPage.vue'),
  ])
  for (const file of [logs, routing, profiles, nodes]) {
    assert.match(file, /class="selection-check"/)
    assert.match(file, /class="selection-count"/)
  }
  assert.doesNotMatch(logs, /selection-summary|clearSelection/)
  assert.doesNotMatch(nodesPage, /bulk-count|clearSelection/)
  assert.doesNotMatch(routing, /class="selection-count">\{\{\s*t\('common\.selected/)
  assert.doesNotMatch(profiles, /<small v-if="state\.selectedRouteIds\.length"/)
})

test('toolbar actions fill the toolbar so they stay right-aligned at wide widths', async () => {
  const collections = await read('Design/collections.css')
  assert.match(collections, /\.page-toolbar \.toolbar-actions\s*\{[^}]*flex:\s*1 1 auto/)
  assert.match(collections, /\.page-toolbar \.toolbar-actions\s*\{[^}]*justify-content:\s*flex-end/)
})

test('sticky action shadows only appear while the table hides content', async () => {
  const [collections, nodes, subscriptions, routing, directive] = await Promise.all([
    read('Design/collections.css'),
    read('Features/Nodes/NodesTable.vue'),
    read('Pages/SubscriptionsPage.vue'),
    read('Features/Routing/RoutingRulesPanel.vue'),
    read('UI/scrollShadow.ts'),
  ])
  assert.match(collections, /\.table-shell\.sticky-actions\.is-scrollable-x:not\(\.is-scroll-end\)[^{]*\{[^}]*box-shadow/)
  assert.doesNotMatch(collections, /\.table-shell\.sticky-actions \.data-table (?:th|td)\.cell-actions\s*\{[^}]*box-shadow/)
  assert.match(nodes, /is-scrollable-x:not\(\.is-scroll-end\)[\s\S]*?box-shadow/)
  for (const file of [nodes, subscriptions, routing]) {
    assert.match(file, /v-scroll-shadow/)
  }
  assert.match(directive, /classList\.toggle\('is-scrollable-x'/)
  assert.match(directive, /classList\.toggle\('is-scroll-end'/)
})

test('the routing rules pane keeps a stable height while switching rule sets', async () => {
  const routing = await read('Features/Routing/RoutingRulesPanel.vue')
  assert.match(routing, /\.rules-table-shell\s*\{[^}]*height:\s*clamp\(/)
  assert.doesNotMatch(routing, /\.rules-table-shell\s*\{[^}]*max-height/)
})

test('DNS suggestion menus align with the field, not its trailing icon', async () => {
  const field = await read('Features/Dns/FormField.vue')
  assert.match(field, /closest\('md-outlined-text-field'\)/)
  assert.match(field, /const width = Math\.max\(anchor\.width, 200\)/)
})

test('primary tables budget the shell chrome instead of a fixed cap', async () => {
  const nodes = await read('Features/Nodes/NodesTable.vue')
  assert.match(nodes, /max-height:\s*max\(320px,\s*calc\(100dvh - 268px\)\)/)
  assert.doesNotMatch(nodes, /min\(68dvh,\s*820px\)/)
})

test('the sidebar status is a passive status region', async () => {
  const [sidebar, css] = await Promise.all([
    read('Shell/DesktopSidebar.vue'),
    read('Design/sidebar.css'),
  ])
  assert.match(sidebar, /class="sidebar-status"\s+role="status"/)
  assert.doesNotMatch(sidebar, /sidebar-status-arrow|@click="state\.showCorePanel/)
  assert.doesNotMatch(css, /\.sidebar-status:hover/)
})

test('table truncation stays in an inner wrapper so hidden columns keep row borders', async () => {
  const [nodes, subscriptions] = await Promise.all([
    read('Features/Nodes/NodesTable.vue'),
    read('Pages/SubscriptionsPage.vue'),
  ])
  assert.match(nodes, /\.name-cell-inner\s*\{[^}]*max-width:\s*280px/)
  assert.doesNotMatch(nodes, /\.name-cell\s*\{[^}]*max-width/)
  assert.match(subscriptions, /\.sub-remarks-main\s*\{[^}]*text-overflow:\s*ellipsis/)
  assert.match(subscriptions, /\.sub-updated > span\s*\{[^}]*text-overflow:\s*ellipsis/)
})

test('field selects bottom-align with labeled inputs', async () => {
  const fields = await read('Design/fields.css')
  assert.match(fields, /\.field-row\s*>\s*\.ui-select\s*\{[^}]*align-self:\s*end/)
})

test('view controls precede the search and primary actions', async () => {
  const [nodes, subscriptions] = await Promise.all([
    read('Features/Nodes/NodesToolbar.vue'),
    read('Pages/SubscriptionsPage.vue'),
  ])
  const locate = nodes.indexOf("t('polish.locateCurrent')")
  const columns = nodes.indexOf("t('nodes.columnSettings')")
  const search = nodes.indexOf('class="search-field nodes-search"')
  const add = nodes.indexOf("t('nodes.addMenu')")
  assert.ok(locate >= 0 && columns > locate && search > columns && add > search)
  const subColumns = subscriptions.indexOf("t('subscriptions.columnSettings')")
  const proxy = subscriptions.indexOf('class="check proxy-toggle"')
  const subAdd = subscriptions.indexOf("t('subscriptions.addSubscription')")
  assert.ok(subColumns >= 0 && proxy > subColumns && subAdd > proxy)
})
