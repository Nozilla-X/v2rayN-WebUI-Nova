<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../Components/Material/UiIcon.vue'
import { useNovaApp } from '../App/context'
import { isPrimaryPage, type AppPage } from '../Composables/useAppRoute'
import { MOBILE_TABS } from './navigation'

const { t } = useI18n()
const app = useNovaApp()
const { route, actions } = app

const activeId = computed<AppPage>(() => isPrimaryPage(route.currentPage.value) ? route.currentPage.value : 'more')
const activeIndex = computed(() => Math.max(0, MOBILE_TABS.findIndex((item) => item.id === activeId.value)))

function go(page: AppPage) {
  if (page !== activeId.value) void actions.navigate(page)
}
</script>

<template>
  <nav class="mobile-tab-bar glass-surface" :aria-label="t('nav.primary')">
    <span
      class="mobile-tab-indicator"
      aria-hidden="true"
      :style="{ '--tab-offset': `${activeIndex * 100}%` }"
    />
    <button
      v-for="item in MOBILE_TABS"
      :key="item.id"
      type="button"
      class="mobile-tab"
      :class="{ 'is-active': activeId === item.id }"
      :aria-current="activeId === item.id ? 'page' : undefined"
      @click="go(item.id)"
    >
      <UiIcon :name="item.icon" :filled="activeId === item.id" />
      <span>{{ t(item.labelKey) }}</span>
    </button>
  </nav>
</template>
