import assert from 'node:assert/strict'
import test from 'node:test'
import { createSourceHarness } from './helpers/loadSource.ts'
import { classifyLoginResponse, connectEstablishedSession } from '../Src/Composables/sessionFlow.ts'

test('login response distinguishes invalid credentials from backend unavailability', () => {
  assert.equal(classifyLoginResponse(401, { code: 'management_key_invalid' }), 'invalid-key')
  assert.equal(classifyLoginResponse(500, { code: 'internal_error' }), 'unavailable')
  assert.equal(classifyLoginResponse(503, {}), 'unavailable')
  assert.equal(classifyLoginResponse(429, {}), 'rate-limited')
  assert.equal(classifyLoginResponse(200, { success: true, data: { token: 'session-token' } }), 'authenticated')
})

function sessionFixture(t, publicRequest) {
  const harness = createSourceHarness()
  const originalStorage = globalThis.localStorage
  globalThis.localStorage = { setItem() {}, removeItem() {} }
  t.after(async () => {
    await harness.dispose()
    if (originalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalStorage
  })
  const { useSession } = harness.loadSource('Src/Composables/useSession.ts')
  const token = harness.vue.ref('')
  const authenticated = harness.vue.ref(false)
  const errors = []
  const notices = []
  const session = harness.setup(() => useSession({
    token, authenticated, loading: harness.vue.ref(false), request: async () => ({}), publicRequest,
    storageKey: () => 'test-session', t: (key) => key,
    showNotice: (message, kind) => notices.push([message, kind]), showError: (error) => errors.push(error),
    closeEvents() {}, openEvents() {}, refreshData: async () => {}, loadConnectedData: async () => {},
    resetSessionData() {}, loadProfiles: async () => {},
  }))
  return { session, token, authenticated, errors, notices }
}

test('a failed login preflight does not report an error when authentication succeeds', async (t) => {
  const requests = []
  const probeFailure = new TypeError('Failed to fetch setup status')
  const fixture = sessionFixture(t, async (route) => {
    requests.push(route)
    if (route === '/api/setup/status') throw probeFailure
    return { response: { status: 200, ok: true }, payload: { success: true, data: { token: 'session-token' } } }
  })
  fixture.session.managementKeyDraft.value = 'valid-management-key'

  await fixture.session.login()

  assert.deepEqual(requests, ['/api/setup/status', '/api/auth/login'])
  assert.deepEqual(fixture.errors, [])
  assert.equal(fixture.token.value, 'session-token')
  assert.equal(fixture.authenticated.value, true)
  assert.ok(fixture.notices.some(([message]) => message === 'auth.connected'))
})

test('authentication request failures and rejected credentials keep their existing notices', async (t) => {
  let outcome = 'network'
  const loginFailure = new TypeError('Failed to reach login endpoint')
  const fixture = sessionFixture(t, async (route) => {
    if (route === '/api/setup/status') return { response: { status: 200, ok: true }, payload: { setupRequired: false } }
    if (outcome === 'network') throw loginFailure
    if (outcome === 'invalid') return { response: { status: 401 }, payload: { code: 'management_key_invalid' } }
    return { response: { status: 429 }, payload: {} }
  })
  fixture.session.managementKeyDraft.value = 'test-management-key'

  await fixture.session.login()
  assert.deepEqual(fixture.errors, [loginFailure])
  outcome = 'invalid'
  await fixture.session.login()
  outcome = 'rate-limited'
  await fixture.session.login()

  assert.deepEqual(fixture.notices.map(([message, kind]) => [message, kind]), [
    ['auth.loginFailed', 'error'],
    ['auth.rateLimited', 'error'],
  ])
})

test('an explicit setup status probe still reports failure by default', async (t) => {
  const probeFailure = new TypeError('Failed to fetch setup status')
  const fixture = sessionFixture(t, async () => { throw probeFailure })

  await fixture.session.loadSetupStatus()

  assert.deepEqual(fixture.errors, [probeFailure])
  assert.equal(fixture.session.setupStatusReady.value, true)
})

test('a known setup-required state prevents login after a failed preflight', async (t) => {
  const requests = []
  const fixture = sessionFixture(t, async (route) => {
    requests.push(route)
    throw new TypeError('Failed to fetch setup status')
  })
  fixture.session.setupRequired.value = true
  fixture.session.managementKeyDraft.value = 'test-management-key'

  await fixture.session.login()

  assert.deepEqual(requests, ['/api/setup/status'])
  assert.equal(fixture.authenticated.value, false)
  assert.deepEqual(fixture.errors, [])
})

test('failed initial data loading keeps a successfully authenticated session', async () => {
  let token = ''
  let authenticated = false
  let persisted = ''
  let dataFailureNotices = 0
  let connectedNotices = 0
  let eventsOpened = 0

  await connectEstablishedSession({
    sessionToken: 'session-token',
    setToken: (value) => { token = value },
    setAuthenticated: (value) => { authenticated = value },
    isAuthenticated: () => authenticated,
    persistToken: (value) => { persisted = value },
    refreshBase: async () => true,
    openEvents: () => { eventsOpened += 1 },
    loadConnectedData: async () => { throw new Error('runtime API failed') },
    onDataLoadFailure: () => { dataFailureNotices += 1 },
    onConnected: () => { connectedNotices += 1 },
  })

  assert.equal(token, 'session-token')
  assert.equal(persisted, 'session-token')
  assert.equal(authenticated, true)
  assert.equal(eventsOpened, 1)
  assert.equal(dataFailureNotices, 1)
  assert.equal(connectedNotices, 0)
})

test('a valid session and SSE remain active when base data fails, unless authorization revoked it', async () => {
  let authenticated = false
  let failures = 0
  let eventsOpened = 0
  let expiredNotices = 0
  await connectEstablishedSession({
    sessionToken: 'session-token',
    setToken: () => {},
    setAuthenticated: (value) => { authenticated = value },
    isAuthenticated: () => authenticated,
    persistToken: () => {},
    refreshBase: async () => false,
    openEvents: () => { eventsOpened += 1 },
    loadConnectedData: async () => {},
    onDataLoadFailure: () => { failures += 1 },
    onConnected: () => assert.fail('Connection success should not be reported'),
    onSessionExpired: () => { expiredNotices += 1 },
  })
  assert.equal(authenticated, true)
  assert.equal(failures, 1)
  assert.equal(eventsOpened, 1)

  await connectEstablishedSession({
    sessionToken: 'expired-session',
    setToken: () => {},
    setAuthenticated: (value) => { authenticated = value },
    isAuthenticated: () => authenticated,
    persistToken: () => {},
    refreshBase: async () => { authenticated = false; return false },
    openEvents: () => { eventsOpened += 1 },
    loadConnectedData: async () => {},
    onDataLoadFailure: () => { failures += 1 },
    onConnected: () => assert.fail('Connection success should not be reported'),
    onSessionExpired: () => { expiredNotices += 1 },
  })
  assert.equal(authenticated, false)
  assert.equal(failures, 1)
  assert.equal(eventsOpened, 1)
  assert.equal(expiredNotices, 1)
})
