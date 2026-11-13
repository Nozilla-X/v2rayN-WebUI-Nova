import { inject, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type { Dict, ErrorHandler, Notice, Translate } from '../Composables/types'
import type { ApiClient } from '../Composables/useApi'
import type { useAppRoute } from '../Composables/useAppRoute'
import type { useBackend } from '../Composables/useBackend'
import type { useDns } from '../Composables/useDns'
import type { useEvents } from '../Composables/useEvents'
import type { useLogs } from '../Composables/useLogs'
import type { useMaintenance } from '../Composables/useMaintenance'
import type { useNodeActions } from '../Features/Profiles/useNodeActions'
import type { useProfiles } from '../Composables/useProfiles'
import type { useRouting } from '../Composables/useRouting'
import type { useRuntime } from '../Composables/useRuntime'
import type { useSession } from '../Composables/useSession'
import type { useSettings } from '../Composables/useSettings'
import type { useSubscriptions } from '../Composables/useSubscriptions'
import type { useTemplates } from '../Composables/useTemplates'
import type { useTheme } from '../Composables/useTheme'
import type { useUiRequests } from '../UI/useUiRequests'
import type { AppPage } from '../Composables/useAppRoute'

/**
 * One application-wide business context. Pages and modals read these objects;
 * they never create their own API/session state.
 */
export interface NovaApp {
  t: Translate
  locale: Ref<string>
  api: ApiClient
  feedback: {
    showNotice: Notice
    showError: ErrorHandler
  }
  route: ReturnType<typeof useAppRoute>
  theme: ReturnType<typeof useTheme>
  backend: ReturnType<typeof useBackend>
  session: ReturnType<typeof useSession>
  runtime: ReturnType<typeof useRuntime>
  profiles: ReturnType<typeof useProfiles>
  subscriptions: ReturnType<typeof useSubscriptions>
  routing: ReturnType<typeof useRouting>
  dns: ReturnType<typeof useDns>
  settings: ReturnType<typeof useSettings>
  templates: ReturnType<typeof useTemplates>
  maintenance: ReturnType<typeof useMaintenance>
  logs: ReturnType<typeof useLogs>
  events: ReturnType<typeof useEvents>
  nodes: ReturnType<typeof useNodeActions>
  requests: ReturnType<typeof useUiRequests>
  state: {
    subscriptionProgress: Ref<Record<string, string>>
    logsPaused: Ref<boolean>
    showCorePanel: Ref<boolean>
    showBackendPanel: Ref<boolean>
    showAppearancePanel: Ref<boolean>
    connectionTesting: Ref<boolean>
    currentProfile: ComputedRef<Dict | null>
    brandIconSrc: ComputedRef<string>
    brandIconTitle: ComputedRef<string>
    profileCoreTypeMappings: ComputedRef<Dict[]>
    shellReady: ComputedRef<boolean>
  }
  actions: {
    navigate: (page: AppPage) => Promise<boolean>
    goBack: (fallback?: AppPage) => Promise<void>
    setLocale: (value: string) => void
    setTheme: (value: unknown) => void
    translateKey: (key?: string | null) => string
    applyBackend: () => boolean
    testConnection: () => Promise<void>
    loginToBackend: () => Promise<void>
    configureAndRemember: () => Promise<void>
    refreshBase: () => Promise<boolean>
    reloadPage: () => Promise<void>
    disconnect: () => Promise<void>
    formatBytes: (value: number | null | undefined) => string
  }
}

export const APP_CONTEXT: InjectionKey<NovaApp> = Symbol('nova-app')

export function useNovaApp(): NovaApp {
  const app = inject(APP_CONTEXT, null)
  if (!app) throw new Error('Nova application context is unavailable')
  return app
}
