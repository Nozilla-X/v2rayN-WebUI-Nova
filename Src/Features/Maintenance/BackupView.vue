<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionMenu, { type ActionMenuItem } from '../../Components/Material/ActionMenu.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'

const { t } = useI18n()
const app = useNovaApp()
const state = app.maintenance.maintenancePageState
const actions = app.maintenance.maintenancePageActions
const webdavItems = computed<ActionMenuItem[]>(() => [
  { id: 'check', label: t('maintenance.checkWebdav'), icon: 'search' },
  { id: 'backup', label: t('maintenance.backupWebdav'), icon: 'backup' },
  { id: 'restore', label: t('maintenance.restoreWebdav'), icon: 'upload', danger: true },
])

function webdavAction(id: string) {
  if (id === 'check' || id === 'backup' || id === 'restore') void actions.webdavAction(id)
}
</script>

<template>
  <div class="backup-view">
    <section class="card local-card">
      <div class="section-title">
        <h2>{{ t('maintenance.localBackup') }}</h2>
        <small>{{ t('maintenance.backup') }}</small>
      </div>
      <div class="backup-actions">
        <UiButton type="button" class="btn btn-filled" @click="actions.downloadBackup" icon="download">{{ t('maintenance.downloadBackup') }}
        </UiButton>
        <label class="btn btn-danger-tonal file-trigger">
          <UiIcon name="upload" />{{ t('maintenance.restoreUpload') }}
          <input type="file" accept=".zip,application/zip" :aria-label="t('maintenance.restoreUpload')" @change="actions.uploadRestore" />
        </label>
      </div>
      <p class="banner banner-warning">{{ t('maintenance.restoreWarning') }}</p>
    </section>

    <section class="card webdav-card">
      <div class="section-title">
        <h2>{{ t('maintenance.webdav') }}</h2>
      </div>
      <div class="field-row">
        <label class="field">
          <span class="field-label">{{ t('maintenance.webdavUrl') }}</span>
          <input v-model="state.webdavForm.url" type="url" autocomplete="url" spellcheck="false" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('maintenance.webdavDir') }}</span>
          <input v-model="state.webdavForm.dirName" type="text" autocomplete="off" spellcheck="false" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('maintenance.webdavUser') }}</span>
          <input v-model="state.webdavForm.userName" type="text" autocomplete="username" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('maintenance.webdavPassword') }}</span>
          <input v-model="state.webdavForm.password" type="password" autocomplete="new-password" />
        </label>
      </div>
      <p v-if="state.webdavForm.hasPassword" class="field-hint">{{ t('maintenance.passwordStored') }}</p>

      <div class="webdav-actions">
        <UiButton type="button" class="btn btn-filled" @click="actions.saveWebdav" icon="save">{{ t('maintenance.webdavSettings') }}
        </UiButton>
        <UiButton type="button" class="btn btn-outlined desktop-only" @click="actions.webdavAction('check')" icon="search">{{ t('maintenance.checkWebdav') }}
        </UiButton>
        <UiButton type="button" class="btn btn-tonal desktop-only" @click="actions.webdavAction('backup')" icon="backup">{{ t('maintenance.backupWebdav') }}
        </UiButton>
        <UiButton type="button" class="btn btn-danger-tonal desktop-only" @click="actions.webdavAction('restore')" icon="upload">{{ t('maintenance.restoreWebdav') }}
        </UiButton>
        <ActionMenu :items="webdavItems" :label="t('common.more')" :button-text="t('common.more')" button-class="btn btn-tonal btn-small mobile-only" @select="webdavAction" />
      </div>
      <p class="banner banner-warning">{{ t('maintenance.webdavRestoreWarning') }}</p>
    </section>
  </div>
</template>

<style scoped>
.backup-view {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
  gap: var(--nova-space-3);
  align-items: start;
}

.local-card,
.webdav-card {
  display: grid;
  min-width: 0;
  gap: var(--nova-space-3);
}

.backup-actions,
.webdav-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--nova-space-2);
}

.file-trigger {
  cursor: pointer;
}

.file-trigger:focus-within {
  outline: var(--nova-focus-ring);
  outline-offset: var(--nova-focus-offset);
}

.webdav-card .field-row {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: var(--nova-space-3);
}

@media (max-width: 480px) {
  .backup-actions > .btn,
  .webdav-actions > .btn {
    flex: 1 1 100%;
    min-height: var(--nova-control-height-touch);
  }

  /* The WebDAV menu trigger is the only remaining control next to the
     full-width save button; keep it on the trailing edge instead of leaving a
     small pill stranded at the start of the next line. */
  .webdav-actions {
    justify-content: flex-end;
  }
}
</style>
