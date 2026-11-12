<script setup lang="ts">
import UiIcon from './UiIcon.vue'
import { vDetailsMotion } from '../../UI/detailsMotion'

withDefaults(defineProps<{
  summary: string
  hint?: string
  open?: boolean
}>(), { hint: '', open: false })
</script>

<template>
  <details v-details-motion class="ui-disclosure" :open="open">
    <summary>
      <span class="disclosure-title">{{ summary }}</span>
      <small v-if="hint" class="disclosure-hint">{{ hint }}</small>
      <UiIcon class="disclosure-chevron" name="chevron-down" :size="20" />
    </summary>
    <div class="disclosure-body ui-details-content">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.ui-disclosure {
  border-top: 1px solid var(--nova-color-divider);
}

.ui-disclosure > summary {
  display: flex;
  min-height: var(--nova-touch-target);
  align-items: center;
  gap: var(--nova-space-2);
  padding: var(--nova-space-2) 0;
  color: var(--md-sys-color-on-surface);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-weight-medium);
  line-height: var(--md-sys-typescale-label-large-line);
  cursor: pointer;
  user-select: none;
  list-style: none;
}

.ui-disclosure > summary::-webkit-details-marker {
  display: none;
}

.ui-disclosure > summary:focus-visible {
  outline: var(--nova-focus-ring);
  outline-offset: var(--nova-focus-offset);
}

.disclosure-title {
  min-width: 0;
}

.disclosure-hint {
  min-width: 0;
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
  font-weight: var(--md-sys-typescale-weight-regular);
  line-height: var(--md-sys-typescale-body-small-line);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disclosure-chevron {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--md-sys-color-on-surface-variant);
  transition: transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}

.ui-disclosure[open] .disclosure-chevron {
  transform: rotate(180deg);
}

.disclosure-body {
  padding: var(--nova-space-2) 0 var(--nova-space-3);
}

@media (prefers-reduced-motion: reduce) {
  .disclosure-chevron {
    transition: none;
  }
}
</style>
