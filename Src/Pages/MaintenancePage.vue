<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageFeedback from '../Components/Material/PageFeedback.vue'
import UiIcon from '../Components/Material/UiIcon.vue'
import UpdatesView from '../Features/Maintenance/UpdatesView.vue'
import BackupView from '../Features/Maintenance/BackupView.vue'
import { useNovaApp } from '../App/context'

const { t } = useI18n()
const app = useNovaApp()
const activeTab = ref<'updates' | 'backup'>('updates')
</script>

<template>
  <section class="page maintenance-page">
    <PageFeedback scope="maintenance" />

    <nav class="tabs maintenance-tabs" :aria-label="t('maintenance.title')">
      <button type="button" class="tab" :aria-selected="activeTab === 'updates'" @click="activeTab = 'updates'">
        {{ t('maintenance.updates') }}
      </button>
      <button type="button" class="tab" :aria-selected="activeTab === 'backup'" @click="activeTab = 'backup'">
        {{ t('maintenance.backupRestore') }}
      </button>
    </nav>

    <UpdatesView v-if="activeTab === 'updates'" />
    <BackupView v-else />
  </section>
</template>

<style scoped>
.maintenance-page {
  gap: var(--nova-space-3);
}

.maintenance-tabs {
  max-width: 100%;
}
</style>
