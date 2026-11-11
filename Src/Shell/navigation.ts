import type { AppPage } from '../Composables/useAppRoute'

export interface NavItem {
  id: AppPage
  labelKey: string
  icon: string
}

/** Desktop sidebar order. */
export const DESKTOP_MAIN_NAV: NavItem[] = [
  { id: 'nodes', labelKey: 'nav.nodes', icon: 'nodes' },
  { id: 'subscriptions', labelKey: 'nav.subscriptions', icon: 'subscriptions' },
]

export const DESKTOP_ADVANCED_NAV: NavItem[] = [
  { id: 'routing', labelKey: 'nav.routing', icon: 'route' },
  { id: 'dns', labelKey: 'nav.dns', icon: 'dns' },
  { id: 'settings', labelKey: 'nav.settings', icon: 'settings' },
  { id: 'templates', labelKey: 'nav.templates', icon: 'templates' },
  { id: 'maintenance', labelKey: 'nav.maintenance', icon: 'maintenance' },
  { id: 'logs', labelKey: 'nav.logs', icon: 'logs' },
]

export const MOBILE_TABS: NavItem[] = [
  { id: 'nodes', labelKey: 'nav.tabNodes', icon: 'nodes' },
  { id: 'subscriptions', labelKey: 'nav.tabSubscriptions', icon: 'subscriptions' },
  { id: 'more', labelKey: 'nav.tabMore', icon: 'more' },
]

export interface MoreLink extends NavItem {
  descriptionKey: string
}

export interface MoreGroup {
  titleKey: string
  items: MoreLink[]
}

/** The More page is a flat, two-level-max settings hub. */
export const MORE_GROUPS: MoreGroup[] = [
  {
    titleKey: 'more.network',
    items: [
      { id: 'routing', labelKey: 'nav.routing', icon: 'route', descriptionKey: 'more.routingDesc' },
      { id: 'dns', labelKey: 'nav.dns', icon: 'dns', descriptionKey: 'more.dnsDesc' },
    ],
  },
  {
    titleKey: 'more.system',
    items: [
      { id: 'settings', labelKey: 'nav.settings', icon: 'settings', descriptionKey: 'more.settingsDesc' },
      { id: 'templates', labelKey: 'nav.templates', icon: 'templates', descriptionKey: 'more.templatesDesc' },
      { id: 'maintenance', labelKey: 'nav.maintenance', icon: 'maintenance', descriptionKey: 'more.maintenanceDesc' },
      { id: 'logs', labelKey: 'nav.logs', icon: 'logs', descriptionKey: 'more.logsDesc' },
    ],
  },
]

/**
 * The top app bar owns the only page-level heading. Content sections start at
 * h2 so a page never renders its title twice.
 */
const PAGE_TITLE_KEYS: Record<AppPage, string> = {
  nodes: 'nodes.title',
  subscriptions: 'subscriptions.title',
  more: 'nav.more',
  routing: 'routing.title',
  dns: 'dns.title',
  settings: 'settings.title',
  templates: 'templates.title',
  maintenance: 'maintenance.title',
  logs: 'logs.title',
}

const PAGE_SUBTITLE_KEYS: Record<AppPage, string> = {
  nodes: 'nodes.pageSubtitle',
  subscriptions: 'subscriptions.quickUpdate',
  more: 'more.pageSubtitle',
  routing: 'more.routingDesc',
  dns: 'more.dnsDesc',
  settings: 'more.settingsDesc',
  templates: 'more.templatesDesc',
  maintenance: 'more.maintenanceDesc',
  logs: 'more.logsDesc',
}

export function navTitleKey(page: AppPage): string {
  return PAGE_TITLE_KEYS[page] || 'nodes.title'
}

export function navSubtitleKey(page: AppPage): string {
  return PAGE_SUBTITLE_KEYS[page] || 'more.pageSubtitle'
}
