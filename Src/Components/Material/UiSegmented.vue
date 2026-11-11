<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import UiIcon from './UiIcon.vue'

export interface SegmentedOption {
  id: string
  label: string
  icon?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: SegmentedOption[]
  ariaLabel?: string
  disabled?: boolean
}>(), { ariaLabel: '', disabled: false })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const root = ref<HTMLElement | null>(null)
const activeIndex = computed(() => Math.max(0, props.options.findIndex((option) => option.id === props.modelValue)))
const style = computed(() => ({
  '--segment-count': String(Math.max(1, props.options.length)),
  '--segment-index': String(activeIndex.value),
}))

function choose(option: SegmentedOption) {
  if (props.disabled || option.id === props.modelValue) return
  emit('update:modelValue', option.id)
}

async function onKeydown(event: KeyboardEvent, index: number) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  if (props.disabled) return
  let next = index
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + props.options.length) % props.options.length
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % props.options.length
  else if (event.key === 'Home') next = 0
  else next = props.options.length - 1
  choose(props.options[next])
  await nextTick()
  root.value?.querySelectorAll<HTMLButtonElement>('.ui-segmented-option')[next]?.focus()
}
</script>

<template>
  <div
    ref="root"
    class="ui-segmented"
    :class="{ 'is-disabled': disabled }"
    role="radiogroup"
    :aria-label="ariaLabel || undefined"
    :style="style"
  >
    <span class="ui-segmented-indicator" aria-hidden="true" />
    <button
      v-for="(option, index) in options"
      :key="option.id"
      type="button"
      class="ui-segmented-option"
      role="radio"
      :aria-checked="modelValue === option.id"
      :tabindex="modelValue === option.id ? 0 : -1"
      :disabled="disabled"
      @click="choose(option)"
      @keydown="onKeydown($event, index)"
    >
      <UiIcon v-if="option.icon" :name="option.icon" :size="18" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.ui-segmented {
  position: relative;
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  min-width: 0;
  min-height: 40px;
  overflow: hidden;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
}

.ui-segmented-indicator {
  position: absolute;
  z-index: 0;
  top: 0;
  bottom: 0;
  left: 0;
  width: calc(100% / var(--segment-count));
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-secondary-container);
  transform: translateX(calc(var(--segment-index) * 100%));
  transition:
    transform var(--md-sys-motion-duration-medium2) var(--nova-motion-spring),
    background-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}

.ui-segmented-option {
  position: relative;
  z-index: 1;
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: var(--nova-space-2);
  padding: 0 var(--nova-space-3);
  border: 0;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  line-height: var(--md-sys-typescale-label-large-line-height);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  white-space: nowrap;
  transition: color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}

.ui-segmented-option + .ui-segmented-option::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 0;
  width: 1px;
  background: var(--md-sys-color-outline);
  content: "";
  transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}

.ui-segmented-option[aria-checked="true"] {
  color: var(--md-sys-color-on-secondary-container);
}

.ui-segmented-option[aria-checked="true"]::before,
.ui-segmented-option[aria-checked="true"] + .ui-segmented-option::before {
  opacity: 0;
}

.ui-segmented-option:not(:disabled):hover {
  color: var(--md-sys-color-on-surface);
}

.ui-segmented-option:focus-visible {
  outline: var(--nova-focus-ring);
  outline-offset: -3px;
  border-radius: var(--md-sys-shape-corner-full);
}

.ui-segmented.is-disabled {
  opacity: var(--nova-disabled-opacity);
}

@media (prefers-reduced-motion: reduce) {
  /* The selection indicator changes place instantly; no sliding. */
  .ui-segmented-indicator {
    transition: background-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
  }
}
</style>
