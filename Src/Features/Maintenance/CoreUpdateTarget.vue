<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import type { Dict } from '../../Composables/types'

const props = defineProps<{ target: Dict; keyName: string }>()
const { t } = useI18n()
const app = useNovaApp()
const state = app.maintenance.maintenancePageState
const actions = app.maintenance.maintenancePageActions
const result = computed(() => state.updateResults[props.keyName] || {})
const progress = computed(() => state.updateProgress[props.keyName] || {})
const key = computed(() => String(props.target.coreType || '').toLowerCase())
const batchBusy = computed(() => state.operations.includes('core-update-batch'))
const busy = computed(() => batchBusy.value || state.operations.includes(`core-update-${key.value}`))
const preRelease = computed(() => (state.updateSettings.checkPreReleaseCoreTypes || []).includes(props.keyName))

function phase(item: Dict) {
  if (item.isComplete) return t(item.success ? 'maintenance.phase.completed' : 'maintenance.phase.failed')
  return t(`maintenance.phase.${item.phase}`)
}
</script>

<template>
  <article class="card update-card">
    <div class="card-head">
      <div>
        <h2>{{ t(target.nameKey) }}</h2>
        <small>{{ t('polish.targetCore') }}<template v-if="result.version"> · {{ t('polish.latestVersion') }}: {{ result.version }}</template></small>
        <small v-if="target.unsupportedReasonKey">{{ t(target.unsupportedReasonKey) }}</small>
        <small v-if="result.detail">{{ result.detail }}</small>
      </div>
      <span v-if="result.updateAvailable" class="badge badge-primary">
        {{ t('maintenance.updateAvailable', { version: result.version }) }}
      </span>
      <span v-else-if="result.isUpToDate" class="badge badge-success">{{ t('maintenance.upToDateGeneric') }}</span>
    </div>

    <div class="update-options">
      <label class="check">
        <UiCheckbox :model-value="Boolean(target.selected)" :disabled="!target.isSupported" @change="target.selected = !target.selected" />
        <span>{{ t('maintenance.includeCoreUpdate') }}</span>
      </label>
      <label v-if="target.supportsPreRelease" class="check">
        <UiCheckbox :model-value="preRelease" @change="actions.setPreReleaseTarget(keyName, !preRelease)" />
        <span>{{ t('maintenance.preRelease') }}</span>
      </label>
    </div>

    <div v-if="progress.phase || progress.isComplete" class="update-status" :class="{ failed: progress.isComplete && !progress.success }" role="status">
      <span v-if="!progress.isComplete" class="progress" aria-hidden="true" />
      <UiIcon v-else :name="progress.success ? 'success' : 'error'" />
      <span>{{ phase(progress) }}</span>
      <small v-if="progress.detail">{{ progress.detail }}</small>
    </div>

    <div class="update-actions">
      <UiButton type="button" class="btn btn-outlined" :disabled="!target.isSupported || !target.selected || busy" @click="actions.checkCoreUpdate(target.coreType)" icon="search">{{ t('maintenance.checkOnly') }}
      </UiButton>
      <UiButton type="button" class="btn btn-filled" :disabled="!target.canInstall || !target.selected || busy" @click="actions.updateCore(target.coreType)" icon="download">{{ t('maintenance.checkAndUpdate') }}
      </UiButton>
    </div>
  </article>
</template>

<style scoped>
.update-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
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
  margin-top: auto;
  padding-top: var(--nova-space-1);
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
