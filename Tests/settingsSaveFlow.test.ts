import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { saveSettingsAndReload } from '../Src/Composables/settingsSaveFlow.ts'
import { shouldRenderIpInfoColumn } from '../Src/Composables/ipInfoColumn.ts'
import { mergeSpeedTestResult } from '../Src/Composables/speedtestResults.ts'

const sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Src/Composables/useSettings.ts')

test('every settings save uses one canonical settings reload after successful persistence', async () => {
  const source = await readFile(sourcePath, 'utf8')
  for (const name of ['saveInbound', 'saveCoreSettings', 'saveAppSettings', 'saveSpeedSettings', 'saveCoreTypes', 'saveAllSettings']) {
    const start = source.indexOf(`async function ${name}()`)
    assert.notEqual(start, -1, `${name} exists`)
    const nextFunction = source.indexOf('\n  async function ', start + 1)
    const body = source.slice(start, nextFunction < 0 ? source.indexOf('\n  const settingsPageState', start) : nextFunction)
    assert.match(body, /saveSettingsAndReload\(/, `${name} refreshes canonical settings`)
  }
  assert.match(source, /const loaded = await options\.data\('\/api\/settings'\)/)
  assert.match(source, /if \(generation !== loadGeneration\) return\s+settings\.value = loaded/)
})

test('settings option controls use Backend-provided ServiceLib candidates', async () => {
  const settingsRoot = path.resolve(path.dirname(sourcePath), '../Features/Settings')
  const files = ['InboundSettings.vue', 'CoreSettings.vue', 'ApplicationSettings.vue', 'SpeedSettings.vue', 'CoreTypeMappings.vue']
  const sources = await Promise.all(files.map(file => readFile(path.join(settingsRoot, file), 'utf8')))
  const controls = sources.join('\n')
  assert.match(sources[1], /values\('logLevels'\)/)
  assert.match(sources[2], /values\('rootCertProviders'\)/)
  assert.match(sources[0], /values\('destOverrideProtocols'\)/)
  assert.match(sources[3], /values\('speedTestTimeouts'\)/)
  assert.doesNotMatch(controls, /\['debug',\s*'info',\s*'warning',\s*'error',\s*'none'\]/)
})

test('settings save reloads once, after PUT succeeds, then optionally refreshes status', async () => {
  const calls = []
  const result = await saveSettingsAndReload(
    async (url) => { calls.push(`save:${url}`); return { success: true } },
    '/api/settings/application',
    { method: 'PUT' },
    async () => { calls.push('get:/api/settings') },
    async () => { calls.push('load-status') },
  )

  assert.deepEqual(result, { success: true })
  assert.deepEqual(calls, ['save:/api/settings/application', 'get:/api/settings', 'load-status'])
})

test('failed settings save does not issue a canonical GET', async () => {
  let reloadCount = 0
  await assert.rejects(
    saveSettingsAndReload(
      async () => { throw new Error('save failed') },
      '/api/settings/speedtest',
      { method: 'PUT' },
      async () => { reloadCount++ },
    ),
    /save failed/,
  )
  assert.equal(reloadCount, 0)
})

test('IP info received while hidden is retained and appears immediately after canonical settings refresh', async () => {
  let persistedIpApiUrl = ''
  const hideColumnIpInfo = false
  let uiSettings = { showIpInfoColumn: false }
  const profiles = [{ indexId: 'profile-a', ipInfo: '' }]
  assert.equal(shouldRenderIpInfoColumn(uiSettings.showIpInfoColumn), false)

  assert.equal(mergeSpeedTestResult(profiles, { indexId: 'profile-a', ipInfo: 'US · 203.0.113.1' }), true)
  assert.equal(profiles[0].ipInfo, 'US · 203.0.113.1')
  assert.equal(shouldRenderIpInfoColumn(uiSettings.showIpInfoColumn), false)

  const request = async (url, init) => {
    assert.equal(url, '/api/settings/speedtest')
    persistedIpApiUrl = init.body.ipApiUrl
    return { success: true }
  }
  const reloadSettings = async () => {
    // This is the backend-owned showIpInfoColumn value returned by GET /api/settings.
    uiSettings = { showIpInfoColumn: Boolean(persistedIpApiUrl) && !hideColumnIpInfo }
  }
  await saveSettingsAndReload(request, '/api/settings/speedtest', {
    method: 'PUT', body: { ipApiUrl: 'https://ip.example.test' },
  }, reloadSettings)

  assert.equal(shouldRenderIpInfoColumn(uiSettings.showIpInfoColumn), true)
  assert.equal(profiles[0].ipInfo, 'US · 203.0.113.1')

  await saveSettingsAndReload(request, '/api/settings/speedtest', {
    method: 'PUT', body: { ipApiUrl: '' },
  }, reloadSettings)
  assert.equal(shouldRenderIpInfoColumn(uiSettings.showIpInfoColumn), false)
  assert.equal(profiles[0].ipInfo, 'US · 203.0.113.1')
})
