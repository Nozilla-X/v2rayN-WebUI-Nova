import type { Dict } from '../../Composables/types.ts'
import { multipleLoadEnum, multipleLoadName, reconcileProfileExtraKeys } from '../../Composables/profilePayloads.ts'

export const groupConfigTypes = ['PolicyGroup', 'ProxyChain']
export const realityConfigTypes = ['VLESS', 'Trojan', 'Anytls']
const transportlessConfigTypes = ['Custom', 'Outbound', 'Hysteria2', 'TUIC', 'WireGuard', 'Anytls', 'Naive', 'MASQUE', ...groupConfigTypes]
const groupProtocolExtraFields = ['groupType', 'childItems', 'subChildItems', 'filter', 'multipleLoad']
const protocolExtraOwners: Record<string, string[]> = {
  alterId: ['VMess'], vmessSecurity: ['VMess'], flow: ['VLESS', 'Trojan'], vlessEncryption: ['VLESS'],
  ssMethod: ['Shadowsocks'], uot: ['Shadowsocks', 'Naive'], httpHeaders: ['HTTP'],
  wgPublicKey: ['WireGuard'], wgPresharedKey: ['WireGuard'], wgInterfaceAddress: ['WireGuard'],
  wgReserved: ['WireGuard'], wgMtu: ['WireGuard'], wgDns: ['WireGuard'],
  isSingboxEndpoint: ['Outbound'],
  masquePath: ['MASQUE'], masqueHeaders: ['MASQUE'],
  salamanderPass: ['Hysteria2'], upMbps: ['Hysteria2'], downMbps: ['Hysteria2'], ports: ['Hysteria2'],
  hopInterval: ['Hysteria2'], hy2RealmUrl: ['Hysteria2'], geckoMinPacketSize: ['Hysteria2'], geckoMaxPacketSize: ['Hysteria2'],
  congestionControl: ['TUIC', 'Naive'], insecureConcurrency: ['Anytls', 'Naive'], naiveQuic: ['Naive'],
}
const transportExtraFields = ['rawHeaderType', 'host', 'path', 'xhttpMode', 'xhttpExtra', 'grpcAuthority', 'grpcServiceName', 'grpcMode', 'kcpHeaderType', 'kcpSeed', 'kcpMtu']
const realityFields = ['publicKey', 'shortId', 'spiderX', 'mldsa65Verify']
const wireGuardIncompatibleFields = ['streamSecurity', 'sni', 'alpn', 'fingerprint', ...realityFields, 'allowInsecure', 'cert', 'certSha', 'echConfigList', 'verifyPeerCertByName', 'finalmask']

function parseObject(value: unknown): Dict {
  if (value && typeof value === 'object' && !Array.isArray(value)) return { ...value }
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function removeKeys(target: Dict, keys: readonly string[]) {
  for (const key of keys) delete target[key]
}

/**
 * Keep protocol-specific optional state coherent when the config type changes.
 * Mutates the editable form and returns the canonical advanced-JSON text.
 */
export function canonicalizeProtocolChange(form: Dict, advancedJson: string, editorOptions: Dict): string {
  let advanced: Dict
  try {
    advanced = parseObject(JSON.parse(advancedJson || '{}'))
  } catch {
    return advancedJson
  }
  const configType = String(form.configType || '')
  const protocolExtra = form.protoExtra || (form.protoExtra = {})
  const rawAdvancedProtocolExtra = parseObject(advanced.protoExtra)
  const advancedProtocolExtra = reconcileProfileExtraKeys(rawAdvancedProtocolExtra, 'protocol', {
    advanced: rawAdvancedProtocolExtra,
    current: rawAdvancedProtocolExtra,
    initial: rawAdvancedProtocolExtra,
  })
  if (!groupConfigTypes.includes(configType)) {
    removeKeys(protocolExtra, groupProtocolExtraFields)
    removeKeys(advancedProtocolExtra, groupProtocolExtraFields)
  } else if (configType !== 'PolicyGroup') {
    delete protocolExtra.multipleLoad
    delete advancedProtocolExtra.multipleLoad
  } else {
    // The editor shows the enum names from /api/editor-options; the stored
    // protoExtra JSON must use the numeric EMultipleLoad value. Keep the
    // advanced-JSON view on the stored representation as well.
    protocolExtra.multipleLoad = multipleLoadName(protocolExtra.multipleLoad)
    advancedProtocolExtra.multipleLoad = multipleLoadEnum(protocolExtra.multipleLoad)
  }

  if (!realityConfigTypes.includes(configType) && String(form.streamSecurity).toLowerCase() === 'reality') {
    form.streamSecurity = ''
  }
  if (configType === 'WireGuard') {
    if (protocolExtra.wgMtu == null) protocolExtra.wgMtu = editorOptions.defaultWireGuardMtu
    for (const field of wireGuardIncompatibleFields) form[field] = ''
    form.allowInsecure = false
    form.network = editorOptions.defaultNetwork
  }
  if (['Hysteria2', 'Naive'].includes(configType)) {
    form.alpn = ''
    form.fingerprint = ''
  } else if (configType === 'TUIC') {
    form.fingerprint = ''
  }
  if (!realityConfigTypes.includes(configType) || String(form.streamSecurity).toLowerCase() !== 'reality') {
    for (const field of realityFields) form[field] = ''
  }
  if (!['VMess', 'VLESS', 'Shadowsocks', 'Trojan'].includes(configType)) form.muxEnabled = null

  for (const [field, owners] of Object.entries(protocolExtraOwners)) {
    const allowed = owners.includes(configType)
      && !(field === 'congestionControl' && configType === 'Naive' && protocolExtra.naiveQuic !== true)
    if (!allowed) {
      delete protocolExtra[field]
      delete advancedProtocolExtra[field]
    }
  }
  if (configType === 'VMess' && !protocolExtra.vmessSecurity) protocolExtra.vmessSecurity = editorOptions.defaultSecurity
  if (configType === 'VLESS' && !protocolExtra.vlessEncryption) protocolExtra.vlessEncryption = editorOptions.defaultVlessEncryption

  if (transportlessConfigTypes.includes(configType)) {
    form.network = editorOptions.defaultNetwork
    removeKeys(form.transportExtra || {}, transportExtraFields)
    advanced.network = editorOptions.defaultNetwork
    const rawAdvancedTransportExtra = parseObject(advanced.transportExtra)
    const advancedTransportExtra = reconcileProfileExtraKeys(rawAdvancedTransportExtra, 'transport', {
      advanced: rawAdvancedTransportExtra,
      current: rawAdvancedTransportExtra,
      initial: rawAdvancedTransportExtra,
    })
    removeKeys(advancedTransportExtra, transportExtraFields)
    advanced.transportExtra = typeof advanced.transportExtra === 'string' ? JSON.stringify(advancedTransportExtra) : advancedTransportExtra
    removeKeys(advanced, ['headerType', 'requestHost', 'path', 'extra'])
  }

  if (configType === 'WireGuard') {
    for (const field of wireGuardIncompatibleFields) advanced[field] = ''
  }
  if (['Hysteria2', 'Naive'].includes(configType)) {
    advanced.alpn = ''
    advanced.fingerprint = ''
  } else if (configType === 'TUIC') {
    advanced.fingerprint = ''
  }
  if (!realityConfigTypes.includes(configType) || String(form.streamSecurity).toLowerCase() !== 'reality') {
    for (const field of realityFields) advanced[field] = ''
  }
  advanced.configType = configType
  advanced.protoExtra = typeof advanced.protoExtra === 'string' ? JSON.stringify(advancedProtocolExtra) : advancedProtocolExtra
  form.protoExtra = protocolExtra
  return JSON.stringify(advanced, null, 2)
}
