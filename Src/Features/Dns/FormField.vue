<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'

type FieldKind = 'text' | 'password' | 'number' | 'select' | 'textarea' | 'check' | 'code'
type Option = string | number | null
const props = withDefaults(defineProps<{
  label: string
  modelValue: unknown
  kind?: FieldKind
  options?: Option[]
  suggestions?: string[]
  wide?: boolean
  disabled?: boolean
  min?: number | string
  max?: number | string
  step?: number | string
  hint?: string
  allowNone?: boolean
  noneValue?: Option
}>(), { kind: 'text', options: () => [], suggestions: () => [], wide: false, disabled: false, allowNone: false, noneValue: '' })

const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()
const { t } = useI18n()
const choice = computed(() => String(props.modelValue ?? ''))
const hasCurrent = computed(() => props.options.some(value => String(value ?? '') === choice.value))
const noneOption = computed(() => props.allowNone || props.options.some(value => value === '' || value === null))
const choices = computed(() => {
  const values = props.options.filter(value => !props.allowNone || (value !== '' && value !== null))
  if (!hasCurrent.value && choice.value) values.unshift(props.modelValue as Option)
  return values
})
const textType = computed(() => props.kind === 'password' ? 'password' : props.kind === 'number' ? 'number' : 'text')
const hasSuggestions = computed(() => props.suggestions.length > 0 && props.kind !== 'select' && props.kind !== 'check')
const trigger = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const menuStyle = ref<Record<string, string>>({ top: '-9999px', left: '-9999px', width: '240px' })

function update(value: unknown) {
  emit('update:modelValue', value)
}

function onInput(event: Event) {
  const value = (event.target as HTMLElement & { value: string }).value
  update(props.kind === 'number' && value !== '' ? Number(value) : value)
}

function onSelect(event: Event) {
  const value = (event.target as HTMLElement & { value: string }).value
  if (value === '' && props.allowNone) {
    update(props.noneValue)
    return
  }
  const original = props.options.find(option => String(option ?? '') === value)
  update(original !== undefined ? original : value)
}

function onCheck() {
  update(!Boolean(props.modelValue))
}

function positionMenu() {
  const triggerRect = trigger.value?.getBoundingClientRect()
  if (!triggerRect) return
  // Anchor on the whole field, not the trailing icon: the popup should line up
  // with the input's left edge and share its width instead of hanging off the
  // right edge and covering the neighbouring column.
  const field = trigger.value?.closest('md-outlined-text-field') as HTMLElement | null
  const anchor = field?.getBoundingClientRect() || triggerRect
  const height = menu.value?.offsetHeight || Math.min(320, props.suggestions.length * 48 + 8)
  const width = Math.max(anchor.width, 200)
  const top = anchor.bottom + 4 + height > window.innerHeight - 8
    ? Math.max(8, anchor.top - height - 4)
    : anchor.bottom + 4
  menuStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)))}px`,
    width: `${Math.round(width)}px`,
    maxHeight: '320px',
  }
}

async function openSuggestions() {
  if (props.disabled || !hasSuggestions.value || menuOpen.value) return
  menuOpen.value = true
  await nextTick()
  positionMenu()
  menu.value?.querySelector<HTMLElement>('.menu-item')?.focus({ preventScroll: true })
}

function closeSuggestions(restore = false) {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (restore) trigger.value?.focus({ preventScroll: true })
}

function chooseSuggestion(value: string) {
  update(value)
  closeSuggestions()
}

function onMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeSuggestions(true)
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
  const items = [...(menu.value?.querySelectorAll<HTMLElement>('.menu-item') || [])]
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
  if (menu.value?.contains(target) || trigger.value?.contains(target)) return
  closeSuggestions()
}

function onViewportChange(event: Event) {
  if (event.type === 'scroll' && event.target instanceof Node && menu.value?.contains(event.target)) return
  closeSuggestions()
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

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})
</script>

<template>
  <div class="field" :class="{ 'field-wide': wide, 'field-check': kind === 'check' }">
    <template v-if="kind === 'check'">
      <label class="check">
        <UiCheckbox
          :model-value="Boolean(modelValue)"
          :disabled="disabled"
          :aria-label="label"
          @change="onCheck"
        />
        <span>{{ label }}</span>
      </label>
      <p v-if="hint" class="field-hint">{{ hint }}</p>
    </template>

    <template v-else>
      <md-outlined-select
        v-if="kind === 'select'"
        class="nova-field nova-select"
        :label="label"
        :value="choice"
        :disabled="disabled"
        :supporting-text="hint"
        menu-positioning="fixed"
        @change="onSelect"
      >
        <!-- Material's select option reads its display text from the headline
             slot; a `headline` attribute renders an empty row and leaves the
             select looking unselected. -->
        <md-select-option v-if="noneOption" value="">
          <div slot="headline">{{ t('common.none') }}</div>
        </md-select-option>
        <md-select-option
          v-for="(value, index) in choices"
          :key="`${String(value)}-${index}`"
          :value="String(value ?? '')"
        >
          <div slot="headline">{{ value === '' || value === null ? t('common.none') : String(value) }}</div>
        </md-select-option>
      </md-outlined-select>

      <textarea
        v-else-if="kind === 'code'"
        class="code-area nova-code-field"
        :value="String(modelValue ?? '')"
        :disabled="disabled"
        spellcheck="false"
        @input="onInput"
      ></textarea>

      <md-outlined-text-field
        v-else
        class="nova-field"
        :label="label"
        :type="kind === 'textarea' ? 'textarea' : textType"
        :rows="kind === 'textarea' ? 4 : undefined"
        :value="String(modelValue ?? '')"
        :disabled="disabled"
        :min="min === undefined ? undefined : String(min)"
        :max="max === undefined ? undefined : String(max)"
        :step="step === undefined ? undefined : String(step)"
        :supporting-text="hint || ''"
        autocomplete="off"
        spellcheck="false"
        @input="onInput"
      >
        <md-icon-button
          v-if="hasSuggestions"
          ref="trigger"
          type="button"
          slot="trailing-icon"
          class="suggestion-trigger"
          :aria-label="`${label} · ${t('common.chooseFromList')}`"
          :title="t('common.chooseFromList')"
          aria-haspopup="listbox"
          :aria-expanded="menuOpen"
          :disabled="disabled"
          @click="openSuggestions"
        >
          <UiIcon name="chevron-down" :size="20" />
        </md-icon-button>
      </md-outlined-text-field>

      <Teleport to="body">
        <div
          v-if="menuOpen"
          ref="menu"
          class="menu-popup suggestion-menu"
          role="listbox"
          :aria-label="label"
          :style="menuStyle"
          @keydown="onMenuKeydown"
        >
          <button
            v-for="value in suggestions"
            :key="value"
            type="button"
            class="menu-item suggestion-option"
            role="option"
            :title="value"
            @click="chooseSuggestion(value)"
          >
            <span>{{ value }}</span>
            <UiIcon v-if="String(modelValue) === value" name="check" :size="18" />
          </button>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.field {
  min-width: 0;
}

.nova-field {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.nova-select {
  --md-outlined-select-menu-max-height: 320px;
}

.nova-code-field {
  width: 100%;
  min-height: 200px;
  padding: var(--nova-space-3) var(--nova-space-4);
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-small);
  outline: none;
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface);
  font-family: var(--md-sys-typescale-font-mono);
  font-size: var(--md-sys-typescale-body-medium-size);
  line-height: var(--md-sys-typescale-body-medium-line);
  resize: vertical;
}

.nova-code-field:focus {
  border-color: var(--md-sys-color-primary);
  box-shadow: 0 0 0 1px var(--md-sys-color-primary);
}

.suggestion-trigger {
  color: var(--md-sys-color-on-surface-variant);
}

.suggestion-menu {
  overflow-y: auto;
  overscroll-behavior: contain;
}

.suggestion-option {
  gap: var(--nova-space-3);
}

.suggestion-option span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-check {
  align-content: center;
}

.check {
  min-width: 0;
}

.check span {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
