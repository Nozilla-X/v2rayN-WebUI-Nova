<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../../Components/Material/AppDialog.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import { useNovaApp } from '../../App/context'

const { t } = useI18n()
const app = useNovaApp()
const state = app.profiles.exportModalState
const actions = app.profiles.exportModalActions

function close() {
  state.showExportDialog = false
}
</script>

<template>
  <AppDialog :open="state.showExportDialog" :title="t('nodes.exportSelected')" wide @close="close">
    <div class="export-form">
      <div class="export-options">
        <label class="check">
          <UiCheckbox v-model="state.exportOptions.includeShareUris" />
          <span>{{ t('nodes.includeShareUris') }}</span>
        </label>
        <label class="check">
          <UiCheckbox v-model="state.exportOptions.base64ShareUris" />
          <span>{{ t('nodes.base64ShareUris') }}</span>
        </label>
        <label class="check">
          <UiCheckbox v-model="state.exportOptions.includeInnerUri" />
          <span>{{ t('nodes.includeInnerUri') }}</span>
        </label>
        <label class="check">
          <UiCheckbox v-model="state.exportOptions.includeClientConfig" />
          <span>{{ t('nodes.includeClientConfig') }}</span>
        </label>
        <UiButton type="button" class="btn btn-tonal btn-small" @click="actions.exportSelected">
          {{ t('common.regenerate') }}
        </UiButton>
      </div>

      <label class="field">
        <span class="sr-only">{{ t('nodes.exportSelected') }}</span>
        <textarea v-model="state.exportContent" class="code-area export-area" spellcheck="false" />
      </label>
    </div>

    <template #actions>
      <UiButton type="button" class="btn btn-text" @click="actions.copyExport">{{ t('common.copy') }}</UiButton>
      <UiButton type="button" class="btn btn-tonal" @click="actions.downloadExport">{{ t('common.download') }}</UiButton>
      <UiButton type="button" class="btn btn-filled" @click="close">{{ t('common.close') }}</UiButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.export-form {
  display: grid;
  gap: var(--nova-space-4);
  min-width: 0;
}

.export-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-2) var(--nova-space-4);
}

.export-area {
  width: 100%;
  min-height: 320px;
  resize: vertical;
}

@media (max-width: 600px) {
  .export-options {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
