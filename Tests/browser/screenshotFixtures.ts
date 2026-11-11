// Deterministic API payloads for documentation screenshots and visual audits.
// They intentionally cover long labels, dense tables and every page's data.
import type { Route } from 'playwright'

const now = 1791212280
const profileNames = [
  '🇭🇰 Hong Kong 01 · IEPL Premium',
  '🇸🇬 Singapore 02 · Direct',
  '🇯🇵 Tokyo 03 · Hysteria',
  '🇩🇪 Frankfurt 04 · Backup',
  '🇺🇸 Los Angeles 05 · Streaming',
  '🇦🇺 Sydney 06 · Long name used to verify table overflow behaviour',
  '🇰🇷 Seoul 07 · Low latency',
  '🇬🇧 London 08 · Archive',
]

const jsonDns = JSON.stringify({
  servers: [
    'https://dns.alidns.com/dns-query',
    { address: '1.1.1.1', domains: ['geosite:geolocation-!cn'] },
  ],
}, null, 2)

const routingRules = [
  { id: 'rule-0', remarks: '广告与跟踪域名', enabled: true, outboundTag: 'block', domain: ['geosite:category-ads-all'], ip: [], port: '', network: '', protocol: [], inboundTag: [], process: [] },
  { id: 'rule-1', remarks: '私有网络直连', enabled: true, outboundTag: 'direct', domain: ['geosite:private'], ip: ['geoip:private'], port: '', network: '', protocol: [], inboundTag: [], process: [] },
  { id: 'rule-2', remarks: 'Apple 服务', enabled: true, outboundTag: 'direct', domain: ['geosite:apple@cn', 'domain:icloud.com'], ip: [], port: '', network: '', protocol: [], inboundTag: [], process: [] },
  { id: 'rule-3', remarks: '流媒体分流', enabled: true, outboundTag: 'proxy', domain: ['geosite:netflix', 'geosite:disney', 'geosite:youtube'], ip: [], port: '', network: '', protocol: [], inboundTag: [], process: [] },
  { id: 'rule-4', remarks: '阻止 QUIC', enabled: false, outboundTag: 'block', domain: [], ip: [], port: '', network: 'udp', protocol: [], inboundTag: [], process: [] },
  { id: 'rule-5', remarks: '局域网设备绕过', enabled: true, outboundTag: 'direct', domain: [], ip: ['192.168.0.0/16', '10.0.0.0/8'], port: '', network: '', protocol: [], inboundTag: [], process: [] },
  { id: 'rule-6', remarks: 'BitTorrent', enabled: true, outboundTag: 'block', domain: [], ip: [], port: '', network: '', protocol: ['bittorrent'], inboundTag: [], process: [] },
  { id: 'rule-7', remarks: '', enabled: true, outboundTag: 'proxy', domain: ['geosite:geolocation-!cn'], ip: [], port: '', network: '', protocol: [], inboundTag: [], process: [] },
]

const logMessages = [
  'accepted tcp:www.gstatic.com:443 [proxy]',
  'accepted udp:1.1.1.1:53 [dns-out]',
  'accepted tcp:api.github.com:443 [proxy]',
  'rejected tcp:doubleclick.net:443 [block]',
  'accepted tcp:cdn.jsdelivr.net:443 [proxy]',
  'accepted tcpm:node.example.invalid:443 [socks-in >> proxy]',
  'failed to dial: connection reset by peer',
  'accepted udp:192.168.1.1:5353 [dns-out]',
  'info: Xray 25.9.11 started',
  'accepted tcp:example.com:80 [direct]',
]

function logs() {
  return Array.from({ length: 62 }, (_, index) => ({
    timestamp: new Date(Date.UTC(2026, 9, 6, 1, 0, 0) + index * 41_000).toISOString(),
    source: index % 9 === 8 ? 'Core' : 'Xray',
    message: logMessages[index % logMessages.length] + (index > 49 ? ` #${index + 1}` : ''),
  }))
}

export function screenshotFixtures(): Record<string, unknown> {
  const profiles = profileNames.map((remarks, index) => {
    const protocols = ['vless', 'vmess', 'hysteria2', 'shadowsocks', 'trojan', 'vless', 'anytls', 'vless']
    const networks = ['tcp', 'ws', 'udp', 'tcp', 'grpc', 'tcp', 'tcp', 'tcp']
    const security = ['reality', 'tls', 'tls', 'none', 'tls', 'reality', 'tls', 'reality']
    const delay = [46, 82, -1, null, 141, 205, 302, 998][index]
    return {
      indexId: `profile-${index}`,
      remarks,
      configType: ['VLESS', 'VMess', 'Hysteria2', 'Shadowsocks', 'Trojan', 'VLESS', 'Anytls', 'VLESS'][index],
      protocol: protocols[index],
      address: ['hk1.example.invalid', 'sg2.example.invalid', 'jp3.example.invalid', 'de4.example.invalid', 'us5.example.invalid', 'au6.example.invalid', 'kr7.example.invalid', 'uk8.example.invalid'][index],
      port: [443, 8443, 8443, 8388, 443, 443, 443, 443][index],
      network: networks[index],
      streamSecurity: security[index],
      ipInfo: index === 2 ? '' : `203.0.113.${10 + index}`,
      subscriptionId: index === 3 ? 'local' : 'airport',
      subscriptionName: index === 3 ? 'Self-hosted' : 'Airport A 2026',
      sort: index,
      delay,
      speed: [86.2, 32.5, null, null, 18.4, 9.8, 71.1, 4.2][index],
      todayUp: [31_000_000, 1_000_000, 0, 0, 7_400_000, 812_000, 4_100_000, 0][index],
      todayDown: [475_000_000, 9_000_000, 0, 0, 133_000_000, 19_000_000, 82_000_000, 0][index],
      totalUp: [1_000_000_000, 50_000_000, 0, 30_000_000, 240_000_000, 12_000_000, 190_000_000, 3_000_000][index],
      totalDown: [15_000_000_000, 256_000_000, 0, 150_000_000, 4_200_000_000, 300_000_000, 2_900_000_000, 40_000_000][index],
      isCurrent: index === 0,
    }
  })

  const subscriptions = [
    { id: 'local', remarks: 'Self-hosted', enabled: true, url: '', autoUpdateInterval: 0, updateTime: 0, userAgent: '', filter: '', sort: 0, profileCount: 1 },
    { id: 'airport', remarks: 'Airport A 2026 · Premium', enabled: true, url: 'https://subscription.example.invalid/airport-a', autoUpdateInterval: 0, updateTime: now, userAgent: 'v2rayN-Nova/2.0', filter: '', sort: 1, profileCount: 6 },
    { id: 'backup', remarks: 'Backup subscription with a deliberately long descriptive name', enabled: false, url: 'https://subscription.example.invalid/backup/provider/very/long/path/that/should/truncate/neatly', autoUpdateInterval: 60, updateTime: now - 86_400, userAgent: '', filter: '香港|Tokyo|Singapore', sort: 2, profileCount: 1 },
  ]

  const editorOptions = {
    profiles: {
      configTypes: ['VMess', 'VLESS', 'Trojan', 'Shadowsocks', 'Hysteria2', 'TUIC', 'WireGuard', 'Anytls', 'Naive', 'HTTP', 'SOCKS', 'PolicyGroup', 'ProxyChain', 'Custom', 'Outbound'],
      coreTypes: ['Xray', 'sing_box', 'clash', 'hysteria2', 'tuic', 'naive'],
      networks: ['tcp', 'ws', 'grpc', 'httpupgrade', 'xhttp', 'kcp', 'quic', 'http'],
      defaultNetwork: 'tcp',
      streamSecurityTypes: ['none', 'tls', 'reality'],
      defaultStreamSecurity: 'none',
      fingerprints: ['chrome', 'firefox', 'safari', 'random', 'randomized'],
      userAgents: ['', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'],
      flows: ['', 'xtls-rprx-vision'],
      vmessSecurities: ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero'],
      shadowsocksSecurities: {
        Xray: ['aes-128-gcm', 'aes-256-gcm', 'chacha20-poly1305', '2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm'],
        sing_box: ['2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm', 'chacha20-ietf-poly1305'],
      },
      singboxOnlyConfigTypes: ['Hysteria2', 'TUIC', 'WireGuard', 'Anytls', 'Naive'],
      tuicCongestionControls: ['bbr', 'cubic', 'new_reno'],
      naiveCongestionControls: ['bbr', 'cubic', 'new_reno'],
      multipleLoadStrategies: ['LeastPing', 'LeastLoad', 'Random', 'RoundRobin'],
      alpnProtocols: ['h2', 'http/1.1', 'h3'],
      xhttpModes: ['auto', 'packet-up', 'stream-up', 'stream-one'],
      grpcModes: ['gun', 'multi'],
      headerTypes: ['none', 'http', 'srtp', 'utm', 'wechat-video', 'dtls', 'wireguard'],
      kcpHeaderTypes: ['none', 'srtp', 'utm', 'wechat-video', 'dtls', 'wireguard'],
    },
    subscriptions: {},
    coreTypeRoute: () => '',
  }

  const settings = {
    domainStrategy: 'IPIfNonMatch',
    domainStrategy4Singbox: 'prefer_ipv4',
    inbound: {
      localPort: 10808,
      secondLocalPortEnabled: false,
      udpEnabled: true,
      sniffingEnabled: true,
      destOverride: ['http', 'tls', 'quic'],
      routeOnly: false,
      allowLANConn: false,
      newPort4LAN: false,
      user: '',
      pass: '',
    },
    core: {
      logEnabled: true,
      loglevel: 'warning',
      defFingerprint: 'chrome',
      defUserAgent: '',
      sendThrough: '',
      bindInterface: '',
      mux4RayConcurrency: 8,
      mux4RayXudpConcurrency: 8,
      mux4RayXudpProxyUDP443: 'reject',
      mux4SboxProtocol: 'h2mux',
      mux4SboxPadding: false,
      enableCacheFile4Sbox: true,
      hy2UpMbps: 50,
      hy2DownMbps: 200,
      enableFragment: false,
      enableFinalFragment: false,
      fragmentPackets: 'tlshello',
      fragmentMaxSplit: '',
      fragmentLengths: ['100-200', '200-300'],
      fragmentDelays: ['10-20', '20-30'],
    },
    app: {
      enableStatistics: true,
      displayRealTimeSpeed: true,
      keepOlderDedupl: false,
      geoAutoUpdateInterval: 24,
      rootCertProvider: 'windows',
      geoSourceUrl: 'https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat',
      srsSourceUrl: '',
      routeRulesTemplateSourceUrl: '',
      subConvertUrl: '',
    },
    speedTest: {
      speedTestTimeout: 10,
      mixedConcurrencyCount: 3,
      speedTestUrl: 'https://speed.cloudflare.com/__down?bytes=10000000',
      speedPingTestUrl: 'https://speed.cloudflare.com/__down?bytes=1000',
      ipapiUrl: 'http://ip-api.com/json/?lang=zh-CN',
      udpTestTarget: '',
    },
    coreTypes: ['VLESS', 'VMess', 'Trojan', 'Shadowsocks', 'Hysteria2', 'TUIC', 'WireGuard', 'Anytls', 'Naive', 'HTTP', 'SOCKS'].map((configType, index) => ({
      configType,
      coreType: ['Xray', 'Xray', 'Xray', 'Xray', 'sing_box', 'sing_box', 'sing_box', 'sing_box', 'sing_box', 'Xray', 'Xray'][index],
    })),
    options: {
      destOverrideProtocols: ['http', 'tls', 'quic', 'fakedns'],
      logLevels: ['debug', 'info', 'warning', 'error', 'none'],
      rootCertProviders: ['windows', 'firefox', 'chrome'],
      geoFilesSources: ['https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat', 'https://github.com/v2fly/geoip/releases/latest/download/geoip.dat'],
      singboxRulesetSources: ['https://github.com/SagerNet/sing-geosite/raw/rule-set/geosite-geolocation-cn.srs'],
      routingRulesSources: ['https://github.com/2dust/v2rayN/raw/master/Resources/routingRules.json'],
      subConvertUrls: ['https://api.example.invalid/subconvert'],
      speedTestTimeouts: [5, 10, 15, 20],
      mixedConcurrencyCounts: [1, 2, 3, 4, 5],
      speedTestUrls: ['https://speed.cloudflare.com/__down?bytes=10000000', 'https://cachefly.cachefly.net/100mb.test'],
      speedPingTestUrls: ['https://speed.cloudflare.com/__down?bytes=1000'],
      ipapiUrls: ['http://ip-api.com/json/?lang=zh-CN', 'https://api.ip.sb/geoip'],
      udpTestTargets: ['8.8.8.8', '1.1.1.1'],
      routingBasicDomainStrategies: ['AsIs', 'IPIfNonMatch', 'IPOnDemand'],
      routingBasicDomainStrategies4Singbox: ['', 'prefer_ipv4', 'prefer_ipv6', 'ipv4_only', 'ipv6_only'],
      fingerprints: ['chrome', 'firefox', 'safari', 'random', 'randomized'],
      userAgents: ['', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
      mux4RayXudpProxyUDP443Options: ['reject', 'allow', 'skip'],
      mux4SboxProtocols: ['h2mux', 'smux', 'yamux'],
      fragmentPacketsOptions: ['tlshello', '1-3', 'tlshello,1-3'],
    },
  }

  const dnsProfiles = [
    {
      coreType: 'Xray',
      remarks: 'Xray DNS',
      enabled: false,
      normalDNS: jsonDns,
      tunDNS: JSON.stringify({ servers: ['https://dns.alidns.com/dns-query'] }, null, 2),
      domainStrategy4Freedom: 'UseIPv4',
      domainDNSAddress: '223.5.5.5',
      useSystemHosts: true,
    },
    {
      coreType: 'sing_box',
      remarks: 'sing-box DNS',
      enabled: true,
      normalDNS: JSON.stringify({ servers: [{ tag: 'remote', address: 'https://dns.google/dns-query', detour: 'proxy' }] }, null, 2),
      tunDNS: JSON.stringify({ servers: [{ tag: 'local', address: '223.5.5.5' }] }, null, 2),
      domainStrategy4Freedom: 'prefer_ipv4',
      domainDNSAddress: '223.5.5.5',
      useSystemHosts: false,
    },
  ]

  return {
    '/api/setup/status': { setupRequired: false },
    '/api/status': {
      coreRunning: true,
      coreType: 'Xray',
      runtimeState: 'running',
      runningProfileId: 'profile-0',
      runningProfileName: profileNames[0],
      currentProfileName: profileNames[0],
      statisticsEnabled: true,
      runtime: 'Xray 25.9.11 (Xray, Penetrates Everything.)',
      listeners: [
        { name: 'local', listening: true, listenAddress: '127.0.0.1', port: 10808, protocols: ['http', 'socks', 'udp'] },
        { name: 'lan', listening: false, listenAddress: '0.0.0.0', port: 10809, protocols: ['http'] },
      ],
      traffic: { proxyUp: 1_200_000, proxyDown: 46_000_000, directUp: 200_000, directDown: 1_000_000 },
    },
    '/api/operations': [],
    '/api/profile-groups': [
      { id: '', name: '全部', profileCount: 8, isCurrent: false },
      { id: 'airport', name: 'Airport A 2026', profileCount: 7, isCurrent: true },
      { id: 'local', name: 'Self-hosted', profileCount: 1 },
      { id: 'long-group', name: 'Group with a long name for chip overflow checking', profileCount: 0 },
    ],
    '/api/profiles': profiles,
    '/api/editor-options': editorOptions,
    '/api/subscriptions': subscriptions,
    '/api/settings': settings,
    '/api/settings/routing-profiles': [
      { id: 'route-main', remarks: 'V4 主规则集', isActive: true, enabled: true, ruleNum: 8, url: 'https://rules.example.invalid/main.json', sort: 1, locked: false },
      { id: 'route-cn', remarks: '仅国内直连', isActive: false, enabled: true, ruleNum: 4, url: '', sort: 2, locked: false },
      { id: 'route-backup', remarks: 'Backup ruleset with an intentionally long descriptive label', isActive: false, enabled: false, ruleNum: 0, url: 'https://rules.example.invalid/backup.json', sort: 3, locked: false },
    ],
    '/api/settings/routing-profiles/route-main/rules': routingRules,
    '/api/settings/routing-profiles/route-cn/rules': routingRules.slice(0, 4),
    '/api/settings/routing-profiles/route-backup/rules': [],
    '/api/settings/dns/simple': {
      directDNS: 'https://dns.alidns.com/dns-query',
      remoteDNS: '1.1.1.1',
      bootstrapDNS: '223.5.5.5',
      strategy4Freedom: 'UseIPv4',
      strategy4Proxy: 'UseIP',
      strategy4ProxyDial: 'AsIs',
      parallelQuery: true,
      serveStale: true,
      enableHappyEyeballs: false,
      useSystemHosts: true,
      addCommonHosts: true,
      fakeIP: false,
      globalFakeIp: false,
      fakeIPRange: '198.18.0.0/15',
      blockBindingQuery: true,
      blockAAAAQuery: false,
      directExpectedIPs: 'geoip:private',
      hosts: 'domain:example.com 127.0.0.1',
    },
    '/api/settings/dns/profiles': dnsProfiles,
    '/api/settings/dns/editor-options': {
      coreTypes: ['Xray', 'sing_box'],
      domainStrategies4Freedom: ['UseIPv4', 'UseIPv6', 'UseIP', 'AsIs'],
      domainStrategies4Singbox: ['prefer_ipv4', 'prefer_ipv6', 'ipv4_only', 'ipv6_only'],
      domainDnsAddresses: ['223.5.5.5', '119.29.29.29', '8.8.8.8'],
      directDnsAddresses: ['https://dns.alidns.com/dns-query', '223.5.5.5'],
      remoteDnsAddresses: ['1.1.1.1', 'https://dns.google/dns-query'],
      bootstrapDnsAddresses: ['223.5.5.5', '1.1.1.1'],
      fakeIpRanges: ['198.18.0.0/15', 'fc00::/7'],
      expectedIps: ['geoip:private', 'geoip:cn'],
    },
    '/api/settings/dns/defaults': [
      { coreType: 'Xray', normalDNS: jsonDns, tunDNS: jsonDns },
      { coreType: 'sing_box', normalDNS: jsonDns, tunDNS: jsonDns },
    ],
    '/api/settings/core-templates': [
      {
        coreType: 'Xray',
        remarks: 'Xray 主模板',
        enabled: true,
        config: JSON.stringify({ log: { loglevel: 'warning' }, inbounds: [], outbounds: [{ protocol: 'freedom', tag: 'direct' }] }, null, 2),
        tunConfig: JSON.stringify({ mtu: 9000, stack: 'gvisor' }, null, 2),
        addProxyOnly: true,
        proxyDetour: '',
      },
      {
        coreType: 'sing_box',
        remarks: 'sing-box 主模板',
        enabled: false,
        config: JSON.stringify({ log: { level: 'warn' }, inbounds: [], outbounds: [{ type: 'direct', tag: 'direct' }] }, null, 2),
        tunConfig: JSON.stringify({ mtu: 9000, stack: 'system' }, null, 2),
        addProxyOnly: false,
        proxyDetour: '',
      },
    ],
    '/api/settings/webdav': { url: 'https://dav.example.invalid/remote.php/dav/files/nova', userName: 'nova@example.invalid', dirName: 'v2rayN-backup', hasPassword: true },
    '/api/core-updates': {
      useProxy: true,
      geoFilesSelected: true,
      checkPreReleaseCoreTypes: [],
      targets: [
        { coreType: 'Xray', nameKey: 'maintenance.coreNames.xray', selected: true, isSupported: true, supportsPreRelease: true, canInstall: true, currentVersion: '25.9.11', latestVersion: '25.10.1', updateAvailable: true },
        { coreType: 'sing_box', nameKey: 'maintenance.coreNames.singBox', selected: true, isSupported: true, supportsPreRelease: false, canInstall: true, currentVersion: '1.12.0', latestVersion: '1.12.0', updateAvailable: false },
        { coreType: 'geo', nameKey: 'maintenance.geoFiles', selected: false, isSupported: true, supportsPreRelease: false, canInstall: true },
      ],
    },
    '/api/core-updates/progress': [],
    '/api/web-updates': {
      name: 'v2rayN.Web',
      selected: true,
      isSupported: true,
      canCheck: true,
      canInstall: false,
      version: '2.0.0',
      latestVersion: '2.0.0',
      commit: 'a1b2c3d',
      buildDate: '2026-10-06',
      rid: 'linux-x64',
      deployment: 'static',
    },
    '/api/logs/page': { page: 1, pageSize: 100, total: 62, items: logs() },
    '/api/subscriptions/airport/share': { url: 'https://subscription.example.invalid/share/airport-token' },
    '/api/subscriptions/local/share': { url: 'https://subscription.example.invalid/share/local-token' },
  }
}

export function screenshotApiHandler(fixtures: Record<string, unknown> = screenshotFixtures()) {
  return async (route: Route): Promise<void> => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    if (pathname === '/api/health') return route.fulfill({ json: { status: 'ok' } })
    let data = fixtures[pathname]
    if (data === undefined) {
      if (/^\/api\/settings\/routing-profiles\/[^/]+\/rules$/.test(pathname)) data = routingRules
      else if (/^\/api\/profiles\/[^/]+\/select$/.test(pathname)) data = {}
      else if (/^\/api\/subscriptions\/[^/]+\/update$/.test(pathname)) data = {}
      else data = []
    }
    return route.fulfill({ json: { success: true, data } })
  }
}
