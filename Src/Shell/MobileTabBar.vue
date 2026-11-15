<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../Components/Material/UiIcon.vue'
import { useNovaApp } from '../App/context'
import { isPrimaryPage, type AppPage } from '../Composables/useAppRoute'
import { MOBILE_TABS } from './navigation'

const { t } = useI18n()
const { route, actions } = useNovaApp()
const navigationId = `mobile-navigation-${useId()}`
const activeId = computed<AppPage>(() => isPrimaryPage(route.currentPage.value) ? route.currentPage.value : 'more')
const activeIndex = computed(() => MOBILE_TABS.findIndex(item => item.id === activeId.value))
const tabNavigationKeys = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])

function navigate(page: AppPage): void {
  if (page === activeId.value) return
  void actions.navigate(page)
}

function handleTabKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation()
    return
  }

  if (!tabNavigationKeys.has(event.key)) return
  if (event.ctrlKey || event.altKey || event.metaKey) {
    event.stopPropagation()
    return
  }

  event.preventDefault()
}
</script>

<template>
  <nav class="mobile-tab-bar" :aria-label="t('nav.primary')">
    <md-navigation-bar :active-index.attr="activeIndex">
      <md-navigation-tab
        v-for="item in MOBILE_TABS"
        :id="`${navigationId}-${item.id}`"
        :key="item.id"
        :active.prop="activeId === item.id"
        :label.prop="t(item.labelKey)"
        @navigation-tab-interaction.stop="navigate(item.id)"
        @keydown="handleTabKeydown"
      >
        <span
          :slot="activeId === item.id ? 'active-icon' : 'inactive-icon'"
          class="mobile-tab-icon"
        >
          <md-ripple
            class="mobile-tab-state-layer"
            :for.attr="`${navigationId}-${item.id}`"
          />
          <UiIcon :name="item.icon" :size="24" :filled="activeId === item.id" />
        </span>
      </md-navigation-tab>
    </md-navigation-bar>
  </nav>
</template>
