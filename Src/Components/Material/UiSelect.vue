<script setup lang="ts">
import { computed, Fragment, isVNode, useSlots, type VNode } from 'vue'

type SelectValue = string | number | null

interface ParsedOption {
  value: SelectValue
  label: string
  disabled: boolean
}

const props = withDefaults(defineProps<{
  modelValue: SelectValue | undefined
  label?: string
  ariaLabel?: string
  hint?: string
  error?: string
  disabled?: boolean
  required?: boolean
}>(), {
  modelValue: '',
  label: '',
  ariaLabel: '',
  hint: '',
  error: '',
  disabled: false,
  required: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: SelectValue] }>()
const slots = useSlots()

function flatten(nodes: unknown[]): VNode[] {
  return nodes.flatMap((node) => {
    if (!isVNode(node)) return []
    if (node.type === Fragment && Array.isArray(node.children)) return flatten(node.children)
    return [node]
  })
}

function textOf(node: VNode | string | number | null | undefined): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (!node) return ''
  if (Array.isArray(node.children)) return node.children.map(child => textOf(child as VNode | string)).join('')
  if (typeof node.children === 'string') return node.children
  return ''
}

const options = computed<ParsedOption[]>(() => flatten(slots.default?.() ?? [])
  .filter(node => node.type === 'option')
  .map((node) => {
    const raw = node.props?.value
    return {
      value: raw === undefined ? textOf(node) : raw as SelectValue,
      label: textOf(node).trim(),
      disabled: Boolean(node.props?.disabled),
    }
  }))

// Material selects cannot represent an option whose value is the empty string:
// it is treated as "no selection" and the option never renders as chosen. Give
// that option an internal sentinel so states such as "无" stay visible.
const emptyOptionSentinel = '__nova_select_empty__'
const hasEmptyOption = computed(() => options.value.some(option => String(option.value ?? '') === ''))

function internalValue(option: ParsedOption): string {
  return option.value === '' ? emptyOptionSentinel : String(option.value ?? '')
}

const value = computed(() => {
  const raw = props.modelValue === null || props.modelValue === undefined ? '' : String(props.modelValue)
  return raw === '' && hasEmptyOption.value ? emptyOptionSentinel : raw
})

function onChange(event: Event) {
  const raw = (event.target as HTMLElement & { value: string }).value
  const selected = options.value.find(option => internalValue(option) === raw)
  emit('update:modelValue', selected ? selected.value : raw)
}
</script>

<template>
  <md-outlined-select
    class="ui-select"
    :label="label || undefined"
    :aria-label="ariaLabel || undefined"
    :value="value"
    :disabled="disabled || undefined"
    :required="required || undefined"
    :supporting-text="hint || undefined"
    :error-text="error || undefined"
    :error="Boolean(error) || undefined"
    menu-positioning="fixed"
    @change="onChange"
  >
    <md-select-option
      v-for="(option, index) in options"
      :key="`${String(option.value)}-${index}`"
      :value="internalValue(option)"
      :disabled="option.disabled || undefined"
    >
      <div slot="headline">{{ option.label }}</div>
    </md-select-option>
  </md-outlined-select>
</template>

<style scoped>
.ui-select {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}
</style>
