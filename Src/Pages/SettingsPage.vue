<script setup lang="ts">
import UiButton from '../Components/Material/UiButton.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageFeedback from '../Components/Material/PageFeedback.vue'
import UiIcon from '../Components/Material/UiIcon.vue'
import InboundSettings from '../Features/Settings/InboundSettings.vue'
import CoreSettings from '../Features/Settings/CoreSettings.vue'
import ApplicationSettings from '../Features/Settings/ApplicationSettings.vue'
import SpeedSettings from '../Features/Settings/SpeedSettings.vue'
import CoreTypeMappings from '../Features/Settings/CoreTypeMappings.vue'
import { useNovaApp } from '../App/context'
import { useDraftState } from '../UI/useDraftState'

const { t } = useI18n()
const app = useNovaApp()
const state = app.settings.settingsPageState
const actions = app.settings.settingsPageActions
const activeTab = ref('inbound')
const { dirty, dirtyKeys, status, allowDiscard, run } = useDraftState(
  'settings',
  () => ({ inbound: state.inboundForm, core: state.coreForm, application: state.appForm, speedtest: state.speedForm, coreTypes: state.settings.coreTypes }),
  () => ({ inbound: state.inboundForm, core: state.coreForm, application: state.appForm, speedtest: state.speedForm, coreTypes: state.settings.coreTypes }),
  path => {
    if (path.endsWith('/inbound')) return ['inbound']
    if (path.endsWith('/core')) return ['core']
    if (path.endsWith('/application')) return ['application']
    if (path.endsWith('/speedtest')) return ['speedtest']
    if (path.endsWith('/core-types')) return ['coreTypes']
    if (path.endsWith('/apply')) return ['inbound', 'core', 'application', 'speedtest', 'coreTypes']
    return []
  },
)

const busy = computed(() => Boolean(state.saving || status.writes))
const dirtyCount = computed(() => dirtyKeys.value.length)
const tabItems = computed(() => [
  { id: 'inbound', key: 'settings.inbound' },
  { id: 'core', key: 'settings.core' },
  { id: 'application', key: 'settings.application' },
  { id: 'speedtest', key: 'settings.speedtest' },
  { id: 'coreTypes', key: 'settings.coreTypes' },
])

async function save(section: string, action: () => Promise<unknown>) {
  if (busy.value) return
  if (dirtyKeys.value.some(key => key !== section) && !await allowDiscard(t('polish.discardChanges'))) return
  await run(action)
}

async function saveAll() {
  if (busy.value) return
  await run(() => actions.saveAllSettings())
}
</script>

<template>
  <section class="page settings-page">
    <PageFeedback scope="settings" />

    <nav class="tabs settings-tabs" :aria-label="t('settings.title')">
      <button
        v-for="tab in tabItems"
        :key="tab.id"
        type="button"
        class="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ t(tab.key) }}
        <span v-if="dirtyKeys.includes(tab.id)" class="unsaved-dot" :aria-label="t('polish.unsaved')"></span>
      </button>
    </nav>

    <InboundSettings
      v-if="activeTab === 'inbound'"
      :inbound="state.inboundForm"
      :options="state.settings.options || {}"
      :dirty="dirtyKeys.includes('inbound')"
      :busy="busy"
      @toggle-dest-override="(protocol, checked) => actions.toggleDestOverride(protocol, checked)"
      @save="save('inbound', () => actions.saveInbound())"
    />
    <CoreSettings
      v-else-if="activeTab === 'core'"
      :form="state.coreForm"
      :options="state.settings.options || {}"
      :dirty="dirtyKeys.includes('core')"
      :busy="busy"
      @save="save('core', () => actions.saveCoreSettings())"
    />
    <ApplicationSettings
      v-else-if="activeTab === 'application'"
      :form="state.appForm"
      :options="state.settings.options || {}"
      :dirty="dirtyKeys.includes('application')"
      :busy="busy"
      @save="save('application', () => actions.saveAppSettings())"
    />
    <SpeedSettings
      v-else-if="activeTab === 'speedtest'"
      :form="state.speedForm"
      :options="state.settings.options || {}"
      :dirty="dirtyKeys.includes('speedtest')"
      :busy="busy"
      @save="save('speedtest', () => actions.saveSpeedSettings())"
    />
    <CoreTypeMappings
      v-else
      :mappings="state.settings.coreTypes || []"
      :core-types="state.coreTypes || []"
      :dirty="dirtyKeys.includes('coreTypes')"
      :busy="busy"
      @save="save('coreTypes', () => actions.saveCoreTypes())"
    />

    <footer v-if="dirtyCount > 1" class="save-bar all-save-bar">
      <span class="draft-status" :class="{ 'is-dirty': dirty }" role="status">
        {{ t(busy ? 'polish.saving' : 'polish.unsaved') }}
      </span>
      <UiButton type="button" class="btn btn-filled" :disabled="busy" :aria-busy="busy" @click="saveAll" icon="save">{{ t('settings.saveAll') }}
      </UiButton>
    </footer>
  </section>
</template>

<style scoped>
.settings-page {
  gap: var(--nova-space-3);
}

/* Four auto-fit tracks squeeze long field labels into an ellipsis on a 1440px
   window. Wider tracks keep every setting name readable; between 861 and
   1280px three tracks would still truncate, so step down to two. */
.settings-page :deep(.field-row) {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
}

@media (min-width: 861px) and (max-width: 1280px) {
  .settings-page :deep(.field-row) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.settings-tabs {
  max-width: 100%;
}

.settings-tabs .tab {
  display: inline-flex;
  align-items: center;
  gap: var(--nova-space-2);
}

.unsaved-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--nova-color-warning);
}

.all-save-bar {
  width: 100%;
}

.all-save-bar .btn {
  min-width: 160px;
}

@media (max-width: 600px) {
  .all-save-bar .btn {
    width: 100%;
  }
}
</style>
