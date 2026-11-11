<script setup lang="ts">
import UiButton from './UiButton.vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from './UiIcon.vue'

const props = defineProps<{
  modelValue: string
  testing: boolean
  error: string
  history: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  apply: []
  test: []
  forget: [value: string]
}>()

const { t } = useI18n()
const draft = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const field = ref<HTMLElement | null>(null)
const historyTrigger = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const menuStyle = ref<Record<string, string>>({ top: '-9999px', left: '-9999px', width: '320px' })

function onInput(event: Event) {
  draft.value = (event.target as HTMLElement & { value: string }).value
}

function positionMenu() {
  const anchor = field.value?.getBoundingClientRect()
  if (!anchor) return
  const width = Math.max(anchor.width, 280)
  const height = menu.value?.offsetHeight || Math.min(320, props.history.length * 44 + 12)
  const top = anchor.bottom + 4 + height > window.innerHeight - 8
    ? Math.max(8, anchor.top - height - 4)
    : anchor.bottom + 4
  menuStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(Math.max(8, Math.min(anchor.right - width, window.innerWidth - width - 8)))}px`,
    width: `${Math.round(Math.min(width, window.innerWidth - 16))}px`,
    maxHeight: '320px',
  }
}

async function openMenu() {
  if (menuOpen.value || !props.history.length) return
  menuOpen.value = true
  await nextTick()
  positionMenu()
  menu.value?.querySelector<HTMLElement>('.history-choice')?.focus({ preventScroll: true })
}

function closeMenu(restore = false) {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (restore) historyTrigger.value?.focus({ preventScroll: true })
}

function choose(address: string) {
  draft.value = address
  closeMenu(true)
}

function forget(address: string) {
  emit('forget', address)
  if (props.history.length <= 1) closeMenu(true)
}

function onMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu(true)
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
  const items = [...(menu.value?.querySelectorAll<HTMLElement>('.history-choice') || [])]
  if (!items.length) return
  event.preventDefault()
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (event.key === 'ArrowDown') items[(index + 1 + items.length) % items.length].focus()
  else if (event.key === 'ArrowUp') items[(index - 1 + items.length) % items.length].focus()
  else if (event.key === 'Home') items[0].focus()
  else items[items.length - 1].focus()
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (menu.value?.contains(target) || field.value?.contains(target)) return
  closeMenu()
}

function onViewportChange(event: Event) {
  if (event.type === 'scroll' && event.target instanceof Node && menu.value?.contains(event.target)) return
  closeMenu()
}

watch(menuOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange)
  } else {
    document.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('scroll', onViewportChange, true)
    window.removeEventListener('resize', onViewportChange)
  }
})

watch(() => props.history.length, (length) => {
  if (!length) closeMenu()
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})
</script>

<template>
  <div class="backend-fields">
    <md-outlined-text-field
      ref="field"
      class="backend-address-field"
      :label="t('backend.address')"
      :value="modelValue"
      :error="Boolean(error)"
      :error-text="error || undefined"
      type="url"
      inputmode="url"
      autocomplete="url"
      spellcheck="false"
      placeholder="https://example.com"
      @input="onInput"
      @keydown.enter.prevent="emit('test')"
    >
      <md-icon-button
        v-if="history.length"
        ref="historyTrigger"
        type="button"
        slot="trailing-icon"
        class="history-trigger"
        :aria-label="t('backend.history')"
        aria-haspopup="menu"
        :aria-expanded="menuOpen"
        @click="menuOpen ? closeMenu() : openMenu()"
      >
        <UiIcon name="clock" :size="20" />
      </md-icon-button>
    </md-outlined-text-field>

    <div class="backend-field-actions">
      <UiButton
        type="button"
        class="btn btn-outlined"
        icon="wifi"
        :loading="testing"
        :disabled="testing"
        @click="emit('test')"
      >
        {{ t('backend.test') }}
      </UiButton>
      <UiButton type="button" class="btn btn-tonal" :disabled="testing" @click="emit('apply')">
        {{ t('backend.apply') }}
      </UiButton>
    </div>

    <Teleport to="body">
      <div
        v-if="menuOpen"
        ref="menu"
        class="menu-popup history-menu"
        role="menu"
        :aria-label="t('backend.history')"
        :style="menuStyle"
        @keydown="onMenuKeydown"
      >
        <div v-for="address in history" :key="address" class="history-row">
          <button type="button" class="menu-item history-choice" role="menuitem" @click="choose(address)">
            <UiIcon name="link" :size="18" />
            <span class="history-address">{{ address }}</span>
          </button>
          <button
            type="button"
            class="icon-btn history-remove"
            :aria-label="t('backend.removeHistory')"
            @click.stop="forget(address)"
          >
            <UiIcon name="close" :size="14" />
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.backend-fields {
  display: grid;
  gap: var(--nova-space-3);
}

.backend-address-field {
  width: 100%;
  min-width: 0;
}

.history-trigger {
  color: var(--md-sys-color-on-surface-variant);
}

.backend-field-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nova-space-2);
}

.history-menu {
  overflow-y: auto;
  overscroll-behavior: contain;
}

.history-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 2px;
}

.history-choice {
  min-width: 0;
  flex: 1 1 auto;
  gap: var(--nova-space-2);
}

.history-choice .ui-icon {
  color: var(--md-sys-color-on-surface-variant);
}

.history-address {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-remove {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  color: var(--md-sys-color-on-surface-variant);
}
</style>
