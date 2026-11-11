<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { readFieldValue, type FieldValueHost } from '../../UI/fieldValue'
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
const field = ref<FieldValueHost | null>(null)
const actualType = computed(() => {
  if (props.type !== 'password') return props.type
  return revealed.value ? 'text' : 'password'
})

function syncFromDom(): string {
  const raw = readFieldValue(field.value)
  // Keep the Material host state in sync as well. Autofill can update the
  // shadow input without notifying the host, and the next validator or render
  // pass would otherwise restore the empty host value over the filled control.
  if (field.value && field.value.value !== raw) field.value.value = raw
  // Focusing an optional field must not turn an absent value into an empty
  // string; only a real value (or a field that had a value before) is emitted.
  if (raw === '' && (props.modelValue === null || props.modelValue === undefined)) return raw
  const next = props.type === 'number' && raw !== '' ? Number(raw) : raw
  if (next !== props.modelValue) emit('update:modelValue', next)
  return raw
}

function onInput() {
  syncFromDom()
}

function toggleReveal() {
  syncFromDom()
  revealed.value = !revealed.value
}

type MaterialFieldHost = FieldValueHost & { updateComplete?: Promise<unknown> }
let detachNativeSync: (() => void) | undefined
let unmounted = false

async function attachNativeSync() {
  await nextTick()
  if (unmounted) return
  const host = field.value as MaterialFieldHost | null
  if (!host) return
  await host.updateComplete
  if (unmounted) return
  const root = host.shadowRoot
  if (!root) return
  // The native blur/change handlers run before the host's own listeners and
  // before Material's validator can overwrite a silently autofilled control.
  // Capture them at the shadow root so the live value is committed first.
  const sync = () => { syncFromDom() }
  root.addEventListener('focus', sync, true)
  root.addEventListener('blur', sync, true)
  root.addEventListener('change', sync, true)
  detachNativeSync = () => {
    root.removeEventListener('focus', sync, true)
    root.removeEventListener('blur', sync, true)
    root.removeEventListener('change', sync, true)
  }
}

onMounted(() => { void attachNativeSync() })
onBeforeUnmount(() => {
  unmounted = true
  detachNativeSync?.()
  detachNativeSync = undefined
})

defineExpose({ syncFromDom })
</script>

<template>
  <md-outlined-text-field
    ref="field"
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
    @change="onInput"
    @focusin="onInput"
    @focusout="onInput"
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
