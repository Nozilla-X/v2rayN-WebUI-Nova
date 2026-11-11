import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../Src/${path}`, import.meta.url), 'utf8')

test('background reads never insert a page-feedback banner between the toolbar and content', async () => {
  const feedback = await read('Components/Material/PageFeedback.vue')
  assert.match(feedback, /v-if="status\.error"/)
  assert.doesNotMatch(feedback, /status\.reads|status\.writes/)
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
