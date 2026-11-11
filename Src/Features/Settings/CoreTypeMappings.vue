<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../../Components/Material/UiIcon.vue'

const props = defineProps<{
  mappings: Record<string, any>[]
  coreTypes: string[]
  dirty: boolean
  busy: boolean
}>()
const emit = defineEmits<{ save: [] }>()
const { t } = useI18n()

function coreLabel(core: string): string {
  if (core === 'sing_box') return 'sing-box'
  const key = core.toLowerCase().replaceAll('-', '').replaceAll('_', '')
  const localized = t(`maintenance.coreNames.${key}`)
  return localized === `maintenance.coreNames.${key}` ? core.replaceAll('_', '-') : localized
}
import UiSelect from '../../Components/Material/UiSelect.vue'
</script>

<template>
  <article class="card mapping-card">
    <div class="section-title">
      <div>
        <h2>{{ t('settings.coreTypes') }}</h2>
        <small>{{ t('settings.coreTypesHint') }}</small>
      </div>
    </div>

    <div v-if="mappings.length" class="mapping-list">
      <div v-for="mapping in mappings" :key="String(mapping.configType)" class="mapping-row">
        <div class="mapping-name">
          <small>{{ t('settings.mappingConfigType') }}</small>
          <strong>{{ mapping.configType }}</strong>
        </div>
        <UiSelect :label="t('settings.mappingCoreType')" v-model="mapping.coreType" :aria-label="`${t('settings.mappingCoreType')} ${mapping.configType}`">
            <option v-for="core in coreTypes" :key="core" :value="core">{{ coreLabel(core) }}</option>
          </UiSelect>
      </div>
    </div>
    <div v-else class="empty-state mapping-empty">
      <span class="empty-icon"><UiIcon name="layers" /></span>
      <strong>{{ t('common.empty') }}</strong>
    </div>

    <div class="save-bar">
      <span class="draft-status" :class="{ 'is-dirty': dirty }" role="status">
        {{ t(busy ? 'polish.saving' : dirty ? 'polish.unsaved' : 'polish.saved') }}
      </span>
      <UiButton type="button" class="btn btn-filled" :disabled="busy" :aria-busy="busy" @click="emit('save')" icon="save">{{ t('settings.saveCoreTypes') }}
      </UiButton>
    </div>
  </article>
</template>

<style scoped>
.mapping-card {
  display: grid;
  gap: var(--nova-space-4);
}

.section-title {
  margin: 0;
}

.mapping-list {
  display: grid;
  gap: var(--nova-space-2);
}

.mapping-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(min(100%, 240px), 0.8fr);
  align-items: center;
  gap: var(--nova-space-4);
  padding: var(--nova-space-3);
  border: 1px solid var(--nova-color-divider);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container-lowest);
}

.mapping-name {
  display: grid;
  min-width: 0;
  gap: var(--nova-space-1);
}

.mapping-name small {
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-medium-size);
}

.mapping-name strong {
  overflow-wrap: anywhere;
}

.mapping-row .field {
  min-width: 0;
}

.mapping-empty {
  min-height: 128px;
}

@media (max-width: 600px) {
  .mapping-row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--nova-space-2);
  }

  .save-bar .btn {
    flex: 1 1 auto;
  }
}
</style>
