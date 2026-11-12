import type { ColumnDefinition } from '../../UI/columnPreferences'

export interface LabeledColumnDefinition extends ColumnDefinition {
  labelKey: string
}

/** Data columns that can be hidden. Name and actions stay fixed. */
export const SUBSCRIPTION_COLUMNS: LabeledColumnDefinition[] = [
  { id: 'remarks', labelKey: 'subscriptions.name', required: true },
  { id: 'url', labelKey: 'subscriptions.url' },
  { id: 'enabled', labelKey: 'common.enabled' },
  { id: 'interval', labelKey: 'subscriptions.intervalColumn' },
  { id: 'updated', labelKey: 'subscriptions.updated' },
  { id: 'userAgent', labelKey: 'subscriptions.userAgent' },
  { id: 'filter', labelKey: 'subscriptions.filterColumn' },
  { id: 'nodes', labelKey: 'subscriptions.nodesColumn' },
]

export const SUBSCRIPTION_COLUMN_STORAGE_KEY = 'v2rayn-web-subscription-columns'
