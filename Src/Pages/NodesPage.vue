<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import NodesToolbar from '../Features/Nodes/NodesToolbar.vue'
import NodesTable from '../Features/Nodes/NodesTable.vue'
import NodesMobileList from '../Features/Nodes/NodesMobileList.vue'
import PageFeedback from '../Components/Material/PageFeedback.vue'
import ActionMenu, { type ActionMenuItem } from '../Components/Material/ActionMenu.vue'
import ColumnSettingsDialog from '../Components/Material/ColumnSettingsDialog.vue'
import UiIcon from '../Components/Material/UiIcon.vue'
import { useNovaApp } from '../App/context'
import { useMediaQuery } from '../UI/useMediaQuery'
import { createColumnVisibility } from '../UI/columnPreferences'
import { NODE_COLUMNS, NODE_COLUMN_STORAGE_KEY } from '../Features/Nodes/nodeColumns'

const { t } = useI18n()
const app = useNovaApp()
const state = app.nodes.nodesPageState
const actions = app.nodes.nodesPageActions
const nodeActions = app.nodes
const isMobile = useMediaQuery('(max-width: 860px)')
const selected = computed(() => state.selectedIds.length)
const showColumnSettings = ref(false)
const {
  visibleIds: nodeVisibleColumns,
  setVisible: setNodeVisibleColumns,
} = createColumnVisibility(NODE_COLUMNS, NODE_COLUMN_STORAGE_KEY)
const nodeColumnOptions = computed(() => NODE_COLUMNS.map((column) => ({
  id: column.id,
  label: t(column.labelKey),
  required: column.required,
})))

/*
 * A subscription-group switch replaces every row, so the new list enters with
 * a short fade and lift instead of snapping. The revision is bumped only after
 * the replacement rows have loaded, which keeps the old rows visible during the
 * request. Reduced motion shows the final state at once.
 */
const groupSwitching = ref(false)
let groupSwitchFrame = 0
let groupSwitchTimer = 0

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

watch(() => state.groupSwitchRevision, () => {
  if (prefersReducedMotion()) return
  if (groupSwitchFrame) cancelAnimationFrame(groupSwitchFrame)
  if (groupSwitchTimer) window.clearTimeout(groupSwitchTimer)
  groupSwitching.value = false
  // Restart the CSS animation on the first frame that renders the new rows.
  groupSwitchFrame = requestAnimationFrame(() => {
    groupSwitchFrame = 0
    groupSwitching.value = true
    groupSwitchTimer = window.setTimeout(() => {
      groupSwitchTimer = 0
      groupSwitching.value = false
    }, 280)
  })
})

onBeforeUnmount(() => {
  if (groupSwitchFrame) cancelAnimationFrame(groupSwitchFrame)
  if (groupSwitchTimer) window.clearTimeout(groupSwitchTimer)
})

const bulkItems = computed<ActionMenuItem[]>(() => [
  { id: 'copy', label: t('nodes.copySelected'), icon: 'copy' },
  { id: 'delete', label: t('nodes.removeSelected'), icon: 'delete', danger: true },
  { id: 'sep-move', separator: true },
  { id: 'move-top', label: t('nodes.top'), icon: 'move-top' },
  { id: 'move-up', label: t('nodes.up'), icon: 'move-up' },
  { id: 'move-down', label: t('nodes.down'), icon: 'move-down' },
  { id: 'move-bottom', label: t('nodes.bottom'), icon: 'move-bottom' },
  { id: 'position', label: `${t('nodes.position')}…`, icon: 'drag-handle' },
  { id: 'sep-test', separator: true },
  { id: 'mixedtest', label: t('nodes.mixedtest'), icon: 'speed' },
  { id: 'fastRealping', label: t('nodes.fastRealping'), icon: 'activity' },
  { id: 'sep-share', separator: true },
  { id: 'share', label: t('nodes.shareProfile'), icon: 'share' },
  { id: 'custom-export', label: `${t('nodes.customExport')}…`, icon: 'export' },
])

function bulkAction(id: string) {
  if (id === 'copy' || id === 'delete') void actions.runProfileAction(id)
  else if (id.startsWith('move-')) void actions.moveSelected(id.slice('move-'.length))
  else if (id === 'position') void actions.moveSelectedPosition()
  else if (id === 'mixedtest' || id === 'fastRealping') void actions.startSpeedTest(id)
  else if (id === 'share') nodeActions.nodesPageActions.shareSelected()
  else if (id === 'custom-export') void actions.exportSelected()
}
</script>

<template>
  <section class="page nodes-page">
    <NodesToolbar @open-column-settings="showColumnSettings = true">
      <template #feedback>
        <PageFeedback scope="nodes" />
      </template>
    </NodesToolbar>

    <div class="desktop-only">
      <div class="nodes-group-view" :class="{ 'is-group-entering': groupSwitching }">
        <NodesTable :visible-columns="nodeVisibleColumns" />
      </div>
    </div>
    <div class="mobile-only">
      <div class="nodes-group-view" :class="{ 'is-group-entering': groupSwitching }">
        <NodesMobileList />
      </div>
    </div>

    <div class="table-footer desktop-only">
      <span>{{ t('nodes.regexHint') }}</span>
      <span>{{ t('polish.nodeKeyboard') }}</span>
    </div>

    <div v-if="isMobile && selected" class="mobile-bulk-bar">
      <span class="bulk-count">{{ t('common.selected', { count: selected }) }}</span>
      <div class="row">
        <ActionMenu :items="bulkItems" :label="t('nodes.actions')" @select="bulkAction" />
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('common.clearSelection')"
          :title="t('common.clearSelection')"
          @click="state.selectedIds = []"
        >
          <UiIcon name="close" />
        </button>
      </div>
    </div>

    <ColumnSettingsDialog
      :open="showColumnSettings"
      :title="t('nodes.columnSettings')"
      :columns="nodeColumnOptions"
      :model-value="nodeVisibleColumns"
      @update:model-value="setNodeVisibleColumns"
      @close="showColumnSettings = false"
    />
  </section>
</template>

<style scoped>
.nodes-page {
  gap: var(--nova-space-3);
}

.nodes-group-view {
  min-width: 0;
}

/* This wrapper is not a direct child of .page, so toggling the class never
   swaps the page-item-enter animation and replays the page entrance. */
.nodes-group-view.is-group-entering {
  animation: nodes-group-enter var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate);
}

@keyframes nodes-group-enter {
  from {
    opacity: 0.35;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nodes-group-view.is-group-entering {
    animation: none;
  }
}

.table-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--nova-space-2);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
}

</style>
