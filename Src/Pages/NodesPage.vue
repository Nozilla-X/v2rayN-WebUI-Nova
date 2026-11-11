<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import NodesToolbar from '../Features/Nodes/NodesToolbar.vue'
import NodesTable from '../Features/Nodes/NodesTable.vue'
import NodesMobileList from '../Features/Nodes/NodesMobileList.vue'
import PageFeedback from '../Components/Material/PageFeedback.vue'
import ActionMenu, { type ActionMenuItem } from '../Components/Material/ActionMenu.vue'
import { useNovaApp } from '../App/context'
import { useMediaQuery } from '../UI/useMediaQuery'

const { t } = useI18n()
const app = useNovaApp()
const state = app.nodes.nodesPageState
const actions = app.nodes.nodesPageActions
const nodeActions = app.nodes
const isMobile = useMediaQuery('(max-width: 860px)')
const selected = computed(() => state.selectedIds.length)

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
    <NodesToolbar>
      <template #feedback>
        <PageFeedback scope="nodes" />
      </template>
    </NodesToolbar>

    <div class="desktop-only">
      <NodesTable />
    </div>
    <div class="mobile-only">
      <NodesMobileList />
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
  </section>
</template>

<style scoped>
.nodes-page {
  gap: var(--nova-space-3);
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
