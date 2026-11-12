import { ref, type Ref } from 'vue'
import { readStoredValue, writeStoredValue } from '../Composables/browserStorage.ts'

export interface ColumnDefinition {
  id: string
  /** Locked columns stay visible even when the user hides every other one. */
  required?: boolean
}

export function defaultVisibleColumns(columns: readonly ColumnDefinition[]): string[] {
  return columns.map((column) => column.id)
}

/**
 * Stored preferences are untrusted: unknown ids are dropped, duplicates are
 * removed and required columns are always present. A missing or malformed value
 * falls back to showing every column.
 */
export function normalizeVisibleColumns(value: unknown, columns: readonly ColumnDefinition[]): string[] {
  const required = new Set(columns.filter((column) => column.required).map((column) => column.id))
  const known = new Set(columns.map((column) => column.id))
  const stored = Array.isArray(value)
    ? new Set(value.filter((id): id is string => typeof id === 'string' && known.has(id)))
    : null
  return columns
    .map((column) => column.id)
    .filter((id) => required.has(id) || stored === null || stored.has(id))
}

export function readVisibleColumns(storageKey: string, columns: readonly ColumnDefinition[]): string[] {
  const raw = readStoredValue(storageKey)
  if (raw === null) return defaultVisibleColumns(columns)
  try {
    return normalizeVisibleColumns(JSON.parse(raw), columns)
  } catch {
    return defaultVisibleColumns(columns)
  }
}

export function writeVisibleColumns(storageKey: string, ids: readonly string[]): void {
  writeStoredValue(storageKey, JSON.stringify(ids))
}

export interface ColumnVisibility {
  visibleIds: Ref<string[]>
  isVisible: (id: string) => boolean
  setVisible: (ids: readonly string[]) => void
  reset: () => void
}

export function createColumnVisibility(columns: readonly ColumnDefinition[], storageKey: string): ColumnVisibility {
  const visibleIds = ref(readVisibleColumns(storageKey, columns))
  function setVisible(ids: readonly string[]) {
    visibleIds.value = normalizeVisibleColumns(ids, columns)
    writeVisibleColumns(storageKey, visibleIds.value)
  }
  function isVisible(id: string) {
    return visibleIds.value.includes(id)
  }
  function reset() {
    setVisible(defaultVisibleColumns(columns))
  }
  return { visibleIds, isVisible, setVisible, reset }
}
