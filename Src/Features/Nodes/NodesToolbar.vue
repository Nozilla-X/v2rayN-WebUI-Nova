<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionMenu, { type ActionMenuItem } from '../../Components/Material/ActionMenu.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import { usePageRequests } from '../../UI/useUiRequests'

const { t } = useI18n()
const app = useNovaApp()
const state = app.nodes.nodesPageState
const actions = app.nodes.nodesPageActions
const emit = defineEmits<{ openColumnSettings: [] }>()
const { run } = usePageRequests('nodes')

const groupChipsElement = ref<HTMLElement | null>(null)
const groupCanScrollLeft = ref(false)
const groupCanScrollRight = ref(false)
let groupResizeObserver: ResizeObserver | undefined
let groupCueFrame = 0

function updateGroupScrollCue() {
  if (groupCueFrame) return
  groupCueFrame = requestAnimationFrame(() => {
    groupCueFrame = 0
    const element = groupChipsElement.value
    if (!element) return
    const canScrollLeft = element.scrollLeft > 1
    const canScrollRight = element.scrollWidth - element.clientWidth - element.scrollLeft > 1
    if (groupCanScrollLeft.value !== canScrollLeft) groupCanScrollLeft.value = canScrollLeft
    if (groupCanScrollRight.value !== canScrollRight) groupCanScrollRight.value = canScrollRight
  })
}

onMounted(() => {
  const element = groupChipsElement.value
  if (!element) return
  updateGroupScrollCue()
  groupResizeObserver = new ResizeObserver(updateGroupScrollCue)
  groupResizeObserver.observe(element)
})

watch(() => state.groups.length, () => {
  void nextTick(updateGroupScrollCue)
}, { flush: 'post' })

onBeforeUnmount(() => {
  if (groupCueFrame) cancelAnimationFrame(groupCueFrame)
  groupResizeObserver?.disconnect()
})

const addItems = computed<ActionMenuItem[]>(() => [
  { id: 'add-profile', label: t('nodes.addNode'), icon: 'plus' },
  { id: 'import-profiles', label: t('nodes.importNodes'), icon: 'import' },
])

// Desktop and mobile share the node context menu for test types, delay sorting,
// stopping a run, organizing and sharing. The toolbar only owns the two test
// actions that menu does not provide.
const toolbarTestItems = computed<ActionMenuItem[]>(() => [
  { id: 'test-group', label: t('nodes.testGroup'), icon: 'activity', disabled: !state.selectedGroup },
  { id: 'sort-speed', label: `${t('nodes.sortByTestResults')} · ${t('nodes.speed')}`, icon: 'sort' },
])

function chooseAdd(id: string) {
  if (id === 'add-profile') void actions.openAddProfile()
  else if (id === 'import-profiles') actions.openImportProfiles()
}

function chooseTest(id: string) {
  if (id === 'test-group') void actions.runProfileAction('test-group')
  else if (id === 'sort-speed') void actions.sortProfiles('SpeedVal')
}

function selectGroup(event: MouseEvent, group: Record<string, any>) {
  if (event.detail > 1) return
  if (state.selectedGroup !== group.id) void actions.changeGroup(group.id)
}

function openGroupContext(event: MouseEvent, group: Record<string, any>) {
  actions.openSubscriptionContext(event, group)
}

function openSelectedGroupContext(event: MouseEvent) {
  const group = state.groups.find((item) => (item.id || '') === state.selectedGroup)
    || state.groups.find((item) => item.isCurrent)
    || state.groups[0]
  if (group) openGroupContext(event, group)
}

async function submitFilter() {
  await run(() => actions.loadProfiles())
}

function clearFilter() {
  state.filter = ''
  void submitFilter()
}

function locateCurrent() {
  const current = state.profiles.find((profile) => profile.isCurrent)
  if (!current) return
  const row = document.querySelector<HTMLElement>(`[data-profile-id="${CSS.escape(current.indexId)}"]`)
  row?.scrollIntoView({ block: 'center', inline: 'nearest' })
  row?.focus({ preventScroll: true })
}
</script>

<template>
  <div class="nodes-toolbar">
    <div class="page-toolbar">
      <div class="toolbar-actions">
        <button type="button" class="icon-btn desktop-only" :aria-label="t('polish.locateCurrent')" :title="t('polish.locateCurrent')" @click="locateCurrent">
          <UiIcon name="check" />
        </button>
        <button
          type="button"
          class="icon-btn desktop-only"
          :aria-label="t('nodes.columnSettings')"
          :title="t('nodes.columnSettings')"
          @click="emit('openColumnSettings')"
        >
          <UiIcon name="view-column" />
        </button>
        <form class="search-field nodes-search" role="search" @submit.prevent="submitFilter">
          <UiIcon name="search" :size="18" />
          <input
            v-model="state.filter"
            :aria-label="t('nodes.searchPlaceholder')"
            :placeholder="t('nodes.searchPlaceholder')"
            @keyup.enter="submitFilter"
          />
          <span class="search-count" :title="t('nodes.title')">{{ state.filteredProfiles.length }}</span>
          <button
            v-if="state.filter"
            type="button"
            class="icon-btn"
            :aria-label="t('polish.clearSearch')"
            :title="t('polish.clearSearch')"
            @click="clearFilter"
          >
            <UiIcon name="close" :size="16" />
          </button>
        </form>
        <ActionMenu
          :items="addItems"
          :label="t('nodes.addMenu')"
          :button-text="t('nodes.addMenu')"
          button-icon="plus"
          button-class="btn btn-filled btn-small"
          @select="chooseAdd"
        />
        <ActionMenu
          :items="toolbarTestItems"
          :label="t('nodes.testMenu')"
          :button-text="t('nodes.test')"
          button-icon="activity"
          button-class="btn btn-tonal btn-small"
          @select="chooseTest"
        />
      </div>
    </div>

    <div class="group-toolbar">
      <span class="group-toolbar-label">{{ t('nodes.group') }}</span>
      <div
        class="group-chip-viewport"
        :class="{ 'can-scroll-left': groupCanScrollLeft, 'can-scroll-right': groupCanScrollRight }"
      >
        <div
          ref="groupChipsElement"
          class="group-chips"
          @scroll.passive="updateGroupScrollCue"
          @contextmenu.prevent.stop="openSelectedGroupContext($event)"
        >
          <button
            v-for="group in state.groups"
            :key="group.id || 'all'"
            type="button"
            class="group-chip"
            :class="{ selected: state.selectedGroup === group.id }"
            :aria-pressed="state.selectedGroup === group.id"
            :aria-label="group.name || t('common.allGroups')"
            @click="selectGroup($event, group)"
            @dblclick.prevent.stop="openGroupContext($event, group)"
            @contextmenu.prevent.stop="openGroupContext($event, group)"
          >
            <span class="group-name">{{ group.name || t('common.allGroups') }}</span>
            <span class="group-count">{{ group.profileCount }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="nodes-feedback-slot">
      <slot name="feedback" />
    </div>
  </div>
</template>

<style scoped>
.nodes-toolbar {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-3);
}

.group-toolbar {
  order: 1;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--nova-space-3);
}

.page-toolbar {
  order: 2;
  min-width: 0;
  flex: 1 1 0;
}

.group-toolbar-label {
  flex: 0 0 auto;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-medium-size);
  line-height: var(--md-sys-typescale-label-medium-line-height);
}

.group-chip-viewport {
  position: relative;
  width: clamp(220px, 24vw, 440px);
  min-width: 0;
  flex: 0 0 auto;
}

.group-chip-viewport::before,
.group-chip-viewport::after {
  position: absolute;
  z-index: 1;
  top: 0;
  bottom: 8px;
  display: grid;
  width: 28px;
  place-items: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}

.group-chip-viewport::before {
  left: 0;
  background: linear-gradient(90deg, var(--md-sys-color-surface) 14%, color-mix(in srgb, var(--md-sys-color-surface) 82%, transparent) 62%, transparent);
  content: "";
}

.group-chip-viewport::after {
  right: 0;
  background: linear-gradient(270deg, var(--md-sys-color-surface) 14%, color-mix(in srgb, var(--md-sys-color-surface) 82%, transparent) 62%, transparent);
  content: "";
}

.group-chip-viewport.can-scroll-left::before,
.group-chip-viewport.can-scroll-right::after {
  opacity: 1;
}

.group-chips {
  display: flex;
  width: 100%;
  min-width: 0;
  gap: var(--nova-space-2);
  overflow-x: auto;
  padding: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--md-sys-color-outline-variant) transparent;
  overscroll-behavior-x: contain;
}

.group-chips::-webkit-scrollbar {
  display: block;
  height: 8px;
}

.group-chip {
  display: inline-flex;
  min-height: 36px;
  max-width: 240px;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--nova-space-2);
  padding: 0 var(--nova-space-3);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-large-size);
  white-space: nowrap;
  transition:
    background-color var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard),
    border-color var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}

.group-chip:hover {
  background: var(--nova-color-state-hover);
}

.group-chip.selected {
  border-color: transparent;
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-weight: var(--md-sys-typescale-weight-semibold);
}

.group-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-count {
  padding: 0 6px;
  border-radius: var(--md-sys-shape-corner-full);
  background: color-mix(in srgb, currentColor 10%, transparent);
  font-size: var(--md-sys-typescale-label-small-size);
  font-variant-numeric: tabular-nums;
  transition: background-color var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}

.nodes-feedback-slot {
  flex: 1 1 100%;
}

.nodes-search {
  width: min(300px, 100%);
  min-width: 120px;
  flex: 0 1 300px;
}

.search-count {
  display: inline-flex;
  min-width: 24px;
  height: 24px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding-inline: 6px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-small-size);
  font-variant-numeric: tabular-nums;
}

@media (min-width: 861px) {
  .toolbar-actions {
    flex-wrap: nowrap;
  }

  .toolbar-actions > .btn {
    flex: 0 0 auto;
  }
}

@media (max-width: 1180px) and (min-width: 861px) {
  .page-toolbar {
    flex: 1 1 100%;
  }

  .group-chip-viewport {
    width: min(100%, 520px);
    flex: 1 1 520px;
  }
}

@media (max-width: 860px) {
  .nodes-toolbar {
    align-items: stretch;
  }

  .group-toolbar,
  .page-toolbar {
    flex: 1 1 100%;
    margin-left: 0;
  }

  .group-toolbar-label {
    display: none;
  }

  .group-chip-viewport {
    width: 100%;
    flex: 1 1 auto;
  }

  .toolbar-actions {
    display: grid;
    width: 100%;
    /* Add and Test are the only toolbar actions; every other action lives in
       the shared per-node context menu. Two columns keep labels readable. */
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--nova-space-2);
  }

  .toolbar-actions .nodes-search {
    width: 100%;
    min-width: 0;
    flex: none;
    grid-column: 1 / -1;
  }

  .toolbar-actions > .btn {
    min-width: 0;
    padding-inline: var(--nova-space-2);
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

</style>
