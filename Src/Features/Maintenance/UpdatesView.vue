<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import ActionMenu, { type ActionMenuItem } from '../../Components/Material/ActionMenu.vue'
import { useNovaApp } from '../../App/context'
import CoreUpdateTarget from './CoreUpdateTarget.vue'
import WebUpdateTarget from './WebUpdateTarget.vue'
import type { Dict } from '../../Composables/types'

const { t } = useI18n()
const app = useNovaApp()
const state = app.maintenance.maintenancePageState
const actions = app.maintenance.maintenancePageActions
const batchBusy = computed(() => state.operations.includes('core-update-batch'))
const geoProgress = computed<Dict>(() => state.updateProgress.GeoFiles || {})
const geoBusy = computed(() => state.geoUpdateSubmitting || state.operations.includes('geo-update') || batchBusy.value)
const statisticsEnabled = computed(() => Boolean(state.status?.statisticsEnabled))

const updateMenu = computed<ActionMenuItem[]>(() => [
  { id: 'save', label: t('maintenance.saveUpdateSettings'), icon: 'save' },
  { id: 'check', label: t('maintenance.batchCheck'), icon: 'search', disabled: batchBusy.value },
  { id: 'update', label: t('maintenance.batchUpdate'), icon: 'download', disabled: batchBusy.value },
])

function updateAction(id: string) {
  if (id === 'save') void actions.saveUpdateSettings()
  else if (id === 'check') void actions.runSelectedUpdateBatch(false)
  else if (id === 'update') void actions.runSelectedUpdateBatch(true)
}

function phase(item: Dict) {
  if (item.isComplete) return t(item.success ? 'maintenance.phase.completed' : 'maintenance.phase.failed')
  return t(`maintenance.phase.${item.phase}`)
}
</script>

<template>
  <div class="updates-view">
    <section class="card preference-card">
      <div class="section-title">
        <h2>{{ t('maintenance.updateSettings') }}</h2>
      </div>
      <div class="preference-row">
        <label class="check">
          <UiCheckbox :model-value="Boolean(state.updateSettings.useProxy)" @change="state.updateSettings.useProxy = !state.updateSettings.useProxy" />
          <span>{{ t('maintenance.useProxy') }}</span>
        </label>
        <div class="preference-actions">
          <UiButton type="button" class="btn btn-outlined desktop-only" @click="actions.saveUpdateSettings" icon="save">{{ t('maintenance.saveUpdateSettings') }}
          </UiButton>
          <UiButton type="button" class="btn btn-tonal desktop-only" :disabled="batchBusy" @click="actions.runSelectedUpdateBatch(false)" icon="search">{{ t('maintenance.batchCheck') }}
          </UiButton>
          <UiButton type="button" class="btn btn-filled desktop-only" :disabled="batchBusy" @click="actions.runSelectedUpdateBatch(true)" icon="download">{{ t('maintenance.batchUpdate') }}
          </UiButton>
          <ActionMenu :items="updateMenu" :label="t('common.more')" :button-text="t('common.more')" button-icon="dots-vertical" button-class="btn btn-tonal btn-small mobile-only" @select="updateAction" />
        </div>
      </div>
      <p v-if="batchBusy" class="field-hint">{{ t('polish.progressHint') }}</p>
    </section>

    <WebUpdateTarget />

    <div class="target-list">
      <CoreUpdateTarget
        v-for="target in state.updateSettings.targets || []"
        :key="target.coreType"
        :target="target"
        :key-name="target.coreType"
      />
    </div>

    <section class="card utility-card">
      <div class="section-title">
        <h2>{{ t('maintenance.geoDataFiles') }}</h2>
        <small>{{ t('polish.targetGeo') }} · {{ t('maintenance.geoUpdateHint') }}</small>
      </div>
      <label class="check">
        <UiCheckbox :model-value="Boolean(state.updateSettings.geoFilesSelected)" @change="state.updateSettings.geoFilesSelected = !state.updateSettings.geoFilesSelected" />
        <span>{{ t('maintenance.includeGeoFiles') }}</span>
      </label>
      <div v-if="geoProgress.phase || geoProgress.isComplete" class="geo-status" :class="{ failed: geoProgress.isComplete && !geoProgress.success }" role="status">
        <span v-if="!geoProgress.isComplete" class="progress" aria-hidden="true" />
        <span>{{ phase(geoProgress) }}</span>
        <small v-if="geoProgress.detail">{{ geoProgress.detail }}</small>
      </div>
      <UiButton type="button" class="btn btn-tonal" :disabled="geoBusy || !state.updateSettings.geoFilesSelected" :aria-busy="geoBusy" @click="actions.updateGeo" icon="refresh">{{ t('maintenance.updateGeo') }}
      </UiButton>
    </section>

    <section class="card utility-card">
      <div class="section-title">
        <h2>{{ t('maintenance.statistics') }}</h2>
        <small>{{ statisticsEnabled ? t('common.enabled') : t('status.statisticsOff') }}</small>
      </div>
      <UiButton type="button" class="btn btn-danger-tonal" @click="actions.clearStatistics" icon="delete">{{ t('maintenance.clearStatistics') }}
      </UiButton>
    </section>

    <section class="card operations-card">
      <div class="section-title">
        <h2>{{ t('maintenance.operationList') }}</h2>
      </div>
      <div v-if="state.operations.length" class="operation-list" role="status">
        <span v-for="operation in state.operations" :key="operation" class="badge badge-primary operation-pill">
          <span class="status-dot is-on" />{{ operation }}
        </span>
      </div>
      <p v-else class="field-hint">{{ t('maintenance.noOperations') }}</p>
    </section>
  </div>
</template>

<style scoped>
.updates-view {
  display: grid;
  min-width: 0;
  gap: var(--nova-space-3);
}

.preference-row {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--nova-space-2);
}

.preference-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--nova-space-2);
}

.target-list {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: var(--nova-space-3);
}

.utility-card,
.operations-card {
  display: grid;
  gap: var(--nova-space-3);
  justify-items: start;
}

.geo-status,
.operation-status {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-2);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
}

.geo-status .progress {
  width: 72px;
  flex: 0 0 72px;
}

.geo-status.failed {
  color: var(--md-sys-color-error);
}

.geo-status small {
  min-width: 0;
  flex-basis: 100%;
  overflow-wrap: anywhere;
}

.operation-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nova-space-2);
}

.operation-pill {
  gap: var(--nova-space-2);
}

.operation-pill .status-dot {
  width: 6px;
  height: 6px;
  flex-basis: 6px;
}

@media (max-width: 860px) {
  .preference-actions > :last-child,
  .utility-card > .btn {
    min-height: var(--nova-control-height-touch);
  }
}

@media (max-width: 480px) {
  .preference-row {
    justify-items: stretch;
  }

  .utility-card,
  .operations-card {
    justify-items: stretch;
  }

  .utility-card > .btn,
  .operations-card .icon-btn {
    min-height: var(--nova-control-height-touch);
  }

  .preference-actions {
    width: auto;
    flex: 0 1 auto;
    justify-content: flex-end;
  }

  .preference-actions > :last-child {
    width: auto;
  }

  .utility-card > .btn {
    width: 100%;
  }

  .operations-card .icon-btn {
    width: var(--nova-touch-target);
    min-width: var(--nova-touch-target);
    flex: 0 0 var(--nova-touch-target);
    margin-left: auto;
    padding-inline: 0;
  }
}
</style>
