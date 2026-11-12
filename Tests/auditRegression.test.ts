import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../Src/${path}`, import.meta.url), 'utf8')
const locale = async (name) => JSON.parse(await read(`Locales/${name}.json`))
const locales = () => Promise.all(['zh-CN', 'zh-TW', 'en-US'].map(locale))

test('the current-node marker does not shift the alias column', async () => {
  const [nodes, collections] = await Promise.all([
    read('Features/Nodes/NodesTable.vue'),
    read('Design/collections.css'),
  ])
  assert.match(nodes, /\.name-cell\s*\{[^}]*position:\s*relative/)
  assert.match(nodes, /\.name-cell\s*\{[^}]*padding-inline-end:\s*calc\(/)
  assert.match(nodes, /\.current-marker\s*\{[^}]*position:\s*absolute/)
  assert.match(nodes, /\.current-marker\s*\{[^}]*inset-inline-end:/)
  assert.doesNotMatch(nodes, /th\.cell-actions\s*\{[^}]*text-align:\s*center/)
  assert.match(collections, /\.data-table \.cell-actions\s*\{[^}]*text-align:\s*right/)
})

test('tablet templates keep the two-by-two field arrangement', async () => {
  const editor = await read('Features/Templates/TemplateEditor.vue')
  assert.match(editor, /@media \(min-width: 701px\) and \(max-width: 1200px\)/)
  assert.match(editor, /\.template-fields\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
})

test('password reveal controls are localized', async () => {
  const [field, zhCN, zhTW, en] = await Promise.all([
    read('Components/Material/UiTextField.vue'),
    locale('zh-CN'),
    locale('zh-TW'),
    locale('en-US'),
  ])
  assert.match(field, /from 'vue-i18n'/)
  assert.match(field, /t\('common\.showPassword'\)/)
  assert.match(field, /t\('common\.hidePassword'\)/)
  assert.doesNotMatch(field, /'Show password'|'Hide password'/)
  assert.deepEqual(
    [zhCN.common.showPassword, zhCN.common.hidePassword, zhTW.common.showPassword, zhTW.common.hidePassword, en.common.showPassword, en.common.hidePassword],
    ['显示密码', '隐藏密码', '顯示密碼', '隱藏密碼', 'Show password', 'Hide password'],
  )
})

test('DNS endpoint fields are wide enough for DoH URLs and the core strategy select rebuilds with its options', async () => {
  const [panel, profile] = await Promise.all([
    read('Features/Dns/SimpleDnsPanel.vue'),
    read('Features/Dns/CoreDnsProfile.vue'),
  ])
  assert.match(panel, /grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 300px\), 1fr\)\)/)
  assert.match(profile, /<UiSelect[\s\S]*?:key="`\$\{coreType\}:\$\{strategies\.join\('\|'\)\}`"/)
})

test('routing rules keep their columns readable and label the mobile state correctly', async () => {
  const [panel, zhCN, zhTW, en] = await Promise.all([
    read('Features/Routing/RoutingRulesPanel.vue'),
    locale('zh-CN'),
    locale('zh-TW'),
    locale('en-US'),
  ])
  assert.match(panel, /container-type:\s*inline-size/)
  assert.match(panel, /@container \(max-width: 1400px\)[\s\S]*?position:\s*static/)
  // Mobile status is a visible chip, not a bare dot relying on a tooltip.
  assert.match(panel, /class="badge rule-status"/)
  assert.match(panel, /t\('common\.disabled'\)/)
  assert.match(panel, /t\('common\.enabled'\)/)
  assert.doesNotMatch(panel, /t\('routing\.enabled'\)/)
  assert.deepEqual([zhCN.common.enabled, zhTW.common.enabled, en.common.enabled], ['启用', '啟用', 'Enabled'])
  assert.deepEqual([zhCN.common.disabled, zhTW.common.disabled, en.common.disabled], ['停用', '停用', 'Disabled'])
})

test('the desktop navigation landmark and import fields use distinct localized labels', async () => {
  const [sidebar, raw, zhCN, zhTW, en] = await Promise.all([
    read('Shell/DesktopSidebar.vue'),
    read('Features/Routing/RoutingRawEditor.vue'),
    locale('zh-CN'),
    locale('zh-TW'),
    locale('en-US'),
  ])
  assert.match(sidebar, /:aria-label="t\('nav\.primary'\)"/)
  assert.match(raw, /t\('routing\.importRulesLabel'\)/)
  assert.doesNotMatch(raw, /<span class="field-label">\{\{ t\('routing\.importRules'\) \}\}/)
  assert.deepEqual([zhCN.routing.importRulesLabel, zhTW.routing.importRulesLabel, en.routing.importRulesLabel], ['待导入的规则 JSON', '待匯入的規則 JSON', 'Rules JSON to import'])
  assert.deepEqual([zhCN.routing.importRulesLabel !== zhCN.routing.importRules, zhTW.routing.importRulesLabel !== zhTW.routing.importRules, en.routing.importRulesLabel !== en.routing.importRules], [true, true, true])
})

test('mobile node delay states do not append a unit to localized status text', async () => {
  const mobile = await read('Features/Nodes/NodesMobileList.vue')
  assert.match(mobile, /\{\{ actions\.formatDelay\(profile\.delay\) \}\}<template v-if="profile\.delay > 0"> ms<\/template>/)
  assert.doesNotMatch(mobile, /\{\{ actions\.formatDelay\(profile\.delay\) \}\} ms/)
})

test('subscriptions truncate inside their cells instead of clipping at the cell edge', async () => {
  const page = await read('Pages/SubscriptionsPage.vue')
  assert.match(page, /\.sub-remarks \{[^}]*min-width:\s*0/)
  assert.match(page, /\.sub-remarks-main \{[^}]*min-width:\s*0[^}]*text-overflow:\s*ellipsis/)
  assert.match(page, /\.sub-updated \{[^}]*min-width:\s*0/)
  assert.match(page, /\.sub-updated > span \{[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/)
  assert.match(page, /<span :title="updatedText\(item\)">/)
})

test('menus never animate their measured min-width and routing page actions share one height', async () => {
  const [overlays, routing] = await Promise.all([
    read('Design/overlays.css'),
    read('Pages/RoutingPage.vue'),
  ])
  assert.match(overlays, /\.menu-popup\s*\{[^}]*transition:\s*none/)
  assert.match(routing, /\.page-actions :deep\(\.action-menu-trigger\)/)
  assert.match(routing, /\.page-actions :deep\(\.action-menu-trigger\.is-icon-only\)/)
  assert.match(routing, /min-height:\s*var\(--nova-control-height-comfortable\)/)
})

test('inbound settings do not repeat the disclosure title and English transport settings stay distinct', async () => {
  const [inbound, zhCN, zhTW, en] = await Promise.all([
    read('Features/Settings/InboundSettings.vue'),
    locale('zh-CN'),
    locale('zh-TW'),
    locale('en-US'),
  ])
  assert.match(inbound, /t\('settings\.inboundSummary'\)/)
  assert.deepEqual([zhCN.settings.inboundSummary, zhTW.settings.inboundSummary, en.settings.inboundSummary], ['端口、局域网访问与流量探测', '連接埠、區域網路存取與流量探測', 'Ports, LAN access and sniffing'])
  assert.equal(en.nodes.transport, 'Transport settings')
  assert.notEqual(en.nodes.transport, en.nodes.network)
})

test('mobile node actions use two columns instead of clipping labels', async () => {
  const toolbar = await read('Features/Nodes/NodesToolbar.vue')
  assert.match(toolbar, /@media \(max-width: 860px\)\s*\{[\s\S]*?\.toolbar-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.doesNotMatch(toolbar, /@media \(min-width: 361px\) and \(max-width: 430px\)/)
})

test('the logs toolbar filters on Enter without a redundant refresh button and shares one control height', async () => {
  const [toolbar, fields] = await Promise.all([
    read('Features/Logs/LogsToolbar.vue'),
    read('Design/fields.css'),
  ])
  assert.doesNotMatch(toolbar, /logs\.load/)
  assert.doesNotMatch(toolbar, /refresh-label/)
  assert.match(toolbar, /<search class="field field-toolbar filter-field"/)
  assert.match(toolbar, /@keyup\.enter="load"/)
  assert.doesNotMatch(toolbar, /aria-pressed/, 'a label-swapping pause control must not also announce a pressed state')
  assert.match(fields, /\.field\.field-toolbar input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="file"\]\)/)
})

test('foldable disclosures animate their content height instead of snapping', async () => {
  const motion = await read('Design/motion.css')
  assert.match(motion, /interpolate-size:\s*allow-keywords/)
  assert.match(motion, /details::details-content\s*\{[^}]*block-size:\s*0/)
  assert.match(motion, /details::details-content\s*\{[^}]*overflow:\s*clip/)
  assert.match(motion, /details::details-content\s*\{[^}]*contain:\s*layout/)
  assert.match(motion, /details\[open\]::details-content\s*\{[^}]*block-size:\s*auto/)
  assert.match(motion, /content-visibility[^;]*allow-discrete/)
  assert.match(motion, /@media \(prefers-reduced-motion: no-preference\)[\s\S]*?details(?::not\(\.ui-details-motion\))?::details-content\s*\{[^}]*transition:/)
})

test('reduced motion removes spatial movement without flattening colour feedback', async () => {
  const [base, tokens, motion, layout, overlays, buttons] = await Promise.all([
    read('Design/base.css'),
    read('Design/tokens.css'),
    read('Design/motion.css'),
    read('Design/layout.css'),
    read('Design/overlays.css'),
    read('Design/buttons.css'),
  ])
  assert.doesNotMatch(base, /transition-duration:\s*1ms\s*!important/)
  assert.doesNotMatch(base, /animation-duration:\s*1ms\s*!important/)
  assert.doesNotMatch(tokens, /--md-sys-motion-duration-short1:\s*1ms/)
  assert.match(layout, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.page,\s*\.page > \*\s*\{[^}]*animation:\s*none/)
  assert.match(overlays, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.menu-popup,[\s\S]*?\.toast\s*\{[^}]*animation:\s*none/)
  assert.match(buttons, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.icon-btn\s*\{[^}]*background-color/)
  assert.match(motion, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.spinner[\s\S]*?animation-duration:\s*2400ms/)
})
