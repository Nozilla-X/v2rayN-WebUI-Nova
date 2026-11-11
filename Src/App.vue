<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, provide, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppShell from './Shell/AppShell.vue'
import SessionScreen from './Shell/SessionScreen.vue'
import CorePanel from './Shell/CorePanel.vue'
import BackendPanel from './Shell/BackendPanel.vue'
import AppearanceDialog from './Components/Material/AppearanceDialog.vue'
import ToastViewport from './Components/Material/ToastViewport.vue'
import ConfirmDialog from './Components/Material/ConfirmDialog.vue'
import ModalHost from './Components/Modals/ModalHost.vue'
import NodeContextMenu from './Features/Nodes/NodeContextMenu.vue'
import PageLoading from './Shell/PageLoading.vue'
import { useFeedback } from './UI/useFeedback'
import { useGlobalShortcuts } from './UI/useGlobalShortcuts'
import { provideUiRequests, useUiRequests } from './UI/useUiRequests'
import { useApi } from './Composables/useApi'
import { useDns } from './Composables/useDns'
import { useEvents } from './Composables/useEvents'
import { useLogs } from './Composables/useLogs'
import { useMaintenance } from './Composables/useMaintenance'
import { useProfiles } from './Composables/useProfiles'
import { useRouting } from './Composables/useRouting'
import { useRuntime } from './Composables/useRuntime'
import { useSession } from './Composables/useSession'
import { useSettings } from './Composables/useSettings'
import { useSubscriptions } from './Composables/useSubscriptions'
import { useTemplates } from './Composables/useTemplates'
import { useTheme } from './Composables/useTheme'
import { createWriteLock } from './Composables/writeLock'
import { useBackend } from './Composables/useBackend'
import { useNodeActions } from './Features/Profiles/useNodeActions'
import { useAppRoute } from './Composables/useAppRoute'
import { readStoredValue, writeStoredValue } from './Composables/browserStorage'
import { normalizeApiBase, networkFailureKey } from './Composables/apiEndpoint'
import { navTitleKey } from './Shell/navigation'
import { APP_CONTEXT, type NovaApp } from './App/context'
import type { Dict } from './Composables/types'

const { t, locale } = useI18n()

const NodesPage = defineAsyncComponent({ loader: () => import('./Pages/NodesPage.vue'), loadingComponent: PageLoading, delay: 80 })
const SubscriptionsPage = defineAsyncComponent({ loader: () => import('./Pages/SubscriptionsPage.vue'), loadingComponent: PageLoading, delay: 80 })
const MorePage = defineAsyncComponent({ loader: () => import('./Pages/MorePage.vue'), loadingComponent: PageLoading, delay: 80 })
const RoutingPage = defineAsyncComponent({ loader: () => import('./Pages/RoutingPage.vue'), loadingComponent: PageLoading, delay: 80 })
const DnsPage = defineAsyncComponent({ loader: () => import('./Pages/DnsPage.vue'), loadingComponent: PageLoading, delay: 80 })
const SettingsPage = defineAsyncComponent({ loader: () => import('./Pages/SettingsPage.vue'), loadingComponent: PageLoading, delay: 80 })
const TemplatesPage = defineAsyncComponent({ loader: () => import('./Pages/TemplatesPage.vue'), loadingComponent: PageLoading, delay: 80 })
const MaintenancePage = defineAsyncComponent({ loader: () => import('./Pages/MaintenancePage.vue'), loadingComponent: PageLoading, delay: 80 })
const LogsPage = defineAsyncComponent({ loader: () => import('./Pages/LogsPage.vue'), loadingComponent: PageLoading, delay: 80 })

const PAGES = {
  nodes: NodesPage,
  subscriptions: SubscriptionsPage,
  more: MorePage,
  routing: RoutingPage,
  dns: DnsPage,
  settings: SettingsPage,
  templates: TemplatesPage,
  maintenance: MaintenancePage,
  logs: LogsPage,
} as const

const theme = useTheme()
const backend = useBackend()
// Legacy unscoped tokens have no trustworthy Backend identity.
try { localStorage.removeItem('v2rayn-web-token') } catch { /* Storage may be blocked. */ }

const sessionToken = ref(backend.isSameOrigin() ? readStoredValue(backend.storageKey()) || '' : '')
const authenticated = ref(false)
const loading = ref(false)
const connectionTesting = ref(false)
const showCorePanel = ref(false)
const showBackendPanel = ref(false)
const showAppearancePanel = ref(false)
const logsPaused = ref(false)
const subscriptionProgress = ref<Record<string, string>>({})
const contextMenu = ref<Dict | null>(null)
let connectionGeneration = 0

const feedback = useFeedback(t, translateKey)
const { toasts, activeConfirmation, confirmDestructive, resolveConfirmation, dismissToast, showNotice, showError } = feedback
const uiRequests = useUiRequests(confirmDestructive)
provideUiRequests(uiRequests)

const route = useAppRoute({
  beforeNavigate: async () => {
    if (!uiRequests.dirty()) return true
    return confirmDestructive(t('polish.discardChanges'))
  },
})
const activePage = route.currentPage

function translateKey(key?: string | null): string {
  if (!key) return t('common.operationDone')
  const translated = t(key)
  return translated === key ? key : translated
}

let clearSession = () => {}
const api = uiRequests.decorate(useApi({
  getToken: () => sessionToken.value,
  getBase: () => backend.base.value,
  onUnauthorized: () => clearSession(),
  translateKey,
}))
const runtime = useRuntime({ ...api, showNotice, showError })
const settingsWriteLock = createWriteLock()
const profiles = useProfiles({
  ...api, t, showNotice, showError, confirm: confirmDestructive,
  loadStatus: runtime.loadStatus,
  loadOperations: runtime.loadOperations,
  busy: runtime.busy,
  operations: runtime.operations,
  contextMenu,
})
const subscriptions = useSubscriptions({
  ...api, t, locale, showNotice, showError, confirm: confirmDestructive,
  loadOperations: runtime.loadOperations,
  loadGroups: profiles.loadGroups,
  loadProfiles: profiles.loadProfiles,
  selectedGroup: profiles.selectedGroup,
  groups: profiles.groups,
})
const routing = useRouting({ ...api, t, showNotice, showError, confirm: confirmDestructive, loadStatus: runtime.loadStatus, writeLock: settingsWriteLock })
const dns = useDns({ ...api, t, showNotice, showError })
const settings = useSettings({
  ...api, t, showNotice, showError,
  loadStatus: runtime.loadStatus,
  coreTypes: profiles.coreTypes,
  routingForm: routing.routingForm,
  routingFormRevision: routing.routingFormRevision,
  routingOptions: routing.routingOptions,
  writeLock: settingsWriteLock,
})
const templates = useTemplates({ ...api, showNotice, showError })
let clearRealtimeLogQueue = (_generation?: number) => {}
const maintenance = useMaintenance({
  ...api, t, translateKey, showNotice, showError, confirm: confirmDestructive, token: sessionToken,
  status: runtime.status,
  operations: runtime.operations,
  loadOperations: runtime.loadOperations,
  loadProfiles: profiles.loadProfiles,
})
const logs = useLogs({
  ...api, t, showNotice, showError, confirm: confirmDestructive,
  clearRealtimeQueue: (generation) => clearRealtimeLogQueue(generation),
})
const events = useEvents({
  token: sessionToken,
  activePage,
  status: runtime.status,
  applyStatus: runtime.applyStatus,
  patchStatus: runtime.patchStatus,
  logs: logs.logs,
  logTotal: logs.logTotal,
  logPage: logs.logPage,
  logPageSize: logs.logPageSize,
  logsPaused,
  onSubscriptionProgress: (progress) => {
    const id = String(progress.subscriptionId || '')
    if (id && !subscriptions.subscriptions.value.some((item) => item.id === id)) return
    subscriptionProgress.value = { ...subscriptionProgress.value, [id]: String(progress.rawLog || '').slice(0, 1000) }
  },
  request: api.request,
  resolveUrl: api.resolveUrl,
  t,
  showNotice,
  matchesLogFilter: logs.matchesLogFilter,
  noteLiveLogBatch: logs.noteLiveLogBatch,
  networkFailureMessage: () => t(networkFailureKey(backend.base.value)),
  loadGroups: profiles.loadGroups,
  loadProfiles: profiles.loadProfiles,
  loadSubscriptions: subscriptions.loadSubscriptions,
  loadStatus: runtime.loadStatus,
  loadRouting: () => routing.loadRouting({ preserveRuleDraft: true }),
  loadOperations: runtime.loadOperations,
  onCoreUpdateProgress: maintenance.recordCoreUpdateProgress,
  onCoreUpdateBatchComplete: maintenance.notifyCoreUpdateBatchComplete,
  onGeoUpdateComplete: maintenance.notifyGeoUpdateComplete,
  onSpeedTestResult: profiles.nodesPageActions.applySpeedTestResult,
  onLogsCleared: logs.clearLogsState,
})
clearRealtimeLogQueue = events.clearPendingLogQueue

async function loadPageData() {
  if (activePage.value === 'routing') await routing.loadRouting()
  if (activePage.value === 'dns') await dns.loadDns()
  if (activePage.value === 'settings') await settings.loadSettings()
  if (activePage.value === 'templates') await templates.loadTemplates()
  if (activePage.value === 'maintenance') await maintenance.loadMaintenance()
  if (activePage.value === 'logs') await logs.loadLogs()
}

async function loadConnectedData() {
  await profiles.loadEditorOptions()
  await Promise.all([settings.loadSettings(), routing.loadRouting(), loadPageData()])
  await logs.loadLogs()
}

const session = useSession({
  token: sessionToken,
  authenticated,
  loading,
  request: api.request,
  publicRequest: api.publicRequest,
  storageKey: backend.storageKey,
  t,
  showNotice,
  showError,
  closeEvents: events.resetEvents,
  openEvents: events.openEvents,
  refreshData: async () => {
    await profiles.loadGroups()
    await Promise.all([runtime.loadStatus(), profiles.loadProfiles(), subscriptions.loadSubscriptions()])
  },
  loadConnectedData,
  resetSessionData: () => {
    api.cancelPendingRequests()
    uiRequests.reset()
    logsPaused.value = false
    subscriptionProgress.value = {}
    runtime.reset()
    profiles.reset()
    subscriptions.reset()
    routing.reset()
    dns.reset()
    settings.reset()
    templates.reset()
    maintenance.reset()
    logs.reset()
    contextMenu.value = null
    showCorePanel.value = false
    showBackendPanel.value = false
    showAppearancePanel.value = false
    feedback.reset()
    void route.navigate('nodes', 'replace')
  },
  loadProfiles: profiles.loadProfiles,
})
clearSession = session.clearSession

function applyBackend(): boolean {
  backend.error.value = ''
  try {
    const normalized = normalizeApiBase(backend.draft.value)
    if (normalized !== backend.base.value) {
      const revokeOldSession = api.captureSessionRevocation()
      connectionGeneration += 1
      connectionTesting.value = false
      session.clearSession()
      backend.setBase(normalized)
      void revokeOldSession()
      session.setupStatusReady.value = true
    } else {
      backend.draft.value = normalized
    }
    return true
  } catch {
    backend.error.value = t('backend.invalidEndpoint')
    return false
  }
}

async function testConnection() {
  if (!applyBackend() || connectionTesting.value) return
  const generation = ++connectionGeneration
  connectionTesting.value = true
  try {
    const { response, payload } = await api.publicRequest('/api/health', { signal: AbortSignal.timeout(10000) })
    if (!response.ok || payload?.status !== 'ok') throw new Error(t('backend.notApi'))
    if (generation !== connectionGeneration) return
    backend.remember()
    await session.loadSetupStatus()
    if (generation === connectionGeneration) showNotice(t('backend.reachable'))
  } catch (error) {
    if (generation === connectionGeneration) showError(error)
  } finally {
    if (generation === connectionGeneration) connectionTesting.value = false
  }
}

async function loginToBackend() {
  const key = session.managementKeyDraft.value
  if (!applyBackend()) return
  const generation = connectionGeneration
  const address = backend.base.value
  session.managementKeyDraft.value = key
  await session.login()
  if (generation === connectionGeneration && address === backend.base.value && authenticated.value && sessionToken.value) {
    backend.remember(address)
  }
}

async function configureAndRemember() {
  const generation = connectionGeneration
  const address = backend.base.value
  await session.configureManagementKey()
  if (generation === connectionGeneration && address === backend.base.value && authenticated.value && sessionToken.value) {
    backend.remember(address)
  }
}

async function navigate(page: Parameters<typeof route.navigate>[0]): Promise<boolean> {
  const moved = await route.navigate(page)
  if (moved) {
    contextMenu.value = null
    profiles.selectedIds.value = []
    closeOverlays()
  }
  return moved
}

async function goBack(fallback: Parameters<typeof route.goBack>[0] = 'more') {
  await route.goBack(fallback)
}

function closeOverlays() {
  profiles.showProfileForm.value = false
  profiles.showImportForm.value = false
  profiles.showExportDialog.value = false
  subscriptions.showSubscriptionForm.value = false
  routing.showRouteForm.value = false
  routing.ruleModalState.showRuleForm = false
}

async function reloadPage() {
  if (uiRequests.dirty() && !await confirmDestructive(t('polish.discardChanges'))) return
  try {
    await Promise.all([runtime.loadStatus(), profiles.loadProfiles(), subscriptions.loadSubscriptions()])
    await loadPageData()
  } catch (error) { showError(error) }
}

function setLocale(value: string) {
  if (value === 'zh-CN' || value === 'zh-TW' || value === 'en-US') locale.value = value
}

const currentProfile = computed<Dict | null>(() => {
  const status = runtime.status.value
  const runningId = status?.runningProfileId
  const hasRuntimeProfile = ['starting', 'running', 'stopping', 'restarting', 'faulted'].includes(status?.runtimeState)
  if (hasRuntimeProfile && runningId) {
    return profiles.profiles.value.find((profile) => profile.indexId === runningId)
      || { remarks: status.runningProfileName || runningId }
  }
  return profiles.profiles.value.find((profile) => profile.isCurrent) || null
})
const brandIconMode = computed(() => runtime.status.value?.coreRunning ? 'proxy' : 'off')
const brandIconSrc = computed(() => ({ proxy: './NotifyIcon2.ico', off: './NotifyIcon1.ico' })[brandIconMode.value])
const brandIconTitle = computed(() => t(`brandState.${brandIconMode.value}`))
watch(brandIconSrc, (src) => {
  const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (favicon) favicon.href = src
}, { immediate: true })

function formatBytes(value: number | null | undefined) {
  let amount = Number(value || 0)
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unit = 0
  while (amount >= 1024 && unit < units.length - 1) { amount /= 1024; unit += 1 }
  return `${amount.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

const nodes = useNodeActions(profiles, subscriptions, settings, contextMenu, formatBytes)
const profileCoreTypeMappings = computed(() => settings.settings.value.coreTypes || [])
const shellReady = computed(() => session.setupStatusReady.value && !session.setupRequired.value)
const pageComponent = computed(() => PAGES[activePage.value])

const appContext: NovaApp = {
  t, locale, api, route, theme, backend, session, runtime, profiles, subscriptions, routing, dns,
  settings, templates, maintenance, logs, events, nodes, requests: uiRequests,
  state: {
    subscriptionProgress, logsPaused, showCorePanel, showBackendPanel, showAppearancePanel, connectionTesting,
    currentProfile, brandIconSrc, brandIconTitle, profileCoreTypeMappings, shellReady,
  },
  actions: {
    navigate, goBack, setLocale,
    setTheme: theme.setPreference,
    translateKey,
    applyBackend, testConnection, loginToBackend, configureAndRemember,
    refreshBase: session.refreshBase,
    reloadPage,
    disconnect: session.disconnect,
    formatBytes,
  },
}
provide(APP_CONTEXT, appContext)

useGlobalShortcuts({
  activePage,
  contextMenu,
  confirmationOpen: () => Boolean(activeConfirmation.value),
  cancelConfirmation: () => resolveConfirmation(false),
  modalLayers: [],
  nodes: nodes.contextActions,
})

watch(activePage, async (page) => {
  closeOverlays()
  if (!authenticated.value) return
  try { await loadPageData() } catch (error) { showError(error) }
  if (page === 'nodes') contextMenu.value = null
})

watch(locale, (value) => {
  writeStoredValue('v2rayn-web-locale', value)
  document.documentElement.lang = value
}, { immediate: true })

watch([activePage, locale], () => {
  document.title = `${t(navTitleKey(activePage.value))} · v2rayN Nova`
}, { immediate: true })

onMounted(async () => {
  if (!backend.isSameOrigin()) {
    session.setupStatusReady.value = true
    return
  }
  await session.loadSetupStatus()
  if (session.setupRequired.value || !sessionToken.value) return
  authenticated.value = true
  try {
    await session.refreshBase()
    if (authenticated.value) {
      events.openEvents()
      await loadConnectedData()
    }
  } catch (error) { showError(error) }
})
</script>

<template>
  <SessionScreen v-if="!authenticated || !shellReady" />
  <AppShell v-else>
    <Transition name="route-fade" mode="out-in">
      <KeepAlive :max="6">
        <component :is="pageComponent" :key="activePage" />
      </KeepAlive>
    </Transition>
  </AppShell>

  <CorePanel v-if="authenticated" />
  <BackendPanel v-if="authenticated" />
  <AppearanceDialog v-if="authenticated" />
  <ModalHost v-if="authenticated" />
  <NodeContextMenu v-if="authenticated" v-model="contextMenu" />

  <ConfirmDialog :request="activeConfirmation" @resolve="resolveConfirmation" />
  <ToastViewport :toasts="toasts" :close-label="t('common.close')" @dismiss="dismissToast" />
</template>
