<script setup lang="ts">
import { nextTick, onUnmounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from './UiIcon.vue'
import { enterDialog, exitDialog, isTopDialog } from '../../UI/dialogLayer'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  subtitle?: string
  wide?: boolean
  small?: boolean
  closeOnScrim?: boolean
}>(), { subtitle: '', wide: false, small: false, closeOnScrim: true })

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const panel = ref<HTMLElement | null>(null)
const titleId = useId()
let returnFocus: HTMLElement | null = null
let acquired = false
let layerId = 0

function focusFirst() {
  const root = panel.value
  if (!root) return
  const preferred = root.querySelector<HTMLElement>('[autofocus], input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)')
  const fallback = root.querySelector<HTMLElement>('.dialog-actions button:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')
  ;(preferred || fallback || root).focus({ preventScroll: true })
}

async function activate() {
  if (acquired) return
  acquired = true
  layerId = enterDialog()
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', onKeydown, true)
  await nextTick()
  focusFirst()
}

function deactivate() {
  if (!acquired) return
  acquired = false
  document.removeEventListener('keydown', onKeydown, true)
  exitDialog(layerId)
  const target = returnFocus
  returnFocus = null
  if (target?.isConnected && target !== document.body) target.focus({ preventScroll: true })
}

function close() {
  emit('close')
}

function onScrim() {
  if (props.closeOnScrim) close()
}

function focusable(): HTMLElement[] {
  const root = panel.value
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(
    'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.getClientRects().length > 0)
}

function onKeydown(event: KeyboardEvent) {
  if (!props.open || !isTopDialog(layerId)) return
  if (event.key === 'Escape') {
    if (event.defaultPrevented) return
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusable()
  if (!items.length) {
    event.preventDefault()
    panel.value?.focus()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !panel.value?.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !panel.value?.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.open, (open) => {
  if (open) void activate()
  else deactivate()
}, { immediate: true })

onUnmounted(deactivate)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-scrim" @mousedown.self="onScrim" @click.self="onScrim">
      <section
        ref="panel"
        class="dialog"
        :class="{ 'dialog-wide': wide, 'dialog-small': small }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <header class="dialog-header">
          <div>
            <h2 :id="titleId">{{ title }}</h2>
            <small v-if="subtitle">{{ subtitle }}</small>
          </div>
          <button type="button" class="icon-btn" :aria-label="t('common.close')" @click="close">
            <UiIcon name="close" />
          </button>
        </header>
        <div class="dialog-content">
          <slot />
        </div>
        <footer v-if="$slots.actions" class="dialog-actions">
          <slot name="actions" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>
