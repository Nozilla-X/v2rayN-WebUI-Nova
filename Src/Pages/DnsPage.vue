<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageFeedback from '../Components/Material/PageFeedback.vue'
import UiIcon from '../Components/Material/UiIcon.vue'
import SimpleDnsPanel from '../Features/Dns/SimpleDnsPanel.vue'
import CoreDnsProfile from '../Features/Dns/CoreDnsProfile.vue'
import { useNovaApp } from '../App/context'
import { useDraftState } from '../UI/useDraftState'
import type { Dict } from '../Composables/types'

const { t } = useI18n()
const app = useNovaApp()
const state = app.dns.dnsPageState
const actions = app.dns.dnsPageActions
const activeTab = ref('simple')
const coreKey = (value: unknown) => String(value ?? '').toLowerCase().replaceAll('-', '_')

const simpleKey = '__simple__'
const { dirtyKeys, status, allowDiscard } = useDraftState(
  'dns',
  () => ({ [simpleKey]: { form: state.simpleDnsForm, raw: state.simpleDnsAdvancedRaw }, ...Object.fromEntries(state.dnsProfiles.map((profile: Dict) => [coreKey(profile.coreType), profile])) }),
  () => ({ [simpleKey]: state.simpleDnsForm, ...Object.fromEntries(state.dnsProfiles.map((profile: Dict) => [coreKey(profile.coreType), profile])) }),
  path => path.includes('/dns/simple') ? [simpleKey] : [coreKey(decodeURIComponent(path.split('/').at(-1) || '').replaceAll('-', '_'))],
)

const coreProfiles = computed(() => state.dnsProfiles.filter((profile: Dict) => ['xray', 'sing_box'].includes(coreKey(profile.coreType))))
const simpleDisabled = computed(() => coreProfiles.value.length > 0 && coreProfiles.value.every((profile: Dict) => Boolean(profile.enabled)))
const currentProfile = computed(() => state.dnsProfiles.find((profile: Dict) => coreKey(profile.coreType) === activeTab.value) || null)
const simpleDirty = computed(() => dirtyKeys.value.includes(simpleKey))
const profileDirty = computed(() => dirtyKeys.value.includes(activeTab.value))
const simpleSection = computed<'simple' | 'advanced'>(() => activeTab.value === 'simple' ? 'simple' : 'advanced')

const coreTabs = computed(() => state.dnsProfiles.map((profile: Dict) => {
  const key = coreKey(profile.coreType)
  const fallback = key === 'xray' ? t('dns.xrayTab') : key === 'sing_box' ? t('dns.singboxTab') : String(profile.coreType)
  return { id: key, label: String(profile.remarks || fallback), badge: String(profile.coreType), enabled: Boolean(profile.enabled) }
}))
const tabs = computed(() => [
  { id: 'simple', label: t('dns.simple') },
  { id: 'advanced', label: t('dns.profiles') },
  ...coreTabs.value,
])

watch(() => state.dnsProfiles.map((profile: Dict) => coreKey(profile.coreType)), keys => {
  if (!['simple', 'advanced', ...keys].includes(activeTab.value)) activeTab.value = 'simple'
}, { immediate: true })

async function saveSimple() {
  if (status.writes) return
  await actions.saveSimpleDns()
}

async function saveProfile(profile: Dict | null) {
  if (!profile || status.writes) return
  // Saving one profile reloads every DNS profile; protect edits in the other tabs.
  const others = dirtyKeys.value.filter(key => key !== coreKey(profile.coreType))
  if (others.length && !await allowDiscard(t('polish.otherDnsDrafts'))) return
  await actions.saveDnsProfile(profile)
}

async function importDefault(profile: Dict) {
  await actions.importDefaultDns(profile)
}
</script>

<template>
  <section class="page dns-page">
    <PageFeedback scope="dns" />

    <nav class="tabs dns-tabs" :aria-label="t('dns.title')">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="'badge' in tab" class="count-pill" :class="{ 'is-on': tab.enabled }">{{ tab.badge }}</span>
      </button>
    </nav>

    <SimpleDnsPanel
      v-if="activeTab === 'simple' || activeTab === 'advanced'"
      :form="state.simpleDnsForm"
      :options="state.dnsOptions"
      :raw="state.simpleDnsAdvancedRaw"
      :dirty="simpleDirty"
      :busy="Boolean(status.writes)"
      :disabled="simpleDisabled"
      :section="simpleSection"
      @update:raw="value => state.simpleDnsAdvancedRaw = value"
      @save="saveSimple"
    />

    <template v-else-if="currentProfile">
      <CoreDnsProfile
        :profile="currentProfile"
        :options="state.dnsOptions"
        :is-xray="activeTab === 'xray'"
        :dirty="profileDirty"
        :busy="Boolean(status.writes)"
        @import-default="importDefault(currentProfile)"
        @save="saveProfile(currentProfile)"
      />
    </template>

    <div v-else class="card empty-state">
      <span class="empty-icon"><UiIcon name="globe" /></span>
      <strong>{{ t('dns.coreProfileUnavailable') }}</strong>
      <p>{{ t('dns.profiles') }}</p>
    </div>
  </section>
</template>

<style scoped>
.dns-page {
  gap: var(--nova-space-3);
}

.dns-tabs {
  max-width: 100%;
}

@media (max-width: 860px) {
  .dns-tabs {
    scrollbar-width: thin;
    scrollbar-color: var(--md-sys-color-outline-variant) transparent;
    -webkit-mask-image: linear-gradient(to right, transparent 0, var(--md-sys-color-on-surface) 10px, var(--md-sys-color-on-surface) calc(100% - 16px), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0, var(--md-sys-color-on-surface) 10px, var(--md-sys-color-on-surface) calc(100% - 16px), transparent 100%);
  }

  .dns-tabs::-webkit-scrollbar {
    display: block;
    height: 4px;
  }

  .dns-tabs::-webkit-scrollbar-thumb {
    border-radius: var(--md-sys-shape-corner-full);
    background: var(--md-sys-color-outline-variant);
  }
}

.dns-tabs .tab {
  display: inline-flex;
  align-items: center;
  gap: var(--nova-space-2);
}

.count-pill.is-on {
  background: var(--nova-color-success-container);
  color: var(--nova-color-on-success-container);
}
</style>
