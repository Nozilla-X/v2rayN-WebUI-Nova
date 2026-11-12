import type { ColumnDefinition } from '../../UI/columnPreferences'

export interface LabeledColumnDefinition extends ColumnDefinition {
  labelKey: string
}

/** Data columns that can be hidden. Selection, name and actions stay fixed. */
export const NODE_COLUMNS: LabeledColumnDefinition[] = [
  { id: 'type', labelKey: 'nodes.type' },
  { id: 'remarks', labelKey: 'nodes.remarks', required: true },
  { id: 'address', labelKey: 'nodes.address' },
  { id: 'port', labelKey: 'nodes.port' },
  { id: 'network', labelKey: 'nodes.network' },
  { id: 'streamSecurity', labelKey: 'nodes.tls' },
  { id: 'group', labelKey: 'nodes.groupColumn' },
  { id: 'delay', labelKey: 'nodes.delay' },
  { id: 'speed', labelKey: 'nodes.speed' },
  { id: 'todayUp', labelKey: 'nodes.todayUp' },
  { id: 'todayDown', labelKey: 'nodes.todayDown' },
  { id: 'totalUp', labelKey: 'nodes.totalUp' },
  { id: 'totalDown', labelKey: 'nodes.totalDown' },
]

export const NODE_COLUMN_STORAGE_KEY = 'v2rayn-web-nodes-columns'
