<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from './UiIcon.vue'

type FieldType = 'text' | 'email' | 'password' | 'url' | 'number' | 'textarea'

const props = withDefaults(defineProps<{
  modelValue: string | number | null | undefined
  label?: string
  type?: FieldType
  hint?: string
  error?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
  autocomplete?: string
  inputmode?: string
  min?: number | string
  max?: number | string
  minlength?: number | string
  maxlength?: number | string
  step?: number | string
  rows?: number | string
  prefixText?: string
  suffixText?: string
  revealPassword?: boolean
  mono?: boolean
}>(), {
  label: '',
  type: 'text',
  hint: '',
  error: '',
  disabled: false,
  required: false,
  placeholder: '',
  autocomplete: 'off',
  inputmode: undefined,
  min: undefined,
  max: undefined,
  minlength: undefined,
  maxlength: undefined,
  step: undefined,
  rows: undefined,
  prefixText: '',
  suffixText: '',
  revealPassword: false,
  mono: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
const { t } = useI18n()
const revealed = ref(false)
const actualType = computed(() => {
  if (props.type !== 'password') return props.type
  return revealed.value ? 'text' : 'password'
})

function onInput(event: Event) {
  const raw = (event.target as HTMLElement & { value: string }).value
  emit('update:modelValue', props.type === 'number' && raw !== '' ? Number(raw) : raw)
}

function toggleReveal() {
  revealed.value = !revealed.value
}
</script>

<template>
  <md-outlined-text-field
    class="ui-text-field"
    :class="{ 'ui-text-field-mono': mono }"
    :label="label || undefined"
    :type="actualType"
    :value="modelValue === null || modelValue === undefined ? '' : String(modelValue)"
    :disabled="disabled || undefined"
    :required="required || undefined"
    :placeholder="placeholder || undefined"
    :autocomplete="autocomplete"
    :inputmode="inputmode"
    :min="min === undefined ? undefined : String(min)"
    :max="max === undefined ? undefined : String(max)"
    :minlength="minlength === undefined ? undefined : String(minlength)"
    :maxlength="maxlength === undefined ? undefined : String(maxlength)"
    :step="step === undefined ? undefined : String(step)"
    :rows="rows === undefined ? undefined : Number(rows)"
    :supporting-text="hint || undefined"
    :error-text="error || undefined"
    :error="Boolean(error) || undefined"
    :prefix-text="prefixText || undefined"
    :suffix-text="suffixText || undefined"
    spellcheck="false"
    @input="onInput"
  >
    <md-icon-button
      v-if="revealPassword && type === 'password'"
      type="button"
      slot="trailing-icon"
      class="ui-text-field-action"
      :aria-label="revealed ? t('common.hidePassword') : t('common.showPassword')"
      :title="revealed ? t('common.hidePassword') : t('common.showPassword')"
      @click="toggleReveal"
    >
      <UiIcon :name="revealed ? 'eye-off' : 'eye'" :size="20" />
    </md-icon-button>
  </md-outlined-text-field>
</template>

<style scoped>
.ui-text-field {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.ui-text-field-mono {
  --md-outlined-text-field-input-text-font: var(--md-sys-typescale-font-mono);
}

.ui-text-field-action {
  color: var(--md-sys-color-on-surface-variant);
}
</style>
