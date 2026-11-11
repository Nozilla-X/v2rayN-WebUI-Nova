<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  size?: 'small' | 'medium'
  selected?: boolean
  toggle?: boolean
  disabled?: boolean
}>(), { size: 'small', selected: false, toggle: false, disabled: false })

const buttonStyle = computed(() => ({
  '--md-icon-button-icon-size': props.size === 'small' ? '20px' : '24px',
  '--md-icon-button-state-layer-width': props.size === 'small' ? '40px' : '48px',
  '--md-icon-button-state-layer-height': props.size === 'small' ? '40px' : '48px',
}))
</script>

<template>
  <md-icon-button
    class="nova-icon-button"
    type="button"
    :aria-label="label"
    :title="label"
    :selected="selected"
    :toggle="toggle"
    :disabled="disabled"
    :style="buttonStyle"
  >
    <slot />
  </md-icon-button>
</template>

<style scoped>
.nova-icon-button {
  flex: 0 0 auto;
  color: var(--md-sys-color-on-surface-variant);
  transition:
    background-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}

.nova-icon-button:hover {
  color: var(--md-sys-color-on-surface);
}

.nova-icon-button[selected] {
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
</style>
