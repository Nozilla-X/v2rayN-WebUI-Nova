<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../Components/Material/UiIcon.vue'
import UiIconButton from '../Components/Material/UiIconButton.vue'
import { useNovaApp } from '../App/context'
import { isSecondaryPage } from '../Composables/useAppRoute'
import { navTitleKey } from './navigation'

const { t } = useI18n()
const app = useNovaApp()
const { route, runtime, state, actions } = app

const titleKey = computed(() => navTitleKey(route.currentPage.value))
const secondary = computed(() => isSecondaryPage(route.currentPage.value))
const coreState = computed(() => String(runtime.status.value?.runtimeState || (runtime.status.value?.coreRunning ? 'running' : 'stopped')))
const coreRunning = computed(() => Boolean(runtime.status.value?.coreRunning))
const busyState = computed(() => ['starting', 'stopping', 'restarting'].includes(coreState.value))
const sniffingStatus = computed(() => {
  const status = runtime.status.value
  if (!status?.sniffingEnabled) return ''
  return (status.destOverride || []).join(' / ')
})
</script>

<template>
  <header class="mobile-topbar" :class="{ 'has-back': secondary }">
    <div class="mobile-topbar-copy">
      <h1>{{ t(titleKey) }}</h1>
      <button type="button" class="mobile-status-line" :aria-label="t('header.coreStatus')" @click="state.showCorePanel.value = true">
        <span class="status-dot" :class="{ 'is-on': coreRunning, 'is-warning': busyState, 'is-error': coreState === 'faulted' }" />
        <span>{{ t(`core.runtime.${coreState}`) }}</span>
        <span v-if="sniffingStatus" class="mobile-status-extra"> · {{ t('status.sniffing', { types: sniffingStatus }) }}</span>
      </button>
    </div>
    <div class="mobile-topbar-actions">
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
