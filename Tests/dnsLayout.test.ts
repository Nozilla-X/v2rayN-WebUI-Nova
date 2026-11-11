import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Src')
const designRoot = path.join(sourceRoot, 'Design')

async function designCss() {
  const files = ['tokens.css', 'layout.css', 'fields.css', 'buttons.css', 'feedback.css']
  const parts = await Promise.all(files.map(file => readFile(path.join(designRoot, file), 'utf8')))
  return parts.join('\n')
}

test('DNS settings use full workspace width without removing the workspace cap or responsive form grids', async () => {
  const [tokens, layout, fields, page, profile] = await Promise.all([
    readFile(path.join(designRoot, 'tokens.css'), 'utf8'),
    readFile(path.join(designRoot, 'layout.css'), 'utf8'),
    readFile(path.join(designRoot, 'fields.css'), 'utf8'),
    readFile(path.join(sourceRoot, 'Pages/DnsPage.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Features/Dns/CoreDnsProfile.vue'), 'utf8'),
  ])
  assert.match(tokens, /--nova-content-max:\s*1600px/)
  assert.match(layout, /\.workspace\s*\{[^}]*width:\s*min\(100%,\s*var\(--nova-content-max\)\)/)
  assert.doesNotMatch(page, /\.dns-page\s*\{[^}]*max-width:\s*\d+px/)
  assert.match(fields, /\.field-row\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\)/)
  assert.match(fields, /\.field input[^\{]*,[\s\S]*?\.field textarea[^\{]*\{[^}]*min-width:\s*0/)
  assert.match(profile, /@media\s*\(max-width:\s*600px\)[\s\S]*?\.field-row\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
})

test('Core DNS editor exposes and round-trips normal and TUN data with embedded-default import', async () => {
  const [page, profile, composable] = await Promise.all([
    readFile(path.join(sourceRoot, 'Pages/DnsPage.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Features/Dns/CoreDnsProfile.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Composables/useDns.ts'), 'utf8'),
  ])
  assert.match(profile, /v-model="profile\.normalDNS"/)
  assert.match(profile, /v-model="profile\.tunDNS"/)
  assert.match(profile, /emit\('importDefault'\)/)
  assert.match(page, /@import-default="importDefault\(currentProfile\)"/)
  assert.match(composable, /tunDNS: profile\.tunDNS/)
  assert.match(composable, /options\.data\('\/api\/settings\/dns\/editor-options'\)/)
  assert.match(composable, /\/api\/settings\/dns\/defaults/)
  assert.doesNotMatch(profile, /TUN DNS.*hidden|TunDNS.*preserve/i)
})

test('Core DNS editor keeps grouped desktop fields and a mobile single-column field order', async () => {
  const [profile, page] = await Promise.all([
    readFile(path.join(sourceRoot, 'Features/Dns/CoreDnsProfile.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Pages/DnsPage.vue'), 'utf8'),
  ])
  assert.match(profile, /v-model="profile\.remarks"[\s\S]*?v-model="profile\.enabled"[\s\S]*?:id="`dns-normal-[\s\S]*?v-model="profile\.normalDNS"[\s\S]*?:id="`dns-tun-[\s\S]*?v-model="profile\.tunDNS"/)
  assert.match(profile, /v-model="profile\.domainStrategy4Freedom"[\s\S]*?v-model="profile\.domainDNSAddress"[\s\S]*?v-if="isXray" v-model="profile\.useSystemHosts"/)
  assert.match(profile, /class="code-area dns-code"/)
  assert.match(profile, /@media\s*\(max-width:\s*600px\)[\s\S]*?\.field-row\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
  assert.match(profile, /\.dns-code\s*\{\s*min-height:\s*180px;?\s*\}/)
  assert.match(page, /dns-tabs/)
  assert.doesNotMatch(page, /class="page-head/)
  assert.match(page, /class="tabs dns-tabs"/)
})

test('shared form grids align checkbox and button rows with the neighboring controls', async () => {
  const css = await designCss()
  assert.match(css, /\.field-row\s*\{[^}]*align-items:\s*start/)
  assert.match(css, /\.btn\s*\{[^}]*min-height:\s*var\(--nova-control-height\)/)
  assert.match(css, /\.field input[^\{]*,[\s\S]*?min-height:\s*var\(--nova-field-height\)/)
  assert.match(css, /\.check\s*\{[^}]*min-height:\s*var\(--nova-touch-target\)/)
  assert.match(css, /\.save-bar\s*\{[^}]*flex-wrap:\s*wrap/)
  assert.match(css, /\.save-bar \.draft-status\s*\{\s*margin-right:\s*auto/)
})

test('sniffing overrides share an aligned check group and routing selects use standard control heights', async () => {
  const [inbound, routing, fields] = await Promise.all([
    readFile(path.join(sourceRoot, 'Features/Settings/InboundSettings.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Pages/RoutingPage.vue'), 'utf8'),
    readFile(path.join(designRoot, 'fields.css'), 'utf8'),
  ])
  assert.match(inbound, /v-model="inbound\.sniffingEnabled"[\s\S]*?values\('destOverrideProtocols'\)/)
  assert.match(inbound, /class="check-group"/)
  assert.match(fields, /\.check-group\s*\{[^}]*flex-wrap:\s*wrap/)
  assert.match(routing, /class="field-row strategy-fields"/)
  assert.match(routing, /\.strategy-fields\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*240px\),\s*1fr\)\)[^}]*align-items:\s*end/)
  assert.match(routing, /\.strategy-actions > \.btn[^{]*\{[^}]*min-height:\s*var\(--nova-control-height-comfortable\)/)
})

test('Core DNS save retains all profile values and reloads the profile after PUT', async () => {
  const [profile, composable] = await Promise.all([
    readFile(path.join(sourceRoot, 'Features/Dns/CoreDnsProfile.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Composables/useDns.ts'), 'utf8'),
  ])

  for (const field of ['enabled', 'useSystemHosts', 'normalDNS', 'tunDNS', 'domainStrategy4Freedom', 'domainDNSAddress']) {
    assert.ok(profile.includes(`profile.${field}`), `DNS editor exposes ${field}`)
    assert.ok(composable.includes(`${field}: profile.${field}`), `DNS profile save includes ${field}`)
  }
  assert.match(composable, /method: 'PUT',[\s\S]*?await loadDns\(\)/)
  assert.match(composable, /options\.data\('\/api\/settings\/dns\/profiles'\)/)
})
