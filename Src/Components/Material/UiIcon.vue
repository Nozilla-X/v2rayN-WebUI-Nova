<script setup lang="ts">
import { computed } from 'vue'
import { MATERIAL_ICONS } from './icons/generated'

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  filled?: boolean
  label?: string
}>(), { size: 20, filled: false, label: '' })

const glyph = computed(() => MATERIAL_ICONS[props.name] || MATERIAL_ICONS.help || MATERIAL_ICONS.info)
const paths = computed(() => props.filled ? glyph.value?.filled : glyph.value?.outlined)
</script>

<template>
  <svg
    class="ui-icon"
    :width="size"
    :height="size"
    viewBox="0 -960 960 960"
    fill="currentColor"
    :role="label ? 'img' : undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <title v-if="label">{{ label }}</title>
    <path v-for="(path, index) in paths" :key="index" :d="path" />
  </svg>
</template>

<style scoped>
.ui-icon {
  display: block;
  flex: none;
  overflow: visible;
}
</style>
