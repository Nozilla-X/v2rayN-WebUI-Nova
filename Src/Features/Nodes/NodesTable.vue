<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import { vScrollShadow } from '../../UI/scrollShadow'

const { t } = useI18n()
const app = useNovaApp()
const state = app.nodes.nodesPageState
const actions = app.nodes.nodesPageActions

const showIp = computed(() => Boolean(state.showIpInfoColumn))
const colSpan = computed(() => showIp.value ? 16 : 15)
const selectionIndeterminate = computed(() => state.selectedIds.length > 0 && !state.allVisibleSelected)

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
  <div v-scroll-shadow class="table-shell nodes-table-shell">
    <table class="data-table profile-table">
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
          <th :aria-sort="sortState('ConfigType')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('ConfigType')">
              {{ t('nodes.type') }}<UiIcon v-if="sortState('ConfigType') !== 'none'" :name="sortState('ConfigType') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th :aria-sort="sortState('Remarks')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('Remarks')">
              {{ t('nodes.remarks') }}<UiIcon v-if="sortState('Remarks') !== 'none'" :name="sortState('Remarks') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th :aria-sort="sortState('Address')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('Address')">
              {{ t('nodes.address') }}<UiIcon v-if="sortState('Address') !== 'none'" :name="sortState('Address') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th class="cell-number" :aria-sort="sortState('Port')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('Port')">
              {{ t('nodes.port') }}<UiIcon v-if="sortState('Port') !== 'none'" :name="sortState('Port') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th :aria-sort="sortState('Network')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('Network')">
              {{ t('nodes.network') }}<UiIcon v-if="sortState('Network') !== 'none'" :name="sortState('Network') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th :aria-sort="sortState('StreamSecurity')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('StreamSecurity')">
              {{ t('nodes.tls') }}<UiIcon v-if="sortState('StreamSecurity') !== 'none'" :name="sortState('StreamSecurity') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th :aria-sort="sortState('SubRemarks')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('SubRemarks')">
              {{ t('nodes.groupColumn') }}<UiIcon v-if="sortState('SubRemarks') !== 'none'" :name="sortState('SubRemarks') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th class="cell-number cell-delay" :aria-sort="sortState('DelayVal')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('DelayVal')">
              {{ t('nodes.delay') }}<UiIcon v-if="sortState('DelayVal') !== 'none'" :name="sortState('DelayVal') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th class="cell-number cell-speed" :aria-sort="sortState('SpeedVal')">
            <button type="button" class="sort-button" @click="actions.sortProfiles('SpeedVal')">
              {{ t('nodes.speed') }}<UiIcon v-if="sortState('SpeedVal') !== 'none'" :name="sortState('SpeedVal') === 'ascending' ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
          </th>
          <th v-if="showIp">{{ t('nodes.ip') }}</th>
          <th class="cell-number">{{ t('nodes.todayUp') }}</th>
          <th class="cell-number">{{ t('nodes.todayDown') }}</th>
          <th class="cell-number">{{ t('nodes.totalUp') }}</th>
          <th class="cell-number">{{ t('nodes.totalDown') }}</th>
          <th class="cell-actions">{{ t('nodes.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="profile in state.filteredProfiles"
          :key="profile.indexId"
          :data-profile-id="profile.indexId"
          :tabindex="state.focusedProfileId === profile.indexId ? 0 : -1"
          :aria-current="profile.isCurrent ? 'true' : undefined"
          :aria-selected="state.selectedIds.includes(profile.indexId)"
          :class="{ 'is-current': profile.isCurrent, 'is-selected': state.selectedIds.includes(profile.indexId) }"
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
          <td><span class="badge badge-primary protocol-code">{{ profile.protocol }}</span></td>
          <td class="name-cell">
            <UiIcon v-if="profile.isCurrent" class="current-marker" name="check" :size="14" :label="t('nodes.current')" />
            <span class="truncate" :title="profile.remarks">{{ profile.remarks || '—' }}</span>
          </td>
          <td>
            <span class="mono endpoint-value" :title="`${profile.address}:${profile.port}`">{{ profile.address }}</span>
          </td>
          <td class="cell-number">{{ profile.port }}</td>
          <td><span class="badge">{{ profile.network || '—' }}</span></td>
          <td><span class="badge">{{ profile.streamSecurity || '—' }}</span></td>
          <td><span class="truncate group-value" :title="profile.subscriptionName">{{ profile.subscriptionName || t('common.none') }}</span></td>
          <td class="cell-number cell-delay" :class="{ 'danger-text': profile.delay < 0 }">{{ actions.formatDelay(profile.delay) }}</td>
          <td class="cell-number cell-speed">{{ formatSpeed(profile.speed) }}</td>
          <td v-if="showIp"><span class="truncate ip-value" :title="profile.ipInfo">{{ profile.ipInfo || '—' }}</span></td>
          <td class="cell-number metric-muted">{{ actions.formatBytes(profile.todayUp) }}</td>
          <td class="cell-number metric-muted">{{ actions.formatBytes(profile.todayDown) }}</td>
          <td class="cell-number metric-muted">{{ actions.formatBytes(profile.totalUp) }}</td>
          <td class="cell-number metric-muted">{{ actions.formatBytes(profile.totalDown) }}</td>
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
  max-height: min(68dvh, 820px);
}

.profile-table {
  min-width: 1640px;
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
  display: flex;
  min-width: 160px;
  max-width: 280px;
  align-items: center;
  gap: var(--nova-space-2);
  /* Reserve the trailing marker gutter on every row so flags and names keep the
     same left edge as the header whether or not the row is current. */
  padding-inline-end: calc(var(--nova-space-3) + 22px);
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
