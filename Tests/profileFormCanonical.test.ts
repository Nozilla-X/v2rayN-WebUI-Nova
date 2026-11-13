import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalizeProtocolChange } from '../Src/Features/Profiles/profileFormCanonical.ts'

const editorOptions = {
  defaultNetwork: 'raw',
  defaultSecurity: 'auto',
  defaultVlessEncryption: 'none',
  defaultWireGuardMtu: 1420,
}

test('switching to PolicyGroup keeps the form and advanced strategy coherent', () => {
  const form: Record<string, any> = {
    configType: 'PolicyGroup',
    protoExtra: {},
    transportExtra: {},
    streamSecurity: '',
    network: 'raw',
    fingerprint: '',
    alpn: '',
  }
  const advanced = JSON.stringify({
    configType: 'VMess',
    protoExtra: '{"vmessSecurity":"auto"}',
    transportExtra: '{}',
  })

  const next = JSON.parse(canonicalizeProtocolChange(form, advanced, editorOptions))

  // The dropdown speaks enum names, while ServiceLib stores the numeric
  // EMultipleLoad value. Both views must agree after a type switch.
  assert.equal(form.protoExtra.multipleLoad, 'LeastPing')
  assert.deepEqual(JSON.parse(next.protoExtra), { multipleLoad: 0 })
})

test('switching away from PolicyGroup drops the strategy from both editors', () => {
  const form: Record<string, any> = {
    configType: 'VLESS',
    protoExtra: { multipleLoad: 'Random', childItems: 'member-a' },
    transportExtra: {},
    streamSecurity: '',
    network: 'raw',
  }
  const advanced = JSON.stringify({
    configType: 'PolicyGroup',
    protoExtra: '{"multipleLoad":2,"childItems":"member-a"}',
    transportExtra: '{}',
  })

  const next = JSON.parse(canonicalizeProtocolChange(form, advanced, editorOptions))

  assert.equal(Object.hasOwn(form.protoExtra, 'multipleLoad'), false)
  assert.equal(Object.hasOwn(form.protoExtra, 'childItems'), false)
  assert.equal(Object.hasOwn(JSON.parse(next.protoExtra), 'multipleLoad'), false)
})

test('switching to MASQUE clears the transport editor like ServiceLib does', () => {
  const form: Record<string, any> = {
    configType: 'MASQUE',
    protoExtra: {},
    transportExtra: { host: 'stale.example', path: '/stale' },
    streamSecurity: 'tls',
    network: 'ws',
  }
  const advanced = JSON.stringify({
    configType: 'VLESS',
    protoExtra: '{}',
    transportExtra: '{"host":"stale.example","path":"/stale"}',
    network: 'ws',
  })

  const next = JSON.parse(canonicalizeProtocolChange(form, advanced, editorOptions))

  // AddMasqueServer stores an empty network and no transport extras.
  assert.equal(form.network, 'raw')
  assert.deepEqual(form.transportExtra, {})
  assert.deepEqual(JSON.parse(next.transportExtra), {})
})
