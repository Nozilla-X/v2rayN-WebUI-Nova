<script setup lang="ts">
import UiButton from '../Components/Material/UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../Components/Material/AppDialog.vue'
import UiIcon from '../Components/Material/UiIcon.vue'
import UiSelect from '../Components/Material/UiSelect.vue'
import { useNovaApp } from '../App/context'

const { t } = useI18n()
const app = useNovaApp()
const { runtime, routing, state, actions } = app

const status = computed(() => runtime.status.value || {})
const coreState = computed(() => String(status.value.runtimeFailure ? 'faulted' : status.value.runtimeState || (status.value.coreRunning ? 'running' : 'stopped')))
const coreRunning = computed(() => Boolean(status.value.coreRunning))
const busy = computed(() => runtime.busy.value || ['starting', 'stopping', 'restarting'].includes(coreState.value))
const listeners = computed(() => status.value.listeners || [])
const traffic = computed(() => runtime.traffic.value || {})

function close() { state.showCorePanel.value = false }

function changeRoute(value: string | number | null) {
  void routing.activateRoute(String(value ?? ''))
}
</script>

<template>
  <AppDialog
    :open="state.showCorePanel.value"
    :title="t('header.coreStatus')"
    :subtitle="status.coreType ? `${status.coreType} · ${runtime.runtimeVersion.value || ''}` : runtime.runtimeVersion.value"
    @close="close"
  >
    <div class="core-panel-body">
      <section class="core-hero">
        <div class="core-hero-main">
          <span class="status-dot" :class="{ 'is-on': coreRunning, 'is-warning': ['starting', 'restarting'].includes(coreState), 'is-error': coreState === 'faulted' }" />
          <div>
            <strong>{{ t(`core.runtime.${coreState}`) }}</strong>
            <small>{{ state.currentProfile.value?.remarks || status.currentProfileName || t('nodes.noneCurrent') }}</small>
          </div>
        </div>
        <div class="core-actions">
          <UiButton
            type="button"
            class="btn btn-filled btn-small"
            :disabled="busy || coreRunning"
            @click="runtime.coreAction('start')"
           icon="play">{{ t('nodes.start') }}
          </UiButton>
          <UiButton
            type="button"
            class="btn btn-tonal btn-small"
            :disabled="busy || !coreRunning"
            @click="runtime.coreAction('restart')"
           icon="refresh">{{ t('nodes.restart') }}
          </UiButton>
          <UiButton
            type="button"
            class="btn btn-danger-tonal btn-small"
            :disabled="busy || (!coreRunning && !status.coreProcessIds?.length)"
            @click="runtime.coreAction('stop')"
           icon="stop">{{ t('nodes.stop') }}
          </UiButton>
        </div>
      </section>

      <div v-if="status.runtimeFailure" class="banner banner-error" role="alert">
        <UiIcon name="warning" />
        <span>{{ t('status.runtimeFault') }}: {{ status.runtimeFailure }}</span>
      </div>
      <div v-if="status.configuredProxyPort && status.runningProxyPort && status.configuredProxyPort !== status.runningProxyPort" class="banner banner-warning">
        <UiIcon name="warning" />
        <span>{{ t('status.portMismatch', { configured: status.configuredProxyPort, running: status.runningProxyPort }) }}</span>
      </div>

      <section class="core-section">
        <div class="section-title">
          <h3>{{ t('coreToolbar.route') }}</h3>
        </div>
        <UiSelect :label="t('coreToolbar.route')" :model-value="routing.activeRoutingId.value" @update:model-value="changeRoute">
            <option value="">{{ t('common.none') }}</option>
            <option v-for="route in routing.routes.value" :key="route.id" :value="route.id">{{ route.remarks }}</option>
          </UiSelect>
      </section>

      <section class="core-section">
        <div class="section-title">
          <h3>{{ t('nodes.listener') }}</h3>
        </div>
        <ul class="core-listeners">
          <li v-for="listener in listeners" :key="listener.name">
            <span class="status-dot" :class="{ 'is-on': listener.listening }" />
            <span>{{ listener.name === 'lan' ? t('nodes.lan') : t('nodes.local') }}</span>
            <code>{{ runtime.listenerDescription(listener) }}</code>
          </li>
          <li v-if="!listeners.length" class="muted">{{ t('coreToolbar.noListener') }}</li>
        </ul>
      </section>

      <section class="core-section">
        <div class="section-title">
          <h3>{{ t('nodes.traffic') }}</h3>
          <span v-if="status.statisticsEnabled === false" class="muted">{{ t('coreToolbar.statsDisabled') }}</span>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><small>{{ t('nodes.proxyUp') }}</small><strong>{{ actions.formatBytes(traffic.proxyUp) }}/s</strong></div>
          <div class="meta-item"><small>{{ t('nodes.proxyDown') }}</small><strong>{{ actions.formatBytes(traffic.proxyDown) }}/s</strong></div>
          <div class="meta-item"><small>{{ t('nodes.directUp') }}</small><strong>{{ actions.formatBytes(traffic.directUp) }}/s</strong></div>
          <div class="meta-item"><small>{{ t('nodes.directDown') }}</small><strong>{{ actions.formatBytes(traffic.directDown) }}/s</strong></div>
        </div>
      </section>
    </div>
  </AppDialog>
</template>

<style scoped>
.core-panel-body {
  display: grid;
  gap: var(--nova-space-4);
}

.core-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--nova-space-3);
  padding: var(--nova-space-4);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
}

.core-hero-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--nova-space-3);
}

.core-hero-main > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.core-hero-main small {
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.core-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nova-space-2);
}

.core-section {
  padding-top: var(--nova-space-2);
  border-top: 1px solid var(--nova-color-divider);
}

.core-listeners {
  display: grid;
  gap: var(--nova-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.core-listeners li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-2);
  font-size: var(--md-sys-typescale-body-medium-size);
}

.core-listeners code {
  padding: 2px 8px;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container);
  font-family: var(--md-sys-typescale-font-mono);
  font-size: var(--md-sys-typescale-body-small-size);
}
</style>
