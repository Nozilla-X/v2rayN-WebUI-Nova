<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../Components/Material/UiIcon.vue'
import UiIconButton from '../Components/Material/UiIconButton.vue'
import { useNovaApp } from '../App/context'
import { navSubtitleKey, navTitleKey } from './navigation'

const { t } = useI18n()
const app = useNovaApp()
const { route, runtime, state, actions } = app

const titleKey = computed(() => navTitleKey(route.currentPage.value))
const subtitleKey = computed(() => navSubtitleKey(route.currentPage.value))
const coreState = computed(() => String(runtime.status.value?.runtimeState || (runtime.status.value?.coreRunning ? 'running' : 'stopped')))
const coreRunning = computed(() => Boolean(runtime.status.value?.coreRunning))
const busyState = computed(() => ['starting', 'stopping', 'restarting'].includes(coreState.value))
const traffic = computed(() => runtime.traffic.value || {})
const nodeName = computed(() => state.currentProfile.value?.remarks || runtime.status.value?.currentProfileName || t('nodes.noneCurrent'))
const sniffingStatus = computed(() => {
  const status = runtime.status.value
  if (!status?.sniffingEnabled) return ''
  return (status.destOverride || []).join(' / ')
})
</script>

<template>
  <header class="app-topbar">
    <div class="topbar-heading">
      <h1>{{ t(titleKey) }}</h1>
      <small>{{ t(subtitleKey) }}</small>
    </div>

    <div class="topbar-signals">
      <button
        type="button"
        class="status-chip"
        :class="{ 'is-live': coreRunning, 'is-busy': busyState }"
        :aria-label="`${t(`core.runtime.${coreState}`)} · ${nodeName}`"
        aria-haspopup="dialog"
        @click="state.showCorePanel.value = true"
      >
        <span class="status-dot" :class="{ 'is-on': coreRunning, 'is-warning': busyState, 'is-error': coreState === 'faulted' }" />
        <span class="status-chip-text">
          <strong>{{ t(`core.runtime.${coreState}`) }}</strong>
          <span class="status-chip-node">{{ nodeName }}</span>
        </span>
        <UiIcon name="chevron-down" :size="16" class="status-chip-arrow" />
      </button>

      <span v-if="sniffingStatus" class="meta-chip topbar-sniffing">
        <UiIcon name="search" :size="16" />
        <span class="truncate">{{ sniffingStatus }}</span>
      </span>

      <span class="traffic-chip topbar-traffic">
        <span class="traffic-pair">
          <span><UiIcon name="arrow-up" :size="14" /> {{ actions.formatBytes(traffic.proxyUp) }}/s</span>
          <span><UiIcon name="arrow-down" :size="14" /> {{ actions.formatBytes(traffic.proxyDown) }}/s</span>
        </span>
      </span>
    </div>

    <div class="topbar-actions">
      <UiIconButton :label="t('more.connection')" @click="state.showBackendPanel.value = true">
        <UiIcon name="link" />
      </UiIconButton>
      <UiIconButton :label="t('more.appearance')" @click="state.showAppearancePanel.value = true">
        <UiIcon name="palette" />
      </UiIconButton>
      <UiIconButton :label="t('common.refresh')" @click="actions.reloadPage">
        <UiIcon name="refresh" />
      </UiIconButton>
    </div>
  </header>
</template>
