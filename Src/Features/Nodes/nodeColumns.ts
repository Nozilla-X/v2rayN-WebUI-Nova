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

/** Default desktop header widths. Keys match NODE_COLUMNS plus the fixed ip column. */
export const NODE_COLUMN_DEFAULT_WIDTHS: Record<string, number> = {
  type: 100,
  remarks: 220,
  address: 220,
  port: 70,
  network: 110,
  streamSecurity: 90,
  group: 160,
  delay: 104,
  speed: 120,
  ip: 110,
  todayUp: 110,
  todayDown: 110,
  totalUp: 110,
  totalDown: 110,
}

export const NODE_COLUMN_WIDTH_STORAGE_KEY = 'v2rayn-web-nodes-columns-widths'
