<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionMenu, { type ActionMenuItem } from '../../Components/Material/ActionMenu.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import { planDragPosition } from '../../Composables/movementOrder'
import type { Dict } from '../../Composables/types'
import { scrollDisclosureIntoView } from '../../UI/detailsMotion'
import { useListDragSort } from '../../UI/listDragSort'
import { useTableDragSort } from '../../UI/tableDragSort'
import { usePageRequests } from '../../UI/useUiRequests'
import { vScrollShadow } from '../../UI/scrollShadow'
import RoutingRawEditor from './RoutingRawEditor.vue'

const { t } = useI18n()
const app = useNovaApp()
const state = app.routing.routingPageState
const actions = app.routing.routingPageActions
const { status } = usePageRequests('routing')
const fileInput = ref<HTMLInputElement | null>(null)
const allSelected = computed(() => state.routingRules.length > 0 && state.selectedRuleIds.length === state.routingRules.length)
const selectionIndeterminate = computed(() => state.selectedRuleIds.length > 0 && !allSelected.value)
const hasSelected = computed(() => state.selectedRuleIds.length > 0)
const hasUrl = computed(() => Boolean(state.selectedRoute?.url?.trim()))
const directions = ['top', 'up', 'down', 'bottom'] as const
const expandedRuleIds = ref<string[]>([])
const ruleTableShell = ref<HTMLElement | null>(null)
const ruleCards = ref<HTMLElement | null>(null)
const RULE_COLSPAN = 14

const tableDrag = useTableDragSort({
  container: ruleTableShell,
  rowSelector: '[data-rule-id]',
  getVisibleIds: () => state.routingRules.map((rule: Dict) => rule.id),
  onDrop: (draggedId, targetId, after) => {
    const position = planDragPosition(
      state.routingRules.map((rule: Dict) => rule.id),
      draggedId,
      targetId,
      after,
    )
    if (position !== null) void actions.moveRoutingRuleToPosition(draggedId, position)
  },
})
const draggingRuleId = tableDrag.draggingId
const dragPlaceholderIndex = tableDrag.placeholderIndex
const dragRowHeight = tableDrag.rowHeight
const isDragSorting = tableDrag.isDragging
const beginRuleDrag = tableDrag.begin
const displayedRules = computed(() => draggingRuleId.value
  ? state.routingRules.filter((rule: Dict) => rule.id !== draggingRuleId.value)
  : state.routingRules)

const cardDrag = useListDragSort({
  container: ruleCards,
  itemSelector: '.rule-card',
  getIds: () => state.routingRules.map((rule: Dict) => rule.id),
  onReorder: (ids) => {
    const byId = new Map(state.routingRules.map((rule: Dict) => [rule.id, rule]))
    const next = ids.map((id) => byId.get(id)).filter((rule): rule is Dict => Boolean(rule))
    if (next.length === state.routingRules.length) state.routingRules = next
  },
  onDrop: (ids, draggedId) => {
    const position = ids.indexOf(draggedId)
    if (position >= 0) void actions.moveRoutingRuleToPosition(draggedId, position)
  },
  onCancel: () => void actions.loadRules(),
})
const draggingCardId = cardDrag.draggingId
const beginRuleCardDrag = cardDrag.begin

const importItems = computed<ActionMenuItem[]>(() => [
  { id: 'append', label: t('routing.append'), icon: 'check', checked: state.appendRules },
  { id: 'sep-append', separator: true },
  { id: 'file', label: t('routing.importFromFile'), icon: 'file' },
  { id: 'clipboard', label: t('routing.importFromClipboard'), icon: 'clipboard' },
  { id: 'url', label: t('routing.importFromUrl'), icon: 'link', disabled: !hasUrl.value },
])

const batchItems = computed<ActionMenuItem[]>(() => [
  { id: 'export', label: t('routing.exportSelected'), icon: 'export', disabled: !hasSelected.value },
  { id: 'sep-move', separator: true },
  ...directions.map((direction) => ({
    id: `move-${direction}`,
    label: t(`nodes.${direction}`),
    icon: `move-${direction}`,
    disabled: !hasSelected.value,
  })),
  { id: 'sep-delete', separator: true },
  {
    id: 'delete',
    label: state.deletingSelectedRules ? t('common.loading') : t('common.deleteSelected', { count: state.selectedRuleIds.length }),
    icon: 'delete',
    danger: true,
    disabled: !hasSelected.value || Boolean(state.deletingSelectedRules),
  },
])

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : value === null || value === undefined || value === '' ? [] : [String(value)]
}

function values(rule: Record<string, any>, field: string) {
  return list(rule[field]).join(', ') || '—'
}

const RULE_META_FIELDS = ['inboundTag', 'domain', 'ip', 'port', 'network', 'protocol', 'process'] as const

function metaFields(rule: Record<string, any>) {
  return RULE_META_FIELDS.filter((field) => {
    const value = rule[field]
    return Array.isArray(value) ? value.length > 0 : value !== '' && value !== null && value !== undefined
  })
}

function matchers(rule: Record<string, any>) {
  return [
    ...list(rule.domain), ...list(rule.ip), ...list(rule.process),
    rule.port, rule.network, ...list(rule.protocol), ...list(rule.inboundTag),
  ].filter(Boolean).join(', ') || '—'
}

function fallbackName(rule: Record<string, any>) {
  return String(rule.domain?.[0] || rule.ip?.[0] || rule.process?.[0] || rule.outboundTag || '—')
}

function toggleRule(id: string) {
  state.selectedRuleIds = state.selectedRuleIds.includes(id)
    ? state.selectedRuleIds.filter((value: string) => value !== id)
    : [...state.selectedRuleIds, id]
}

function isRuleExpanded(id: string) {
  return expandedRuleIds.value.includes(id)
}

async function toggleRuleDetails(id: string, event?: MouseEvent) {
  const wasExpanded = isRuleExpanded(id)
  expandedRuleIds.value = wasExpanded
    ? expandedRuleIds.value.filter((value) => value !== id)
    : [...expandedRuleIds.value, id]
  if (wasExpanded) return
  // The details grid mounts on the next tick. Reuse the shared disclosure
  // scroll rule so the new content is revealed instead of staying below the
  // fold on a long rule list.
  await nextTick()
  const card = (event?.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.rule-card')
  if (card) scrollDisclosureIntoView(card, card.querySelector<HTMLElement>(':scope > .rule-meta'))
}

function chooseImport(id: string) {
  if (id === 'append') state.appendRules = !state.appendRules
  else if (id === 'file') fileInput.value?.click()
  else if (id === 'clipboard') void actions.importRulesFromClipboard()
  else if (id === 'url') void actions.importRulesFromUrl()
}

function chooseBatch(id: string) {
  if (id === 'export') void actions.exportSelectedRules()
  else if (id === 'delete') void actions.deleteSelectedRules()
  else if (id.startsWith('move-')) void actions.moveSelectedRules(id.slice(5))
}

function rowMenu(rule: Record<string, any>): ActionMenuItem[] {
  const deleting = Boolean(state.deletingSelectedRules) || state.deletingRuleId === rule.id
  return [
    { id: 'edit', label: t('common.edit'), icon: 'edit' },
    { id: 'sep-delete', separator: true },
    { id: 'delete', label: t('common.delete'), icon: 'delete', danger: true, disabled: deleting },
  ]
}

function chooseRow(rule: Record<string, any>, id: string) {
  if (id === 'edit') actions.openEditRoutingRule(rule)
  else if (id === 'delete') void actions.removeRoutingRule(rule)
}
</script>

<template>
  <section class="card routing-panel rules-panel" aria-labelledby="routing-rules-heading">
    <header class="card-head rules-head">
      <div class="heading-copy">
        <div class="title-line">
          <h2 id="routing-rules-heading">{{ t('routing.rules') }}</h2>
          <span class="count-pill">{{ state.routingRules.length }}</span>
        </div>
        <small>{{ state.selectedRoute?.remarks || t('common.none') }}</small>
      </div>
      <UiButton type="button" class="btn btn-filled" :disabled="!state.selectedRoutingId" @click="actions.addRoutingRule" icon="plus">{{ t('routing.addRule') }}
      </UiButton>
    </header>

    <div class="rules-toolbar">
      <label class="check append-inline">
        <UiCheckbox
          :model-value="state.appendRules"
          @change="state.appendRules = !state.appendRules"
        />
        <span>{{ t('routing.append') }}</span>
      </label>
      <ActionMenu :items="importItems" :label="t('routing.importMenu')" :button-text="t('routing.importMenu')" button-icon="import" button-class="btn btn-tonal" @select="chooseImport" />
      <ActionMenu :items="batchItems" :label="t('routing.batchActions')" :button-text="t('routing.batchActions')" button-icon="sort" button-class="btn btn-outlined" @select="chooseBatch" />
      <input ref="fileInput" hidden type="file" accept=".json,application/json,text/plain" @change="actions.readRulesFile" />
      <span v-if="state.selectedRuleIds.length" class="selection-count">{{ t('common.selected', { count: state.selectedRuleIds.length }) }}</span>
    </div>

    <p class="field-hint">{{ t('routing.importParserHint') }}</p>

    <div ref="ruleTableShell" v-scroll-shadow class="table-shell desktop-only rules-table-shell sticky-actions" tabindex="0">
      <table class="data-table rules-table">
        <thead>
          <tr>
            <th class="cell-check">
              <UiCheckbox :model-value="allSelected" :indeterminate="selectionIndeterminate" :aria-label="t('common.selectAll')" @change="actions.toggleAllRules" />
            </th>
            <th class="cell-drag"><span class="visually-hidden">{{ t('nodes.dragToSort') }}</span></th>
            <th>{{ t('routing.remarks') }}</th>
            <th>{{ t('routing.ruleType') }}</th>
            <th>{{ t('routing.outboundTag') }}</th>
            <th>{{ t('routing.inboundTag') }}</th>
            <th>{{ t('routing.domain') }}</th>
            <th>{{ t('routing.ip') }}</th>
            <th>{{ t('routing.port') }}</th>
            <th>{{ t('routing.network') }}</th>
            <th>{{ t('routing.protocol') }}</th>
            <th>{{ t('routing.process') }}</th>
            <th>{{ t('routing.matchers') }}</th>
            <th class="cell-actions">{{ t('nodes.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(rule, index) in displayedRules" :key="rule.id">
            <tr
              v-if="isDragSorting && dragPlaceholderIndex === index"
              class="table-drag-placeholder"
              data-drag-row-key="__placeholder__"
              aria-hidden="true"
            >
              <td :colspan="RULE_COLSPAN">
                <div class="table-drag-placeholder-box" :style="{ height: `${Math.max(dragRowHeight - 4, 0)}px` }" />
              </td>
            </tr>
            <tr
              :data-rule-id="rule.id"
              :data-drag-row-key="rule.id"
              :class="{ 'is-selected': state.selectedRuleIds.includes(rule.id) }"
              :aria-busy="state.deletingRuleId === rule.id"
              @dblclick="actions.openEditRoutingRule(rule)"
            >
              <td class="cell-check" @click.stop @dblclick.stop>
                <UiCheckbox :model-value="state.selectedRuleIds.includes(rule.id)" :aria-label="rule.remarks || fallbackName(rule)" @change="toggleRule(rule.id)" />
              </td>
              <td class="cell-drag" @click.stop @dblclick.stop>
                <button
                  type="button"
                  class="icon-btn icon-btn-small drag-handle"
                  :aria-label="t('nodes.dragToSort')"
                  :title="t('nodes.dragToSort')"
                  @pointerdown="beginRuleDrag($event, rule.id)"
                >
                  <UiIcon name="drag-handle" :size="16" />
                </button>
              </td>
              <td class="name-cell">
                <span class="status-dot" :class="rule.enabled === false ? '' : 'is-on'" :title="rule.enabled === false ? t('common.disabled') : t('common.enabled')"></span>
                <span class="truncate" :title="rule.remarks || fallbackName(rule)">{{ rule.remarks || fallbackName(rule) }}</span>
              </td>
              <td><span class="badge">{{ rule.ruleType || '—' }}</span></td>
              <td>{{ rule.outboundTag || '—' }}</td>
              <td :title="values(rule, 'inboundTag')">{{ values(rule, 'inboundTag') }}</td>
              <td :title="values(rule, 'domain')">{{ values(rule, 'domain') }}</td>
              <td :title="values(rule, 'ip')">{{ values(rule, 'ip') }}</td>
              <td>{{ rule.port || '—' }}</td>
              <td>{{ rule.network || '—' }}</td>
              <td :title="values(rule, 'protocol')">{{ values(rule, 'protocol') }}</td>
              <td :title="values(rule, 'process')">{{ values(rule, 'process') }}</td>
              <td class="matcher-cell" :title="matchers(rule)">{{ matchers(rule) }}</td>
              <td class="cell-actions" @dblclick.stop>
                <ActionMenu :items="rowMenu(rule)" :label="t('nodes.actions')" @select="chooseRow(rule, $event)" />
              </td>
            </tr>
          </template>
          <tr
            v-if="isDragSorting && dragPlaceholderIndex >= displayedRules.length"
            class="table-drag-placeholder"
            data-drag-row-key="__placeholder__"
            aria-hidden="true"
          >
            <td :colspan="RULE_COLSPAN">
              <div class="table-drag-placeholder-box" :style="{ height: `${dragRowHeight}px` }" />
            </td>
          </tr>
          <tr v-if="!state.routingRules.length">
            <td :colspan="RULE_COLSPAN" class="empty-cell">
              <div class="empty-state">
                <div class="empty-icon"><UiIcon name="layers" /></div>
                <strong>{{ status.reads ? t('common.loading') : t('common.empty') }}</strong>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div ref="ruleCards" class="mobile-only mobile-card-list rules-card-list">
      <article
        v-for="rule in state.routingRules"
        :key="rule.id"
        :data-list-drag-id="rule.id"
        class="mobile-card rule-card"
        :class="{ 'is-selected': state.selectedRuleIds.includes(rule.id), 'is-expanded': isRuleExpanded(rule.id), 'is-drag-source': draggingCardId === rule.id }"
        :aria-busy="state.deletingRuleId === rule.id"
        @click="toggleRuleDetails(rule.id, $event)"
      >
        <div class="mobile-card-head">
          <span class="mobile-card-check" @click.stop>
            <UiCheckbox :model-value="state.selectedRuleIds.includes(rule.id)" :aria-label="rule.remarks || fallbackName(rule)" @change="toggleRule(rule.id)" />
          </span>
          <button
            type="button"
            class="mobile-card-title rule-card-toggle"
            :aria-expanded="isRuleExpanded(rule.id)"
            :aria-controls="`rule-details-${rule.id}`"
            @click.stop="toggleRuleDetails(rule.id, $event)"
          >
            <strong>{{ rule.remarks || fallbackName(rule) }}</strong>
            <small>
              <span class="rule-card-subtitle">{{ rule.ruleType || t('routing.ruleType') }} · {{ rule.outboundTag || t('routing.outboundTag') }}</span>
              <UiIcon name="chevron-down" :size="18" class="rule-card-chevron" />
            </small>
          </button>
          <span class="badge rule-status" :class="{ 'badge-success': rule.enabled !== false }">
            {{ rule.enabled === false ? t('common.disabled') : t('common.enabled') }}
          </span>
          <span @click.stop>
            <ActionMenu :items="rowMenu(rule)" :label="t('nodes.actions')" @select="chooseRow(rule, $event)" />
          </span>
          <span class="rule-card-drag" @click.stop>
            <button
              type="button"
              class="icon-btn icon-btn-small drag-handle"
              :aria-label="t('nodes.dragToSort')"
              :title="t('nodes.dragToSort')"
              @pointerdown="beginRuleCardDrag($event, rule.id)"
            >
              <UiIcon name="drag-handle" :size="16" />
            </button>
          </span>
        </div>
        <div v-if="isRuleExpanded(rule.id)" :id="`rule-details-${rule.id}`" class="meta-grid rule-meta">
          <div v-for="field in metaFields(rule)" :key="field" class="meta-item">
            <small>{{ t(`routing.${field}`) }}</small>
            <strong>{{ field === 'port' || field === 'network' ? (rule[field] || '—') : values(rule, field) }}</strong>
          </div>
          <div class="meta-item field-wide">
            <small>{{ t('routing.matchers') }}</small>
            <strong>{{ matchers(rule) }}</strong>
          </div>
        </div>
      </article>
      <div v-if="!state.routingRules.length" class="empty-state">
        <div class="empty-icon"><UiIcon name="layers" /></div>
        <strong>{{ status.reads ? t('common.loading') : t('common.empty') }}</strong>
      </div>
    </div>

    <RoutingRawEditor />
  </section>
</template>

<style scoped>
.routing-panel {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: var(--nova-space-3);
}

.rules-head {
  margin-bottom: 0;
  align-items: center;
}

.heading-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.heading-copy small {
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
  overflow-wrap: anywhere;
}

.title-line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-2);
}

.rules-toolbar {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-2);
}

.append-inline {
  min-height: var(--nova-control-height);
  padding-inline: var(--nova-space-2);
  font-size: var(--md-sys-typescale-body-medium-size);
}

.selection-count {
  margin-left: auto;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-medium-size);
  white-space: nowrap;
}

.rules-table-shell {
  /* Keep the workspace height stable while switching rule sets; otherwise a
     shorter list clamps the page scroll and makes the whole view jump. */
  height: clamp(320px, 52dvh, 560px);
  container-type: inline-size;
}

/* The rules workspace is usually much narrower than the table. Pinning the
   action column there overlays the domain/matcher cells and hides their
   ellipsis, so only pin it when the pane is wide enough to keep the columns
   before it visible. */
@container (max-width: 1400px) {
  .table-shell.rules-table-shell.sticky-actions .rules-table th.cell-actions,
  .table-shell.rules-table-shell.sticky-actions .rules-table td.cell-actions,
  .table-shell.rules-table-shell.sticky-actions.is-scrollable-x:not(.is-scroll-end) .rules-table th.cell-actions,
  .table-shell.rules-table-shell.sticky-actions.is-scrollable-x:not(.is-scroll-end) .rules-table td.cell-actions {
    position: static;
    box-shadow: none;
  }
}

.rules-table {
  min-width: 1460px;
}

.rules-table th.cell-actions,
.rules-table td.cell-actions {
  width: 64px;
  min-width: 64px;
}

.rules-table .cell-drag {
  width: 44px;
  min-width: 44px;
  max-width: 44px;
  padding-inline: 4px;
  overflow: visible;
  text-align: center;
}

.rules-table .drag-handle,
.rule-card-drag .drag-handle {
  color: var(--md-sys-color-on-surface-variant);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
}

.rules-table .drag-handle:active,
.rule-card-drag .drag-handle:active {
  cursor: grabbing;
}

.rules-table th {
  overflow: hidden;
  text-overflow: ellipsis;
}

.rules-table .name-cell {
  display: flex;
  min-width: 150px;
  max-width: 240px;
  align-items: center;
  gap: var(--nova-space-2);
}

.rules-table td {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-card {
  cursor: pointer;
}

.rule-card.is-drag-source {
  opacity: 0;
}

.rule-card-drag {
  flex: 0 0 auto;
}

.list-drag-ghost {
  border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 36%, transparent);
  box-shadow: 0 14px 24px color-mix(in srgb, var(--md-sys-color-shadow) 32%, transparent);
}

.rule-status {
  flex: 0 0 auto;
}

/* The title is the keyboard-operable disclosure control; tapping anywhere on
   the card outside the checkbox/menu toggles the same read-only detail block. */
.rule-card-toggle {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.rule-card-toggle:focus-visible {
  outline: var(--nova-focus-ring);
  outline-offset: 3px;
  border-radius: var(--md-sys-shape-corner-small);
}

.rule-card-toggle small {
  display: flex;
  align-items: center;
  gap: var(--nova-space-1);
}

.rule-card-subtitle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-card-chevron {
  flex: 0 0 auto;
  color: var(--md-sys-color-on-surface-variant);
  transition: transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized);
}

.rule-card.is-expanded .rule-card-chevron {
  transform: rotate(180deg);
}

.rule-meta {
  padding-top: var(--nova-space-2);
  border-top: 1px solid var(--nova-color-divider);
  animation: rule-details-enter var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-decelerate);
}

@keyframes rule-details-enter {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.rule-meta .meta-item strong {
  font-size: var(--md-sys-typescale-body-small-size);
  font-weight: var(--md-sys-typescale-weight-regular);
}

@media (prefers-reduced-motion: reduce) {
  .rule-card-chevron {
    transition: none;
  }

  .rule-meta {
    animation: none;
  }
}

@media (max-width: 860px) {
  .rules-head {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .rules-toolbar > .btn {
    flex: 1 1 min(100%, 150px);
  }

  .selection-count {
    width: 100%;
    margin-left: 0;
  }

  .rule-card {
    padding: var(--nova-space-3);
  }
}

@media (max-width: 600px) {
  .rule-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rule-meta .field-wide {
    grid-column: 1 / -1;
  }
}
</style>
