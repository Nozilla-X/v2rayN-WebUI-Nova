<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../Components/Material/UiIcon.vue'
import { useNovaApp } from '../App/context'
import { isSecondaryPage } from '../Composables/useAppRoute'

const { t } = useI18n()
const app = useNovaApp()
const visible = computed(() => isSecondaryPage(app.route.currentPage.value))

function back() {
  void app.actions.goBack('more')
}
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="mobile-back-button glass-surface"
    :aria-label="t('common.back')"
    :title="t('common.back')"
    @click="back"
  >
    <UiIcon name="back" />
  </button>
</template>
