<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../../Components/Material/AppDialog.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import { useNovaApp } from '../../App/context'

const { t } = useI18n()
const app = useNovaApp()
const state = app.profiles.importProfilesModalState
const actions = app.profiles.importProfilesModalActions

function close() {
  state.showImportForm = false
}
import UiSelect from '../../Components/Material/UiSelect.vue'
</script>

<template>
  <AppDialog :open="state.showImportForm" :title="t('nodes.importNodes')" wide @close="close">
    <form id="profile-import-form" class="import-form" @submit.prevent="actions.importProfiles">
      <UiSelect :label="t('subscriptions.source')" v-model="state.importForm.subscriptionId">
          <option value="">{{ t('common.allGroups') }}</option>
          <option v-for="group in state.groups.filter((item: Record<string, any>) => item.id)" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </UiSelect>

      <label class="field">
        <span class="field-label">{{ t('nodes.importContent') }}</span>
        <textarea
          v-model="state.importForm.content"
          class="code-area import-content"
          required
          :placeholder="t('nodes.importHint')"
          spellcheck="false"
        />
      </label>

      <label class="check">
        <UiCheckbox v-model="state.importForm.isSubscription" />
        <span>{{ t('nodes.isSubscription') }}</span>
      </label>

      <div class="button-row">
        <label class="btn btn-tonal file-trigger">
          <span>{{ t('common.openFile') }}</span>
          <input type="file" accept=".txt,.json,.conf" @change="actions.readImportFile" />
        </label>
        <UiButton type="button" class="btn btn-text" @click="actions.pasteImport">{{ t('common.paste') }}</UiButton>
      </div>
    </form>

    <template #actions>
      <UiButton type="button" class="btn btn-text" @click="close">{{ t('common.cancel') }}</UiButton>
      <UiButton type="submit" form="profile-import-form" class="btn btn-filled">{{ t('common.import') }}</UiButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.import-form {
  display: grid;
  gap: var(--nova-space-4);
  min-width: 0;
}

.import-content {
  min-height: 220px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nova-space-2);
}

@media (max-width: 600px) {
  .button-row .btn {
    flex: 1 1 auto;
  }
}
</style>
