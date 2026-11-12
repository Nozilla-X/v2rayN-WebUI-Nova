<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNovaApp } from '../../App/context'
import { navigateMenu } from '../../Components/menuContext'
import { preventNativeContextMenu } from '../../Components/contextMenu'
import UiIcon from '../../Components/Material/UiIcon.vue'
import type { Dict } from '../../Composables/types'

type MenuEntry = {
  id?: string
  label?: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  children?: MenuEntry[]
  run?: () => void
}

const contextMenu = defineModel<Dict | null>({ required: true })
const { t } = useI18n()
const app = useNovaApp()
const state = app.nodes.nodesPageState
const actions = app.nodes.nodesPageActions
const contextActions = app.nodes.contextActions
const menu = ref<HTMLElement | null>(null)
const submenu = ref<HTMLElement | null>(null)
const placement = ref({ left: '-10000px', top: '-10000px' })
const submenuPlacement = ref({ left: '-10000px', top: '-10000px' })
const activeSubmenu = ref<MenuEntry | null>(null)

const profileMenu = computed<MenuEntry[]>(() => {
  const profile = contextMenu.value?.profile
  if (!profile) return []
  const hasSelection = state.selectedIds.length > 0
  const hasProfiles = state.filteredProfiles.length > 0
  const groups: MenuEntry[] = state.groups.map((group: Dict) => ({
    id: `move-group-${group.id || 'all'}`,
    label: group.name || t('common.allGroups'),
    disabled: !hasSelection,
    run: () => actions.moveSelectedToGroup(group.id),
  }))
  return [
    {
      id: 'activate',
      label: profile.isCurrent ? t('nodes.current') : t('nodes.switch'),
      shortcut: 'Enter',
      disabled: Boolean(profile.isCurrent),
      run: contextActions.selectContextProfile,
    },
    { id: 'edit', label: t('common.edit'), shortcut: 'E', run: contextActions.editContextProfile },
    { id: 'sep-main', separator: true },
    {
      id: 'actions',
      label: t('nodes.actions'),
      children: [
        { id: 'select-all', label: t('nodes.selectAll'), shortcut: 'A', disabled: !hasProfiles, run: contextActions.selectAllNodes },
        { id: 'clone', label: t('nodes.copySelected'), disabled: !hasSelection, run: contextActions.copySelectedNodes },
        {
          id: 'remove',
          label: t('nodes.removeSelected'),
          shortcut: 'Delete',
          danger: true,
          disabled: !hasSelection,
          run: contextActions.deleteSelectedNodes,
        },
        { id: 'sep-cleanup', separator: true },
        { id: 'deduplicate', label: t('nodes.deduplicate'), run: () => actions.runProfileAction('deduplicate') },
        { id: 'remove-invalid', label: t('nodes.removeInvalid'), run: () => actions.runProfileAction('remove-invalid') },
      ],
    },
    {
      id: 'test',
      label: t('nodes.testMenu'),
      children: [
        { id: 'tcping', label: t('nodes.tcping'), shortcut: '1', run: () => contextActions.testSelectedNodes('tcping') },
        { id: 'realping', label: t('nodes.realping'), shortcut: '2', run: () => contextActions.testSelectedNodes('realping') },
        { id: 'speedtest', label: t('nodes.speedtest'), shortcut: '3', run: () => contextActions.testSelectedNodes('speedtest') },
        { id: 'udp', label: t('nodes.udp'), shortcut: '4', run: () => contextActions.testSelectedNodes('udpTest') },
        { id: 'sep-quick', separator: true },
        { id: 'fast-realping', label: t('nodes.fastRealping'), shortcut: '5', run: () => contextActions.testSelectedNodes('fastRealping') },
        { id: 'mixedtest', label: t('nodes.mixedtest'), shortcut: '6', run: () => contextActions.testSelectedNodes('mixedtest') },
        { id: 'sep-sort', separator: true },
        { id: 'sort-results', label: t('nodes.sortByTestResults'), run: () => actions.sortProfiles('DelayVal') },
        { id: 'sep-stop', separator: true },
        { id: 'stop-test', label: t('nodes.stopTest'), disabled: !state.operations.includes('speedtest'), run: () => actions.stopSpeedTests() },
      ],
    },
    {
      id: 'move-group',
      label: t('nodes.moveGroup'),
      disabled: !groups.length,
      children: groups,
    },
    {
      id: 'export',
      label: t('nodes.exportSelected'),
      children: [
        { id: 'share', label: t('nodes.shareProfile'), shortcut: 'S', disabled: !hasSelection, run: contextActions.shareSelectedNodes },
        { id: 'sep-export', separator: true },
        { id: 'export-full', label: t('nodes.exportFullConfig'), disabled: !hasSelection, run: () => actions.exportFullConfig() },
        { id: 'export-full-clipboard', label: t('nodes.exportFullConfigClipboard'), disabled: !hasSelection, run: () => actions.exportFullConfigToClipboard() },
        { id: 'share-link-clipboard', label: t('nodes.exportShareLinkClipboard'), shortcut: 'C', disabled: !hasSelection, run: contextActions.copySelectedShareLinks },
        { id: 'share-link-base64', label: t('nodes.exportShareLinkBase64'), disabled: !hasSelection, run: () => actions.exportShareLinksBase64() },
        { id: 'inner-uri', label: t('nodes.exportInnerUri'), disabled: !hasSelection, run: () => actions.exportInnerUris() },
        { id: 'custom-export', label: `${t('nodes.customExport')}…`, disabled: !hasSelection, run: () => actions.exportSelected() },
      ],
    },
    {
      id: 'policy',
      label: t('nodes.generatePolicyGroups'),
      children: [
        { id: 'policy-all', label: t('nodes.allProfiles'), disabled: !state.selectedGroup, run: () => actions.generateGroups(false) },
        {
          id: 'policy-region',
          label: t('nodes.generateRegionGroups'),
          disabled: !state.selectedGroup || !state.profiles.length,
          run: () => actions.generateGroups(true),
        },
      ],
    },
  ]
})

function closeSubmenu(restoreFocus = false) {
  const previous = activeSubmenu.value
  activeSubmenu.value = null
  submenuPlacement.value = { left: '-10000px', top: '-10000px' }
  if (restoreFocus && previous?.id) {
    void nextTick(() => menu.value?.querySelector<HTMLElement>(`[data-submenu-id="${CSS.escape(previous.id || '')}"]`)?.focus({ preventScroll: true }))
  }
}

function close() {
  closeSubmenu()
  contextMenu.value = null
}

function position() {
  const popup = menu.value
  const value = contextMenu.value
  if (!popup || !value) return
  const margin = 8
  const left = Math.max(margin, Math.min(Number(value.x) || 0, window.innerWidth - popup.offsetWidth - margin))
  const top = Math.max(margin, Math.min(Number(value.y) || 0, window.innerHeight - popup.offsetHeight - margin))
  placement.value = { left: `${left}px`, top: `${top}px` }
}

function positionSubmenu(trigger: HTMLElement | null) {
  const root = menu.value
  const popup = submenu.value
  if (!root || !popup || !trigger) return
  const margin = 8
  const rootRect = root.getBoundingClientRect()
  const rect = trigger.getBoundingClientRect()
  const width = popup.offsetWidth
  const height = popup.offsetHeight
  let left = rootRect.right + 4
  if (left + width > window.innerWidth - margin) left = rootRect.left - width - 4
  let top = rect.top - 6
  if (top + height > window.innerHeight - margin) top = window.innerHeight - height - margin
  submenuPlacement.value = {
    left: `${Math.round(Math.max(margin, left))}px`,
    top: `${Math.round(Math.max(margin, top))}px`,
  }
}

async function openSubmenu(item: MenuEntry, event: Event | null, focusFirst = false) {
  if (!item.children?.length) return
  if (activeSubmenu.value?.id === item.id) {
    if (focusFirst) submenu.value?.querySelector<HTMLElement>('.menu-item:not(:disabled)')?.focus({ preventScroll: true })
    return
  }
  activeSubmenu.value = item
  await nextTick()
  const trigger = (event?.currentTarget as HTMLElement | null)
    || menu.value?.querySelector<HTMLElement>(`[data-submenu-id="${CSS.escape(item.id || '')}"]`)
    || null
  positionSubmenu(trigger)
  if (focusFirst) submenu.value?.querySelector<HTMLElement>('.menu-item:not(:disabled)')?.focus({ preventScroll: true })
}

function hoverSubmenu(item: MenuEntry, event: Event) {
  // Touch browsers synthesize mouseenter before click. Opening on that hover
  // would make the following click toggle the submenu straight back closed.
  if (typeof window.matchMedia === 'function' && !window.matchMedia('(hover: hover)').matches) return
  if (activeSubmenu.value?.id === item.id) return
  void openSubmenu(item, event)
}

async function toggleSubmenu(item: MenuEntry, event: Event) {
  if (activeSubmenu.value?.id === item.id) closeSubmenu(true)
  else await openSubmenu(item, event, true)
}

watch(contextMenu, async (value) => {
  activeSubmenu.value = null
  submenuPlacement.value = { left: '-10000px', top: '-10000px' }
  if (!value) return
  placement.value = { left: '-10000px', top: '-10000px' }
  await nextTick()
  position()
  menu.value?.querySelector<HTMLElement>('button:not(:disabled)')?.focus({ preventScroll: true })
})

function onDocumentPointer(event: PointerEvent) {
  if (!contextMenu.value) return
  const target = event.target as Node | null
  if (target && (menu.value?.contains(target) || submenu.value?.contains(target))) return
  close()
}

function onViewportChange(event: Event) {
  if (!contextMenu.value) return
  // A long node menu scrolls internally. Dismissing it when that scroll
  // reaches the capture listener makes the menu impossible to use; only a
  // viewport resize invalidates the fixed placement.
  if (event.type === 'scroll') return
  close()
}

function onMenuEscape() {
  if (activeSubmenu.value) closeSubmenu(true)
  else close()
}

function onMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (activeSubmenu.value) closeSubmenu(true)
    else close()
    return
  }
  if (event.key === 'Tab') {
    close()
    return
  }
  navigateMenu(event, menu.value)
}

function onSubmenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' || event.key === 'ArrowLeft') {
    event.preventDefault()
    event.stopPropagation()
    closeSubmenu(true)
    return
  }
  if (event.key === 'Tab') {
    close()
    return
  }
  navigateMenu(event, submenu.value)
}

function run(action?: () => void) {
  if (!action) return
  action()
  close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer, true)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointer, true)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="contextMenu"
      ref="menu"
      class="menu-popup context-menu"
      :style="placement"
      role="menu"
      @keydown="onMenuKeydown"
      @menu-escape="onMenuEscape"
      @contextmenu="preventNativeContextMenu"
    >
      <template v-if="contextMenu.type === 'subscription'">
        <button type="button" role="menuitem" class="menu-item" :disabled="!contextMenu.group.id" @click="run(contextActions.editSubscriptionFromContext)">
          {{ t('nodes.groupEdit') }}
        </button>
        <button type="button" role="menuitem" class="menu-item" @click="run(contextActions.addSubscriptionFromContext)">
          {{ t('nodes.groupAdd') }}
        </button>
        <button type="button" role="menuitem" class="menu-item danger" :disabled="!contextMenu.group.id" @click="run(contextActions.deleteSubscriptionFromContext)">
          {{ t('nodes.groupDelete') }}
        </button>
      </template>

      <template v-else>
        <template v-for="(item, index) in profileMenu" :key="item.id || `sep-${index}`">
          <div v-if="item.separator" class="menu-separator" role="separator" @mouseenter="closeSubmenu()" />
          <button
            v-else-if="item.children"
            type="button"
            class="menu-item submenu-trigger"
            :class="{ 'is-open': activeSubmenu?.id === item.id }"
            :data-submenu-id="item.id"
            :disabled="item.disabled"
            aria-haspopup="menu"
            :aria-expanded="activeSubmenu?.id === item.id"
            @mouseenter="hoverSubmenu(item, $event)"
            @click.stop="toggleSubmenu(item, $event)"
            @keydown.right.prevent.stop="openSubmenu(item, $event, true)"
            @keydown.down.prevent.stop="openSubmenu(item, $event, true)"
            @keydown.enter.prevent.stop="openSubmenu(item, $event, true)"
            @keydown.space.prevent.stop="openSubmenu(item, $event, true)"
          >
            <span>{{ item.label }}</span>
            <UiIcon name="chevron-right" :size="16" class="submenu-arrow" />
          </button>
          <button
            v-else
            type="button"
            role="menuitem"
            class="menu-item"
            :class="{ danger: item.danger }"
            :disabled="item.disabled"
            @mouseenter="closeSubmenu()"
            @click="run(item.run)"
          >
            {{ item.label }}<span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
          </button>
        </template>
      </template>
    </div>

    <div
      v-if="contextMenu && activeSubmenu"
      ref="submenu"
      class="menu-popup context-submenu"
      role="menu"
      :aria-label="activeSubmenu.label"
      :style="submenuPlacement"
      @keydown="onSubmenuKeydown"
      @menu-escape="closeSubmenu(true)"
      @contextmenu="preventNativeContextMenu"
    >
      <template v-for="(item, index) in activeSubmenu.children" :key="item.id || `sub-${index}`">
        <div v-if="item.separator" class="menu-separator" role="separator" />
        <button
          v-else
          type="button"
          role="menuitem"
          class="menu-item"
          :class="{ danger: item.danger }"
          :disabled="item.disabled"
          @click="run(item.run)"
        >
          {{ item.label }}<span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  max-width: min(320px, calc(100vw - 16px));
  max-height: min(80dvh, 640px);
  transform-origin: top left;
}

.context-submenu {
  max-width: min(340px, calc(100vw - 16px));
  max-height: min(70dvh, 520px);
  transform-origin: top left;
}

.submenu-trigger .submenu-arrow {
  margin-left: auto;
  color: var(--md-sys-color-on-surface-variant);
}

.submenu-trigger.is-open {
  background: var(--nova-color-state-hover);
}

@media (max-width: 860px) {
  .context-menu .menu-shortcut,
  .context-submenu .menu-shortcut {
    display: none;
  }
}
</style>
