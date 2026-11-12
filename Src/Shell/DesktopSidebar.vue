<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../Components/Material/UiIcon.vue'
import UiIconButton from '../Components/Material/UiIconButton.vue'
import { useNovaApp } from '../App/context'
import { DESKTOP_ADVANCED_NAV, DESKTOP_MAIN_NAV } from './navigation'

defineProps<{ railed: boolean }>()
const emit = defineEmits<{ toggleRail: [] }>()

const { t } = useI18n()
const app = useNovaApp()
const { route, runtime, state, actions } = app

const coreRunning = computed(() => Boolean(runtime.status.value?.coreRunning))
const coreState = computed(() => String(runtime.status.value?.runtimeState || ''))
const statusLabel = computed(() => `${coreRunning.value ? t('status.coreRunning') : t('status.coreStopped')} · ${runtime.runtimeVersion.value || t('brand')}`)

function go(page: Parameters<typeof route.navigate>[0]) {
  void actions.navigate(page)
}
</script>

<template>
  <aside class="desktop-sidebar" aria-label="Nova">
    <a href="#/nodes" class="sidebar-brand" :title="t('brand')" @click.prevent="go('nodes')">
      <span class="sidebar-logo">
        <img :src="state.brandIconSrc.value" :alt="t('brand')" />
      </span>
      <span class="sidebar-brand-copy">
        <strong>v2rayN Nova</strong>
        <small>{{ t('brand') }} · Material 3</small>
      </span>
    </a>

    <nav class="sidebar-nav" :aria-label="t('nav.primary')">
      <div class="sidebar-label">{{ t('more.workspace') }}</div>
      <a
        v-for="item in DESKTOP_MAIN_NAV"
        :key="item.id"
        href="#/${item.id}"
        class="nav-item"
        :data-tooltip="t(item.labelKey)"
        :aria-current="route.currentPage.value === item.id ? 'page' : undefined"
        @click.prevent="go(item.id)"
      >
        <UiIcon :name="item.icon" :filled="route.currentPage.value === item.id" />
        <span class="nav-item-text">{{ t(item.labelKey) }}</span>
      </a>

      <div class="sidebar-label">{{ t('more.system') }}</div>
      <a
        v-for="item in DESKTOP_ADVANCED_NAV"
        :key="item.id"
        href="#/${item.id}"
        class="nav-item"
        :data-tooltip="t(item.labelKey)"
        :aria-current="route.currentPage.value === item.id ? 'page' : undefined"
        @click.prevent="go(item.id)"
      >
        <UiIcon :name="item.icon" :filled="route.currentPage.value === item.id" />
        <span class="nav-item-text">{{ t(item.labelKey) }}</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-status" role="status" :aria-label="statusLabel">
        <span class="status-dot" :class="{ 'is-on': coreRunning, 'is-warning': coreState === 'starting' || coreState === 'restarting', 'is-error': coreState === 'faulted' }" />
        <span class="sidebar-status-copy">
          <small>{{ runtime.runtimeVersion.value || t('brand') }}</small>
        </span>
      </div>

      <UiIconButton
        class="sidebar-rail-toggle"
        :label="railed ? t('more.expandNav') : t('more.collapseNav')"
        size="small"
        @click="emit('toggleRail')"
      >
        <UiIcon :name="railed ? 'sidebar-expand' : 'sidebar-collapse'" />
      </UiIconButton>
    </div>
  </aside>
</template>
