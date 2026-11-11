<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import UiIcon from './UiIcon.vue'

type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated'
type Size = 'small' | 'medium' | 'large'

const props = withDefaults(defineProps<{
  variant?: Variant | ''
  size?: Size | ''
  icon?: string
  trailingIcon?: string
  loading?: boolean
}>(), { variant: '', size: '', icon: '', trailingIcon: '', loading: false })
const attrs = useAttrs()

const classes = computed(() => String(attrs.class || '').split(/\s+/).filter(Boolean))
const variant = computed<Variant>(() => {
  if (props.variant) return props.variant
  if (classes.value.includes('btn-filled')) return 'filled'
  if (classes.value.includes('btn-tonal') || classes.value.includes('btn-danger-tonal')) return 'tonal'
  if (classes.value.includes('btn-outlined')) return 'outlined'
  if (classes.value.includes('btn-elevated')) return 'elevated'
  return 'text'
})
const size = computed<Size>(() => {
  if (props.size) return props.size
  if (classes.value.includes('btn-small')) return 'small'
  if (classes.value.includes('btn-large')) return 'large'
  return 'medium'
})
const TAG_BY_VARIANT = {
  filled: 'md-filled-button',
  tonal: 'md-filled-tonal-button',
  outlined: 'md-outlined-button',
  text: 'md-text-button',
  elevated: 'md-elevated-button',
} as const
const tag = computed(() => TAG_BY_VARIANT[variant.value])
</script>

<template>
  <component
    :is="tag"
    class="nova-button"
    :aria-busy="loading || undefined"
    :style="{
      [`--${tag}-container-height`]: size === 'small' ? '36px' : size === 'large' ? '56px' : '40px',
      [`--${tag}-leading-space`]: size === 'small' ? '12px' : '16px',
      [`--${tag}-trailing-space`]: size === 'small' ? '12px' : '16px',
    }"
  >
    <span v-if="icon || loading || $slots.icon" slot="icon" class="nova-button-icon">
      <span v-if="loading" class="nova-button-spinner" aria-hidden="true" />
      <UiIcon v-else-if="icon" :name="icon" :size="18" />
      <slot v-else name="icon" />
    </span>
    <slot />
    <span v-if="trailingIcon || $slots.trailingIcon" slot="trailing-icon" class="nova-button-icon">
      <UiIcon v-if="trailingIcon" :name="trailingIcon" :size="18" />
      <slot v-else name="trailingIcon" />
    </span>
  </component>
</template>

<style scoped>
.nova-button {
  flex: 0 0 auto;
  max-width: 100%;
}

.nova-button-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  flex: none;
}

.nova-button-icon :deep(.ui-icon) {
  width: 18px;
  height: 18px;
}

.nova-button-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--md-sys-shape-corner-full);
  animation: nova-button-spin 720ms linear infinite;
}

@keyframes nova-button-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .nova-button-spinner { animation-duration: 1800ms; }
}
</style>
