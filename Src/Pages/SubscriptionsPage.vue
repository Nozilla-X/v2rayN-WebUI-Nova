<script setup lang="ts">
import UiButton from '../Components/Material/UiButton.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionMenu, { type ActionMenuItem } from '../Components/Material/ActionMenu.vue'
import ColumnSettingsDialog from '../Components/Material/ColumnSettingsDialog.vue'
import PageFeedback from '../Components/Material/PageFeedback.vue'
import UiCheckbox from '../Components/Material/UiCheckbox.vue'
import UiIcon from '../Components/Material/UiIcon.vue'
import { useNovaApp } from '../App/context'
import { planDragOrder } from '../Composables/movementOrder'
import type { Dict } from '../Composables/types'
import { createColumnVisibility } from '../UI/columnPreferences'
import { usePageRequests } from '../UI/useUiRequests'
import { vScrollShadow } from '../UI/scrollShadow'
import { useTableDragSort } from '../UI/tableDragSort'
import { SUBSCRIPTION_COLUMNS, SUBSCRIPTION_COLUMN_STORAGE_KEY } from '../Features/Subscriptions/subscriptionColumns'

const { t } = useI18n()
const app = useNovaApp()
const state = app.subscriptions.subscriptionsPageState
const actions = app.subscriptions.subscriptionsPageActions
const operations = app.runtime.operations
const progress = app.state.subscriptionProgress
const { status } = usePageRequests('subscriptions')
const showColumnSettings = ref(false)
const {
  visibleIds: subscriptionVisibleColumns,
  isVisible: isSubscriptionColumnVisible,
  setVisible: setSubscriptionVisibleColumns,
} = createColumnVisibility(SUBSCRIPTION_COLUMNS, SUBSCRIPTION_COLUMN_STORAGE_KEY)
const subscriptionColumnOptions = computed(() => SUBSCRIPTION_COLUMNS.map((column) => ({
  id: column.id,
  label: t(column.labelKey),
  required: column.required,
})))
const rows = computed(() => [...state.subscriptions].sort((a: Dict, b: Dict) => {
  const order = Number(a.sort ?? 0) - Number(b.sort ?? 0)
  return Number.isNaN(order) ? 0 : order
}))
const columnWidths: Record<string, number> = {
  remarks: 140,
  url: 182,
  enabled: 94,
  interval: 138,
  updated: 136,
  userAgent: 88,
  filter: 70,
  nodes: 68,
}
const subscriptionMinWidth = computed(() => 44 + 148
  + SUBSCRIPTION_COLUMNS.filter((column) => isSubscriptionColumnVisible(column.id))
    .reduce((width, column) => width + columnWidths[column.id], 0))
const subscriptionColSpan = computed(() => 2
  + SUBSCRIPTION_COLUMNS.filter((column) => isSubscriptionColumnVisible(column.id)).length)
const tableShell = ref<HTMLElement | null>(null)
const dragSort = useTableDragSort({
  container: tableShell,
  rowSelector: '[data-subscription-id]',
  getVisibleIds: () => rows.value.map((item: Dict) => String(item.id ?? '')),
  onDrop: (draggedId, targetId, after) => {
    const order = planDragOrder(
      rows.value.map((item: Dict) => String(item.id ?? '')),
      draggedId,
      targetId,
      after,
    )
    if (order) void actions.reorderSubscriptions(order)
  },
})
const draggingSubscriptionId = dragSort.draggingId
const dragPlaceholderIndex = dragSort.placeholderIndex
const dragRowHeight = dragSort.rowHeight
const isDragSorting = dragSort.isDragging
const beginSubscriptionDrag = dragSort.begin
const displayedRows = computed(() => draggingSubscriptionId.value
  ? rows.value.filter((item: Dict) => String(item.id ?? '') !== draggingSubscriptionId.value)
  : rows.value)
const activeOperations = computed(() => {
  const ids = new Set(state.subscriptions.map((item: Dict) => String(item.id ?? '')))
  return operations.value.filter((id) => !id || ids.has(id))
})
const groupCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const group of app.profiles.nodesPageState.groups) {
    if (group?.id && Number.isFinite(Number(group.profileCount))) counts[group.id] = Number(group.profileCount)
  }
  return counts
})

function isCurrent(item: Dict) { return state.selectedGroup === item.id }
function isUpdating(item: Dict) {
  const id = String(item.id ?? '')
  const path = status.started?.path || ''
  return activeOperations.value.some((operation) => !operation || operation === id)
    || Boolean(status.writes && path.endsWith(`/${encodeURIComponent(id)}/update`))
}
function progressText(item: Dict) {
  const id = String(item.id ?? '')
  return progress.value[id] || progress.value[''] || ''
}
function profileCount(item: Dict): number | null {
  const own = item.profileCount ?? item.nodeCount ?? item.count
  if (Number.isFinite(Number(own)) && own !== null && own !== undefined && own !== '') return Number(own)
  return groupCounts.value[String(item.id ?? '')] ?? null
}
function nodeCountText(item: Dict) {
  const count = profileCount(item)
  return count === null ? '' : t('nodes.count', count)
}
function intervalText(item: Dict) {
  const minutes = Number(item.autoUpdateInterval ?? 0)
  return minutes > 0 ? t('subscriptions.intervalSummary', { minutes }) : t('subscriptions.manualUpdate')
}
function updatedText(item: Dict) {
  return item.updateTime
    ? actions.formatDate(Number(item.updateTime))
    : t('subscriptions.neverUpdated')
}
function rowMenu(item: Dict): ActionMenuItem[] {
  return [
    { id: 'edit', label: t('common.edit'), icon: 'edit' },
    { id: 'share', label: t('subscriptions.share'), icon: 'share' },
    { id: 'delete', label: t('common.delete'), icon: 'delete', danger: true },
  ]
}
function chooseRowAction(item: Dict, action: string) {
  if (action === 'edit') void actions.openEditSubscription(item)
  else if (action === 'share') void actions.shareSubscription(item)
  else if (action === 'delete') void actions.deleteSubscription(item)
}
function toggleUseProxy() { state.subscriptionUseProxy = !state.subscriptionUseProxy }
</script>

<template>
  <section class="page subscriptions-page">
    <header class="page-head page-head-actions-only">
      <div class="page-actions">
        <button
          type="button"
          class="icon-btn desktop-only"
          :aria-label="t('subscriptions.columnSettings')"
          :title="t('subscriptions.columnSettings')"
          @click="showColumnSettings = true"
        >
          <UiIcon name="view-column" />
        </button>
        <label class="check proxy-toggle">
          <UiCheckbox :model-value="state.subscriptionUseProxy" @change="toggleUseProxy" />
          <span>{{ t('subscriptions.useProxy') }}</span>
        </label>
        <UiButton type="button" class="btn btn-filled" @click="actions.openAddSubscription" icon="plus">{{ t('subscriptions.addSubscription') }}
        </UiButton>
        <UiButton type="button" class="btn btn-tonal" @click="actions.updateSubscriptions(null, state.subscriptionUseProxy)" icon="refresh">{{ t('subscriptions.updateAll') }}
        </UiButton>
      </div>
    </header>

    <PageFeedback scope="subscriptions" />
    <p v-if="activeOperations.length" class="operation-status" role="status">
      <span class="status-dot is-on" />{{ t('polish.updating') }}
      <span class="muted">{{ t('polish.progressHint') }}</span>
    </p>

    <div v-if="!rows.length && status.reads" class="loading-state" role="status">
      <span class="spinner" />{{ t('common.loading') }}
    </div>
    <div v-else-if="!rows.length" class="empty-state">
      <div class="empty-icon"><UiIcon name="subscriptions" /></div>
      <strong>{{ t('subscriptions.noSubscriptions') }}</strong>
      <UiButton type="button" class="btn btn-tonal" @click="actions.openAddSubscription" icon="plus">{{ t('subscriptions.addSubscription') }}
      </UiButton>
    </div>

    <div v-else ref="tableShell" v-scroll-shadow class="desktop-only table-shell subscriptions-table-shell sticky-actions" tabindex="0">
      <table class="data-table subscription-table" :style="{ minWidth: `${subscriptionMinWidth}px` }">
        <caption class="visually-hidden">{{ t('subscriptions.title') }}</caption>
        <thead>
          <tr>
            <th class="cell-drag"><span class="visually-hidden">{{ t('subscriptions.dragToSort') }}</span></th>
            <th scope="col" class="col-remarks">{{ t('subscriptions.name') }}</th>
            <th v-if="isSubscriptionColumnVisible('url')" scope="col" class="col-url">{{ t('subscriptions.url') }}</th>
            <th v-if="isSubscriptionColumnVisible('enabled')" scope="col" class="col-enabled">{{ t('common.enabled') }}</th>
            <th v-if="isSubscriptionColumnVisible('interval')" scope="col" class="col-interval">{{ t('subscriptions.intervalColumn') }}</th>
            <th v-if="isSubscriptionColumnVisible('updated')" scope="col" class="col-updated">{{ t('subscriptions.updated') }}</th>
            <th v-if="isSubscriptionColumnVisible('userAgent')" scope="col" class="col-user-agent">{{ t('subscriptions.userAgent') }}</th>
            <th v-if="isSubscriptionColumnVisible('filter')" scope="col" class="col-filter">{{ t('subscriptions.filterColumn') }}</th>
            <th v-if="isSubscriptionColumnVisible('nodes')" scope="col" class="cell-number col-nodes">{{ t('subscriptions.nodesColumn') }}</th>
            <th scope="col" class="cell-actions">{{ t('nodes.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(item, index) in displayedRows" :key="item.id">
            <tr
              v-if="isDragSorting && dragPlaceholderIndex === index"
              class="table-drag-placeholder"
              data-drag-row-key="__placeholder__"
              aria-hidden="true"
            >
              <td :colspan="subscriptionColSpan">
                <div class="table-drag-placeholder-box" :style="{ height: `${Math.max(dragRowHeight - 4, 0)}px` }" />
              </td>
            </tr>
            <tr :data-subscription-id="item.id" :data-drag-row-key="item.id" :class="{ 'is-current': isCurrent(item) }">
              <td class="cell-drag" @click.stop>
                <button
                  type="button"
                  class="icon-btn icon-btn-small drag-handle"
                  :aria-label="t('subscriptions.dragToSort')"
                  :title="t('subscriptions.dragToSort')"
                  @pointerdown="beginSubscriptionDrag($event, String(item.id ?? ''))"
                >
                  <UiIcon name="drag-handle" :size="16" />
                </button>
              </td>
              <td class="col-remarks">
                <div class="sub-remarks">
                  <span class="sub-remarks-main" :title="item.remarks">{{ item.remarks || '—' }}</span>
                  <span v-if="isCurrent(item)" class="badge badge-primary">{{ t('common.currentGroup') }}</span>
                </div>
              </td>
              <td v-if="isSubscriptionColumnVisible('url')" class="sub-url col-url truncate" :title="item.url">{{ item.url || '—' }}</td>
              <td v-if="isSubscriptionColumnVisible('enabled')" class="col-enabled"><span class="badge" :class="{ 'badge-success': item.enabled }">{{ item.enabled ? t('common.enabled') : t('common.disabled') }}</span></td>
              <td v-if="isSubscriptionColumnVisible('interval')" class="col-interval">{{ intervalText(item) }}</td>
              <td v-if="isSubscriptionColumnVisible('updated')" class="col-updated">
                <div class="sub-updated">
                  <span :title="updatedText(item)">{{ updatedText(item) }}</span>
                  <span v-if="isUpdating(item)" class="sub-progress" :title="progressText(item)">{{ progressText(item) || t('polish.updating') }}</span>
                </div>
              </td>
              <td v-if="isSubscriptionColumnVisible('userAgent')" class="sub-detail col-user-agent" :title="item.userAgent">{{ item.userAgent || '—' }}</td>
              <td v-if="isSubscriptionColumnVisible('filter')" class="sub-detail col-filter" :title="item.filter">{{ item.filter || '—' }}</td>
              <td v-if="isSubscriptionColumnVisible('nodes')" class="cell-number col-nodes">{{ profileCount(item) ?? '—' }}</td>
              <td class="cell-actions">
                <div class="sub-row-actions">
                  <UiButton
                    type="button"
                    class="btn btn-tonal btn-small"
                    :aria-label="t(actions.subscriptionUpdateMessageKey(item.id, state.subscriptionUseProxy))"
                    @click="actions.updateSubscription(item.id)"
                   icon="refresh">{{ t('subscriptions.update') }}
                  </UiButton>
                  <ActionMenu :items="rowMenu(item)" :label="t('nodes.actions')" @select="chooseRowAction(item, $event)" />
                </div>
              </td>
            </tr>
          </template>
          <tr
            v-if="isDragSorting && dragPlaceholderIndex >= displayedRows.length"
            class="table-drag-placeholder"
            data-drag-row-key="__placeholder__"
            aria-hidden="true"
          >
            <td :colspan="subscriptionColSpan">
              <div class="table-drag-placeholder-box" :style="{ height: `${Math.max(dragRowHeight - 4, 0)}px` }" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="rows.length" class="mobile-only mobile-card-list subscriptions-mobile-list">
      <article v-for="item in rows" :key="item.id" class="mobile-card subscription-card" :class="{ 'is-current': isCurrent(item) }">
        <div class="mobile-card-head">
          <div class="mobile-card-title">
            <strong>{{ item.remarks || '—' }}</strong>
            <small :title="item.url">{{ item.url || '—' }}</small>
          </div>
          <ActionMenu :items="rowMenu(item)" :label="t('nodes.actions')" @select="chooseRowAction(item, $event)" />
        </div>
        <div class="mobile-card-meta">
          <span class="badge" :class="{ 'badge-success': item.enabled }">{{ item.enabled ? t('common.enabled') : t('common.disabled') }}</span>
          <span v-if="isCurrent(item)" class="badge badge-primary">{{ t('common.currentGroup') }}</span>
          <span class="badge">{{ intervalText(item) }}</span>
          <span v-if="profileCount(item) !== null" class="badge">{{ nodeCountText(item) }}</span>
        </div>
        <div class="subscription-update-line">
          <div class="subscription-update-copy">
            <span>{{ t('subscriptions.updated') }}: {{ updatedText(item) }}</span>
            <span v-if="isUpdating(item)" class="subscription-progress" role="status" :title="progressText(item)">
              <span class="status-dot is-on" />{{ progressText(item) || t('polish.updating') }}
            </span>
          </div>
          <UiButton type="button" class="btn btn-tonal btn-small subscription-update-button" @click="actions.updateSubscription(item.id)" icon="refresh">{{ t(actions.subscriptionUpdateMessageKey(item.id, state.subscriptionUseProxy)) }}
          </UiButton>
        </div>
      </article>
    </div>

    <ColumnSettingsDialog
      :open="showColumnSettings"
      :title="t('subscriptions.columnSettings')"
      :columns="subscriptionColumnOptions"
      :model-value="subscriptionVisibleColumns"
      @update:model-value="setSubscriptionVisibleColumns"
      @close="showColumnSettings = false"
    />
  </section>
</template>

<style scoped>
.subscriptions-page { gap: var(--nova-space-3); }
.proxy-toggle {
  padding: 4px var(--nova-space-2);
  border-radius: var(--md-sys-shape-corner-full);
}
.subscriptions-table-shell { max-width: 100%; }
.subscription-table {
  table-layout: fixed;
}
.subscription-table th,
.subscription-table td {
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Allow the longer localized header labels to wrap instead of being cut. */
.subscription-table th {
  height: auto;
  min-height: 48px;
  padding-block: 10px;
  white-space: normal;
  vertical-align: bottom;
  line-height: 1.3;
}
.subscription-table .cell-drag {
  width: 44px;
  min-width: 44px;
  padding-inline: 4px;
  text-align: center;
}
.subscription-table .col-remarks { width: 140px; }
.subscription-table .col-url { width: 182px; }
.subscription-table .col-enabled { width: 94px; }
.subscription-table .col-interval { width: 138px; }
.subscription-table .col-updated { width: 136px; }
.subscription-table .col-user-agent { width: 88px; }
.subscription-table .col-filter { width: 70px; }
.subscription-table .col-nodes { width: 68px; }
.subscription-table .cell-actions { width: 148px; min-width: 148px; }
.subscription-table td.cell-actions { padding-inline: var(--nova-space-2); }
.drag-handle {
  color: var(--md-sys-color-on-surface-variant);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
}
.drag-handle:active {
  cursor: grabbing;
}
.sub-row-actions .icon-btn-small {
  width: 32px;
  height: 32px;
}
.sub-row-actions :deep(.action-menu-trigger) {
  width: 36px;
  height: 36px;
}
.sub-remarks { display: flex; min-width: 0; align-items: center; gap: var(--nova-space-2); }
.sub-remarks-main { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub-url, .sub-detail { overflow: hidden; text-overflow: ellipsis; }
.sub-updated { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.sub-updated > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub-progress { max-width: 220px; overflow: hidden; color: var(--md-sys-color-primary); font-size: var(--md-sys-typescale-label-small-size); text-overflow: ellipsis; white-space: nowrap; }
.sub-row-actions { display: flex; min-width: 0; flex-wrap: nowrap; align-items: center; justify-content: flex-end; gap: var(--nova-space-1); }
.subscription-card { gap: var(--nova-space-3); }
.subscription-card .mobile-card-head { align-items: center; }
.subscription-card .mobile-card-title small { max-width: 100%; }
.subscription-update-line {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--nova-space-2);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
}
.subscription-update-copy { display: grid; min-width: 0; gap: var(--nova-space-1); overflow-wrap: anywhere; }
.subscription-update-button { flex: 0 0 auto; white-space: nowrap; }
.subscription-progress { display: flex; align-items: flex-start; gap: var(--nova-space-2); color: var(--md-sys-color-primary); }
.subscription-progress .status-dot { margin-top: 5px; }
/* Below desktop width the table scrolls; let the data columns win the first
   screen instead of covering them with a pinned action column. */
@media (max-width: 1200px) {
  .subscriptions-table-shell.sticky-actions .subscription-table th.cell-actions,
  .subscriptions-table-shell.sticky-actions .subscription-table td.cell-actions {
    position: static;
    box-shadow: none;
  }
}

@media (max-width: 860px) {
  .page-actions { justify-content: flex-end; }
  .proxy-toggle { min-height: var(--nova-touch-target); }
  .subscription-update-button { min-height: var(--nova-touch-target); }
}
</style>
