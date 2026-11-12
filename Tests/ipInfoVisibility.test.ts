import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { shouldRenderIpInfoColumn } from '../Src/Composables/ipInfoColumn.ts'

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Src/Features/Nodes/NodesTable.vue')

test('IP information column is shown only when the backend Desktop-parity capability is true', () => {
  assert.equal(shouldRenderIpInfoColumn(true), true)
  assert.equal(shouldRenderIpInfoColumn(false), false)
  assert.equal(shouldRenderIpInfoColumn(undefined), false)
})

test('nodes table conditionally removes both IP header and cells when unavailable', async () => {
  const source = await readFile(pagePath, 'utf8')
  assert.match(source, /v-if="showIp"[^>]*>\{\{ t\('nodes\.ip'\) \}\}/)
  assert.match(source, /<td v-if="showIp"><span class="truncate ip-value"/)
  assert.match(source, /const colSpan = computed\(\(\) => 4 \+ dataColumnIds\.filter\(\(id\) => isVisible\(id\)\)\.length \+ \(showIp\.value \? 1 : 0\)\)/)
})
