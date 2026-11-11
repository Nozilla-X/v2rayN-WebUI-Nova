<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import UiIcon from './UiIcon.vue'

export interface ActionMenuItem {
  id?: string
  label?: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  shortcut?: string
  checked?: boolean
}

const props = withDefaults(defineProps<{
  items: ActionMenuItem[]
  label: string
  buttonText?: string
  buttonIcon?: string
  buttonClass?: string
  align?: 'start' | 'end'
}>(), {
  buttonText: '',
  buttonIcon: '',
  buttonClass: '',
  align: 'end',
})

const emit = defineEmits<{ select: [id: string] }>()
const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const position = ref<Record<string, string>>({ top: '-9999px', left: '-9999px' })

const triggerClass = computed(() => props.buttonClass || (props.buttonText ? 'btn btn-tonal btn-small' : 'icon-btn'))

function updatePosition() {
  const button = trigger.value
  const popup = menu.value
  if (!button || !popup) return
  const rect = button.getBoundingClientRect()
  const width = popup.offsetWidth || 240
  const height = popup.offsetHeight || 200
  let left = props.align === 'end' ? rect.right - width : rect.left
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
  let top = rect.bottom + 6
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6)
  position.value = { top: `${Math.round(top)}px`, left: `${Math.round(left)}px` }
}

function updateMenuMinWidth() {
  const popup = menu.value
  const button = trigger.value
  if (!popup || !button) return
  popup.style.minWidth = `${Math.max(200, Math.min(button.offsetWidth, 280))}px`
}

async function openMenu() {
  if (open.value) return
  open.value = true
  await nextTick()
  updateMenuMinWidth()
  updatePosition()
  menu.value?.querySelector<HTMLElement>('.menu-item:not(:disabled)')?.focus({ preventScroll: true })
}

function closeMenu(restoreFocus = false) {
  if (!open.value) return
  open.value = false
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}

function toggle() {
  if (open.value) closeMenu()
  else void openMenu()
}

function select(item: ActionMenuItem) {
  if (!item.id || item.disabled || item.separator) return
  closeMenu()
  emit('select', item.id)
}

function focusableItems(): HTMLElement[] {
  return [...(menu.value?.querySelectorAll<HTMLElement>('.menu-item:not(:disabled)') || [])]
}

function onMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeMenu(true)
    return
  }
  if (event.key === 'Tab') {
    closeMenu()
    return
  }
  const items = focusableItems()
  if (!items.length) return
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    items[(index + 1 + items.length) % items.length].focus()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    items[(index - 1 + items.length) % items.length].focus()
  } else if (event.key === 'Home') {
    event.preventDefault()
    items[0].focus()
  } else if (event.key === 'End') {
    event.preventDefault()
    items[items.length - 1].focus()
  }
}

function onDocumentPointer(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (menu.value?.contains(target) || trigger.value?.contains(target)) return
  closeMenu()
}

function onViewportChange(event: Event) {
  if (event.type === 'scroll' && event.target instanceof Node && menu.value?.contains(event.target)) return
  closeMenu()
}

watch(open, (value) => {
  if (value) {
    document.addEventListener('pointerdown', onDocumentPointer, true)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointer, true)
    window.removeEventListener('scroll', onViewportChange, true)
    window.removeEventListener('resize', onViewportChange)
  }
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointer, true)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})
</script>

<template>
  <button
    ref="trigger"
    type="button"
    :class="[triggerClass, 'action-menu-trigger', { 'is-icon-only': !buttonText }]"
    :aria-label="buttonText ? undefined : label"
    :title="buttonText ? undefined : label"
    aria-haspopup="menu"
    :aria-expanded="open"
    @click="toggle"
    @keydown.down.prevent="openMenu"
  >
    <UiIcon v-if="!buttonText || buttonIcon" :name="buttonIcon || 'dots-vertical'" />
    <span v-if="buttonText">{{ buttonText }}</span>
  </button>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menu"
      class="menu-popup action-menu-popup"
      role="menu"
      :aria-label="label"
      :style="position"
      @keydown="onMenuKeydown"
      @contextmenu.prevent.stop
      @menu-escape="closeMenu(true)"
    >
      <template v-for="(item, index) in items" :key="item.id || `separator-${index}`">
        <div v-if="item.separator" class="menu-separator" role="separator" />
        <button
          v-else
          type="button"
          class="menu-item"
          :class="{ danger: item.danger }"
          :role="item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'"
          :aria-checked="item.checked === undefined ? undefined : item.checked"
          :disabled="item.disabled"
          @click="select(item)"
        >
          <UiIcon v-if="item.icon" :name="item.icon" />
          <span>{{ item.label }}</span>
          <span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
          <UiIcon v-else-if="item.checked" name="check" />
        </button>
      </template>
    </div>
  </Teleport>
</template>
