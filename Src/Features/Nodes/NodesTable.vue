<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import { planDragPosition } from '../../Composables/movementOrder'
import type { Dict } from '../../Composables/types'
import { vScrollShadow } from '../../UI/scrollShadow'
import { useTableDragSort } from '../../UI/tableDragSort'

const props = defineProps<{ visibleColumns: readonly string[] }>()
const { t } = useI18n()
const app = useNovaApp()
const state = app.nodes.nodesPageState
const actions = app.nodes.nodesPageActions

const visible = computed(() => new Set(props.visibleColumns))
const showIp = computed(() => Boolean(state.showIpInfoColumn))
const dataColumnIds = ['type', 'address', 'port', 'network', 'streamSecurity', 'group', 'delay', 'speed', 'todayUp', 'todayDown', 'totalUp', 'totalDown']
const columnWidths: Record<string, number> = {
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
const colSpan = computed(() => 4 + dataColumnIds.filter((id) => isVisible(id)).length + (showIp.value ? 1 : 0))
const minTableWidth = computed(() => 44 + 44 + 88 + columnWidths.remarks
  + dataColumnIds.filter((id) => isVisible(id)).reduce((width, id) => width + columnWidths[id], 0)
  + (showIp.value ? columnWidths.ip : 0))
const selectionIndeterminate = computed(() => state.selectedIds.length > 0 && !state.allVisibleSelected)
const tableShell = ref<HTMLElement | null>(null)
const dragSort = useTableDragSort({
  container: tableShell,
  rowSelector: '[data-profile-id]',
  getVisibleIds: () => state.filteredProfiles.map((profile: Dict) => profile.indexId),
  onDrop: (draggedId, targetId, after) => {
    const position = planDragPosition(
      state.profiles.map((item: Dict) => item.indexId),
      draggedId,
      targetId,
      after,
    )
    if (position !== null) void actions.moveProfileToPosition(draggedId, position)
  },
})
const draggingProfileId = dragSort.draggingId
const dragPlaceholderIndex = dragSort.placeholderIndex
const dragRowHeight = dragSort.rowHeight
const isDragSorting = dragSort.isDragging
const beginProfileDrag = dragSort.begin
const displayedProfiles = computed(() => draggingProfileId.value
  ? state.filteredProfiles.filter((profile: Dict) => profile.indexId !== draggingProfileId.value)
  : state.filteredProfiles)

function isVisible(id: string) {
  return visible.value.has(id)
}

function sortState(column: string) {
  return state.sorting.column === column ? (state.sorting.ascending ? 'ascending' : 'descending') : 'none'
}

function formatSpeed(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

function preventRangeTextSelection(event: MouseEvent) {
  if (!event.shiftKey || event.button !== 0) return
  const target = event.target
  if (target instanceof Element && target.closest('button, input, select, a')) return
  event.preventDefault()
  window.getSelection()?.removeAllRanges()
}
</script>

<template>
  <div ref="tableShell" v-scroll-shadow class="table-shell nodes-table-shell">
    <table class="data-table profile-table" :style="{ minWidth: `${minTableWidth}px` }">
      <thead>
        <tr>
          <th class="cell-check">
            <UiCheckbox
              :model-value="state.allVisibleSelected"
              :indeterminate="selectionIndeterminate"
              :aria-label="t('common.selected', { count: state.filteredProfiles.length })"
              @change="actions.toggleAllVisible"
            />
            <span
              v-if="state.selectedIds.length"
              class="selection-count"
              :aria-label="t('common.selected', { count: state.selectedIds.length })"
            >{{ state.selectedIds.length }}</span>
          </th>
          <th class="cell-drag"><span class="visually-hidden">{{ t('nodes.dragToSort') }}</span></th>
          <th v-if="isVisible('type')" :aria-sort="sortState('ConfigType')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('ConfigType')">
              {{ t('nodes.type') }}<UiIcon v-if="sortState('ConfigType') !== 'none'" :name="sortState('ConfigType') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th :aria-sort="sortState('Remarks')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('Remarks')">
              {{ t('nodes.remarks') }}<UiIcon v-if="sortState('Remarks') !== 'none'" :name="sortState('Remarks') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th v-if="isVisible('address')" :aria-sort="sortState('Address')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('Address')">
              {{ t('nodes.address') }}<UiIcon v-if="sortState('Address') !== 'none'" :name="sortState('Address') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th v-if="isVisible('port')" class="cell-number" :aria-sort="sortState('Port')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('Port')">
              {{ t('nodes.port') }}<UiIcon v-if="sortState('Port') !== 'none'" :name="sortState('Port') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th v-if="isVisible('network')" :aria-sort="sortState('Network')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('Network')">
              {{ t('nodes.network') }}<UiIcon v-if="sortState('Network') !== 'none'" :name="sortState('Network') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th v-if="isVisible('streamSecurity')" :aria-sort="sortState('StreamSecurity')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('StreamSecurity')">
              {{ t('nodes.tls') }}<UiIcon v-if="sortState('StreamSecurity') !== 'none'" :name="sortState('StreamSecurity') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th v-if="isVisible('group')" :aria-sort="sortState('SubRemarks')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('SubRemarks')">
              {{ t('nodes.groupColumn') }}<UiIcon v-if="sortState('SubRemarks') !== 'none'" :name="sortState('SubRemarks') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th v-if="isVisible('delay')" class="cell-number cell-delay" :aria-sort="sortState('DelayVal')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('DelayVal')">
              {{ t('nodes.delay') }}<UiIcon v-if="sortState('DelayVal') !== 'none'" :name="sortState('DelayVal') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th v-if="isVisible('speed')" class="cell-number cell-speed" :aria-sort="sortState('SpeedVal')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('SpeedVal')">
              {{ t('nodes.speed') }}<UiIcon v-if="sortState('SpeedVal') !== 'none'" :name="sortState('SpeedVal') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th v-if="showIp">{{ t('nodes.ip') }}</th>
          <th v-if="isVisible('todayUp')" class="cell-number">{{ t('nodes.todayUp') }}</th>
          <th v-if="isVisible('todayDown')" class="cell-number">{{ t('nodes.todayDown') }}</th>
          <th v-if="isVisible('totalUp')" class="cell-number">{{ t('nodes.totalUp') }}</th>
          <th v-if="isVisible('totalDown')" class="cell-number">{{ t('nodes.totalDown') }}</th>
          <th class="cell-actions">{{ t('nodes.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(profile, index) in displayedProfiles" :key="profile.indexId">
          <tr
            v-if="isDragSorting && dragPlaceholderIndex === index"
            class="table-drag-placeholder"
            data-drag-row-key="__placeholder__"
            aria-hidden="true"
          >
            <td :colspan="colSpan">
              <div class="table-drag-placeholder-box" :style="{ height: `${Math.max(dragRowHeight - 4, 0)}px` }" />
            </td>
          </tr>
          <tr
            :data-profile-id="profile.indexId"
            :data-drag-row-key="profile.indexId"
            :tabindex="state.focusedProfileId === profile.indexId ? 0 : -1"
            :aria-current="profile.isCurrent ? 'true' : undefined"
            :aria-selected="state.selectedIds.includes(profile.indexId)"
            :class="{
              'is-current': profile.isCurrent,
              'is-selected': state.selectedIds.includes(profile.indexId),
            }"
            @focus="actions.setFocusedProfile(profile.indexId)"
            @mousedown="preventRangeTextSelection"
            @click="actions.focusProfile($event, profile)"
            @keydown="actions.handleRowKeydown($event, profile)"
            @dblclick="actions.selectProfile(profile)"
            @contextmenu.stop.prevent="actions.openContext($event, profile)"
          >
            <td class="cell-check" @click.stop @dblclick.stop>
              <UiCheckbox
                :model-value="state.selectedIds.includes(profile.indexId)"
                :aria-label="profile.remarks || profile.address"
                @change="actions.toggleProfile(profile.indexId)"
              />
            </td>
            <td class="cell-drag" @click.stop @dblclick.stop>
              <button
                type="button"
                class="icon-btn icon-btn-small drag-handle"
                :aria-label="t('nodes.dragToSort')"
                :title="t('nodes.dragToSort')"
                @pointerdown="beginProfileDrag($event, profile.indexId)"
              >
                <UiIcon name="drag-handle" :size="16" />
              </button>
            </td>
            <td v-if="isVisible('type')"><span class="badge badge-primary protocol-code">{{ profile.protocol }}</span></td>
            <td class="name-cell">
              <div class="name-cell-inner">
                <UiIcon v-if="profile.isCurrent" class="current-marker" name="check" :size="14" :label="t('nodes.current')" />
                <span class="truncate" :title="profile.remarks">{{ profile.remarks || '—' }}</span>
              </div>
            </td>
            <td v-if="isVisible('address')">
              <span class="mono endpoint-value" :title="`${profile.address}:${profile.port}`">{{ profile.address }}</span>
            </td>
            <td v-if="isVisible('port')" class="cell-number">{{ profile.port }}</td>
            <td v-if="isVisible('network')"><span class="badge">{{ profile.network || '—' }}</span></td>
            <td v-if="isVisible('streamSecurity')"><span class="badge">{{ profile.streamSecurity || '—' }}</span></td>
            <td v-if="isVisible('group')"><span class="truncate group-value" :title="profile.subscriptionName">{{ profile.subscriptionName || t('common.none') }}</span></td>
            <td v-if="isVisible('delay')" class="cell-number cell-delay" :class="{ 'danger-text': profile.delay < 0 }">{{ actions.formatDelay(profile.delay) }}</td>
            <td v-if="isVisible('speed')" class="cell-number cell-speed">{{ formatSpeed(profile.speed) }}</td>
            <td v-if="showIp"><span class="truncate ip-value" :title="profile.ipInfo">{{ profile.ipInfo || '—' }}</span></td>
            <td v-if="isVisible('todayUp')" class="cell-number metric-muted">{{ actions.formatBytes(profile.todayUp) }}</td>
            <td v-if="isVisible('todayDown')" class="cell-number metric-muted">{{ actions.formatBytes(profile.todayDown) }}</td>
            <td v-if="isVisible('totalUp')" class="cell-number metric-muted">{{ actions.formatBytes(profile.totalUp) }}</td>
            <td v-if="isVisible('totalDown')" class="cell-number metric-muted">{{ actions.formatBytes(profile.totalDown) }}</td>
            <td class="cell-actions" @dblclick.stop>
              <button
                type="button"
                class="icon-btn icon-btn-small"
                :aria-label="t('nodes.actions')"
                :title="t('nodes.actions')"
                @click.stop="actions.openContext($event, profile)"
              >
                <UiIcon name="more" />
              </button>
            </td>
          </tr>
        </template>
        <tr
          v-if="isDragSorting && dragPlaceholderIndex >= displayedProfiles.length"
          class="table-drag-placeholder"
          data-drag-row-key="__placeholder__"
          aria-hidden="true"
        >
          <td :colspan="colSpan">
            <div class="table-drag-placeholder-box" :style="{ height: `${dragRowHeight}px` }" />
          </td>
        </tr>
        <tr v-if="!state.filteredProfiles.length">
          <td :colspan="colSpan" class="empty-cell">
            <div class="empty-state" style="min-height: 140px">
              <div class="empty-icon"><UiIcon name="nodes" /></div>
              <strong>{{ state.filter ? t('common.noResults') : t('nodes.noProfile') }}</strong>
              <UiButton
                v-if="state.filter"
                type="button"
                class="btn btn-text btn-small"
                @click="state.filter = ''; actions.loadProfiles()"
              >
                {{ t('polish.clearSearch') }}
              </UiButton>
              <UiButton v-else type="button" class="btn btn-tonal btn-small" @click="actions.openAddProfile">
                {{ t('nodes.addNode') }}
              </UiButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.nodes-table-shell {
  /*
   * Track the window height instead of capping at a fixed 820px. The 268px
   * budget covers the top bar (68), page padding (2 × 32), toolbar (68),
   * page gaps (2 × 12), footer hint (20) and the workspace tail (24), so the
   * table ends just above the bottom inset on any display. The floor keeps
   * short windows usable; the workspace scrolls if the budget is exceeded.
   */
  max-height: max(320px, calc(100dvh - 268px));
}

.profile-table .cell-drag {
  width: 44px;
  min-width: 44px;
  padding-inline: 4px;
  text-align: center;
}

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

/* Reserve room for streaming test results so columns do not resize as
   "untested" placeholders turn into latency and speed values. */
.profile-table .cell-delay {
  width: 104px;
  min-width: 104px;
  white-space: nowrap;
}

.profile-table .cell-speed {
  width: 120px;
  min-width: 120px;
  white-space: nowrap;
}

.name-cell {
  position: relative;
  min-width: 160px;
  /* Reserve the trailing marker gutter on every row so flags and names keep the
     same left edge as the header whether or not the row is current. */
  padding-inline-end: calc(var(--nova-space-3) + 22px);
}

/* Cap the visible content without capping the table cell itself: a max-width on
   the cell leaves the stretched column without a bottom border when optional
   columns are hidden. */
.name-cell-inner {
  display: flex;
  max-width: 280px;
  align-items: center;
  gap: var(--nova-space-2);
}

.current-marker {
  position: absolute;
  top: 50%;
  inset-inline-end: var(--nova-space-3);
  color: var(--md-sys-color-tertiary);
  transform: translateY(-50%);
}

.endpoint-value,
.group-value,
.ip-value {
  display: inline-block;
  max-width: 220px;
  vertical-align: middle;
}

.metric-muted {
  color: var(--md-sys-color-on-surface-variant);
  font-variant-numeric: tabular-nums;
}

.selection-count {
  position: absolute;
  top: 5px;
  inset-inline-start: calc(50% + 9px);
  display: inline-flex;
  min-width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  padding-inline: 4px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  font-weight: var(--md-sys-typescale-weight-semibold);
  line-height: 1;
  pointer-events: none;
}

.protocol-code {
  font-family: var(--md-sys-typescale-font-mono);
  text-transform: uppercase;
}

.nodes-table-shell :deep(.data-table th.cell-actions),
.nodes-table-shell :deep(.data-table td.cell-actions) {
  position: sticky;
  right: 0;
  width: 88px;
  min-width: 88px;
}

.nodes-table-shell :deep(.data-table th.cell-actions) {
  z-index: 3;
  background: var(--md-sys-color-surface-container);
}

.nodes-table-shell :deep(.data-table td.cell-actions) {
  z-index: 1;
  background: var(--nova-color-card);
}

.nodes-table-shell.is-scrollable-x:not(.is-scroll-end) :deep(.data-table td.cell-actions) {
  box-shadow: -8px 0 12px -12px var(--md-sys-color-on-surface);
}

.nodes-table-shell :deep(.data-table tbody tr:hover td.cell-actions) {
  background-color: var(--nova-color-card);
  background-image: linear-gradient(var(--nova-color-state-hover), var(--nova-color-state-hover));
}

.nodes-table-shell :deep(.data-table tbody tr.is-current td.cell-actions) {
  background: var(--nova-color-current-row);
}

.nodes-table-shell :deep(.data-table tbody tr.is-selected td.cell-actions),
.nodes-table-shell :deep(.data-table tbody tr.is-current.is-selected td.cell-actions) {
  background: var(--nova-color-selected-row);
}
</style>
