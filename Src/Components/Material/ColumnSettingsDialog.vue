<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from './AppDialog.vue'
import UiButton from './UiButton.vue'
import UiCheckbox from './UiCheckbox.vue'

export interface ColumnOption {
  id: string
  label: string
  required?: boolean
}

const props = defineProps<{
  open: boolean
  title: string
  columns: ColumnOption[]
  modelValue: string[]
}>()

const emit = defineEmits<{ close: []; 'update:modelValue': [ids: string[]] }>()
const { t } = useI18n()
const draft = ref<string[]>([])

watch(() => props.open, (open) => {
  if (open) draft.value = [...props.modelValue]
}, { immediate: true })

function setColumn(id: string, checked: boolean) {
  const column = props.columns.find((item) => item.id === id)
  if (!column || column.required) return
  draft.value = checked
    ? [...new Set([...draft.value, id])]
    : draft.value.filter((item) => item !== id)
}

function reset() {
  draft.value = props.columns.map((column) => column.id)
}

function done() {
  emit('update:modelValue', [...draft.value])
  emit('close')
}
</script>

<template>
  <AppDialog :open="open" :title="title" small @close="emit('close')">
    <div class="column-settings-grid">
      <label v-for="column in columns" :key="column.id" class="column-option">
        <UiCheckbox
          :model-value="draft.includes(column.id)"
          :disabled="column.required"
          @change="setColumn(column.id, $event)"
        />
        <span>{{ column.label }}</span>
      </label>
    </div>
    <template #actions>
      <UiButton type="button" class="btn btn-text" @click="reset">{{ t('common.resetDefaults') }}</UiButton>
      <UiButton type="button" class="btn btn-filled" @click="done">{{ t('common.done') }}</UiButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.column-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--nova-space-2) var(--nova-space-3);
}

.column-option {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--nova-space-2);
  padding: 6px 4px;
  border-radius: var(--md-sys-shape-corner-small);
  cursor: pointer;
}

.column-option:hover {
  background: var(--nova-color-state-hover);
}

.column-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .column-settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
