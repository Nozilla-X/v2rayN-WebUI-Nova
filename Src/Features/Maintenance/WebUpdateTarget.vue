<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import type { Dict } from '../../Composables/types'

const { t } = useI18n()
const app = useNovaApp()
const state = app.maintenance.maintenancePageState
const actions = app.maintenance.maintenancePageActions
const webTargetType = computed(() => state.updateSettings.webTarget?.name === 'v2rayN.Web' ? 'v2rayN.Web' : 'v2rayN.WebAPI')
const target = computed<Dict>(() => state.updateSettings.webTarget || {})
const result = computed(() => state.updateResults[webTargetType.value] || {})
const progress = computed(() => state.updateProgress[webTargetType.value] || {})
const preRelease = computed(() => (state.updateSettings.checkPreReleaseCoreTypes || []).includes(webTargetType.value))
const busy = computed(() => state.operations.includes('core-update-batch') || state.operations.includes('web-update'))

function phase(item: Dict) {
  if (item.isComplete) return t(item.success ? 'maintenance.phase.completed' : 'maintenance.phase.failed')
  return t(`maintenance.phase.${item.phase}`)
}
</script>

<template>
  <article class="card update-card">
    <div class="card-head">
      <div>
        <h2>{{ target.name || t('maintenance.webApp') }}</h2>
        <small>{{ t('polish.targetWeb') }}</small>
        <small v-if="target.name">{{ t('maintenance.webCurrentVersion', { version: target.version }) }}</small>
        <small v-if="target.latestVersion">{{ t('maintenance.webLatestVersion', { version: target.latestVersion }) }}</small>
        <small v-if="target.name">{{ t('maintenance.webBuildIdentity', {
          commit: target.commit, buildDate: target.buildDate, rid: target.rid, deployment: target.deployment,
        }) }}</small>
        <small v-if="target.installReasonKey" class="field-hint">{{ t(target.installReasonKey) }}</small>
        <small v-if="result.detail">{{ result.detail }}</small>
      </div>
      <span v-if="result.updateAvailable" class="badge badge-primary">
        {{ t('maintenance.updateAvailable', { version: result.latestVersion }) }}
      </span>
      <span v-else-if="Object.keys(result).length" class="badge badge-success">{{ t('maintenance.upToDateGeneric') }}</span>
    </div>

    <div v-if="target.name" class="update-options">
      <label class="check">
        <UiCheckbox :model-value="Boolean(state.updateSettings.webSelected)" :disabled="!target.isSupported" @change="state.updateSettings.webSelected = !state.updateSettings.webSelected" />
        <span>{{ t('maintenance.includeWebUpdate') }}</span>
      </label>
      <label class="check">
        <UiCheckbox :model-value="preRelease" @change="actions.setPreReleaseTarget(webTargetType, !preRelease)" />
        <span>{{ t('maintenance.preRelease') }}</span>
      </label>
    </div>

    <div v-if="progress.phase || progress.isComplete" class="update-status" :class="{ failed: progress.isComplete && !progress.success }" role="status">
      <span v-if="!progress.isComplete" class="progress" aria-hidden="true" />
      <UiIcon v-else :name="progress.success ? 'success' : 'error'" />
      <span>{{ phase(progress) }}</span>
      <small v-if="progress.detail">{{ progress.detail }}</small>
      <small v-if="progress.isComplete && progress.success === false && progress.rollbackSucceeded !== null && progress.rollbackSucceeded !== undefined">
        {{ t(progress.rollbackSucceeded ? 'maintenance.webRollbackSucceeded' : 'maintenance.webRollbackFailed') }}
      </small>
    </div>

    <div class="update-actions">
      <UiButton type="button" class="btn btn-outlined" :disabled="!target.canCheck || busy" @click="actions.checkWebUpdate" icon="search">{{ t('maintenance.checkWebUpdate') }}
      </UiButton>
      <UiButton type="button" class="btn btn-filled" :disabled="!state.updateSettings.webSelected || !target.canInstall || busy" @click="actions.updateWeb" icon="download">{{ t('maintenance.installWebUpdate') }}
      </UiButton>
    </div>
  </article>
</template>

<style scoped>
.update-card {
  display: grid;
  gap: var(--nova-space-3);
}

.update-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nova-space-2) var(--nova-space-5);
}

.update-status {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-2);
  padding: var(--nova-space-2) var(--nova-space-3);
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--nova-color-info-container);
  color: var(--nova-color-on-info-container);
  font-size: var(--md-sys-typescale-body-small-size);
}

.update-status .progress {
  width: 56px;
  flex: 0 0 56px;
}

.update-status.failed {
  background: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.update-status small {
  min-width: 0;
  flex-basis: 100%;
  overflow-wrap: anywhere;
}

.update-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nova-space-2);
}

@media (max-width: 860px) {
  .update-actions > .btn {
    min-height: var(--nova-control-height-touch);
  }
}

@media (max-width: 480px) {
  .update-actions > .btn {
    flex: 1 1 100%;
  }
}
</style>
