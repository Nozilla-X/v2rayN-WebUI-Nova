<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  indeterminate?: boolean
  disabled?: boolean
  ariaLabel?: string
}>(), { indeterminate: false, disabled: false, ariaLabel: '' })

const emit = defineEmits<{ change: [checked: boolean]; 'update:modelValue': [checked: boolean] }>()
const input = ref<HTMLElement & { checked: boolean; indeterminate: boolean } | null>(null)

function sync() {
  if (input.value) input.value.indeterminate = props.indeterminate
}

function onChange(event: Event) {
  const checked = (event.target as HTMLElement & { checked: boolean }).checked
  emit('update:modelValue', checked)
  emit('change', checked)
}

watch(() => props.indeterminate, sync)
onMounted(sync)
</script>

<template>
  <md-checkbox
    ref="input"
    class="nova-checkbox"
    :checked="modelValue"
    :indeterminate="indeterminate"
    :disabled="disabled"
    :aria-label="ariaLabel || undefined"
    @change="onChange"
    @click.stop
  />
</template>

<style scoped>
.nova-checkbox {
  flex: 0 0 auto;
  vertical-align: middle;
}
</style>
