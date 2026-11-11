import { ACTION_ICONS } from './actions'
import { CORE_ICONS } from './core'
import { STATUS_ICONS } from './status'

export const ICON_PATHS: Record<string, string[]> = {
  ...CORE_ICONS,
  ...ACTION_ICONS,
  ...STATUS_ICONS,
}
