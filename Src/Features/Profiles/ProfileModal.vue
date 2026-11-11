<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../../Components/Material/AppDialog.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import { useNovaApp } from '../../App/context'
import { optionValues } from './editorOptionValues'
import { canonicalizeProtocolChange, realityConfigTypes, groupConfigTypes } from './profileFormCanonical'
import { shadowsocksSecurityOptions } from '../../profileEditorOptions'
import ProfileBaseSection from './ProfileBaseSection.vue'
import ProfileGroupSection from './ProfileGroupSection.vue'
import ProfileAuthSection from './ProfileAuthSection.vue'
import ProfileTransportSection from './ProfileTransportSection.vue'
import ProfileSecuritySection from './ProfileSecuritySection.vue'

const { t } = useI18n()
const app = useNovaApp()
const state = app.profiles.profileModalState
const actions = app.profiles.profileModalActions

const form = computed(() => state.profileForm)
const protocol = computed(() => String(form.value.configType || ''))
const isGroup = computed(() => groupConfigTypes.includes(protocol.value))
const isCustomConfig = computed(() => ['Custom', 'Outbound'].includes(protocol.value))
const singboxOnly = computed<string[]>(() => state.editorOptions.singboxOnlyConfigTypes || [])
const supportsTransport = computed(() => !isCustomConfig.value
  && !['Hysteria2', 'TUIC', 'WireGuard', 'Anytls', 'Naive'].includes(protocol.value))

const streamSecurityOptions = computed(() => optionValues(
  (state.editorOptions.streamSecurityTypes || []).filter((security: string) =>
    security !== 'reality' || realityConfigTypes.includes(protocol.value)),
  form.value.streamSecurity,
))
const shadowsocksMappedCore = computed(() => app.state.profileCoreTypeMappings.value
  .find((mapping: Record<string, any>) => String(mapping.configType).toLowerCase() === 'shadowsocks')?.coreType
  || state.editorOptions.coreTypes?.[0]
  || '')
const shadowsocksMethods = computed(() => shadowsocksSecurityOptions(
  form.value.coreType,
  shadowsocksMappedCore.value,
  state.editorOptions.shadowsocksSecurities || {},
))
const title = computed(() => t(state.editingProfileId ? 'nodes.editNode' : 'nodes.addNode'))

watch(
  () => [state.showProfileForm, protocol.value] as const,
  ([isOpen, configType], previous) => {
    if (!isOpen) return
    if (singboxOnly.value.includes(configType)) form.value.coreType = 'sing_box'
    if (['Custom', 'Outbound'].includes(configType) && !form.value.coreType) {
      form.value.coreType = state.editorOptions.coreTypes?.[0] || ''
    }
    if (previous?.[0] && configType !== previous[1]) {
      state.profileAdvancedJson = canonicalizeProtocolChange(form.value, state.profileAdvancedJson, state.editorOptions)
    }
  },
  { immediate: true },
)

function close() {
  actions.closeProfileEditor()
}
</script>

<template>
  <AppDialog :open="state.showProfileForm" :title="title" :subtitle="t('nodes.protocolEditorHint')" wide @close="close">
    <form id="profile-form" class="profile-form" @submit.prevent="actions.saveProfile">
      <ProfileBaseSection
        :form="form"
        :editor-options="state.editorOptions"
        :protocol-types="state.protocolTypes"
        :core-types="state.coreTypes"
        :editing-profile-id="state.editingProfileId"
        :singbox-only="singboxOnly"
        :supports-transport="supportsTransport"
        :is-group="isGroup"
        :is-custom="isCustomConfig"
      />

      <ProfileGroupSection v-if="isGroup" />

      <template v-else>
        <fieldset v-if="isCustomConfig" class="form-section">
          <legend class="section-title"><h3>{{ t('nodes.customConfiguration') }}</h3></legend>
          <div class="field-row">
            <label v-if="protocol === 'Custom'" class="check">
              <UiCheckbox v-model="form.displayLog" />
              <span>{{ t('nodes.displayLog') }}</span>
            </label>
            <label v-if="protocol === 'Custom'" class="field">
              <span class="field-label">{{ t('nodes.preSocksPort') }}</span>
              <input v-model.number="form.preSocksPort" type="number" min="0" max="65535" />
            </label>
            <label v-if="protocol === 'Outbound'" class="check">
              <UiCheckbox v-model="form.protoExtra.isSingboxEndpoint" />
              <span>{{ t('nodes.singboxEndpoint') }}</span>
            </label>
          </div>
        </fieldset>

        <template v-if="!isCustomConfig">
          <ProfileAuthSection :form="form" :options="state.editorOptions" :shadowsocks-methods="shadowsocksMethods" />
          <ProfileTransportSection v-if="supportsTransport" :form="form" :editor-options="state.editorOptions" />
          <ProfileSecuritySection
            v-if="protocol !== 'WireGuard'"
            :form="form"
            :editor-options="state.editorOptions"
            :stream-security-options="streamSecurityOptions"
          />
        </template>
      </template>

      <details class="advanced-editor">
        <summary>{{ t('nodes.advancedProfileFields') }}</summary>
        <p class="field-hint">{{ t('nodes.advancedProfileHint') }}</p>
        <textarea v-model="state.profileAdvancedJson" class="code-area advanced-profile-json" spellcheck="false" />
      </details>

      <p v-if="state.profileModalError" class="inline-error" role="alert">{{ state.profileModalError }}</p>
    </form>

    <template #actions>
      <UiButton type="button" class="btn btn-text" @click="close">{{ t('common.cancel') }}</UiButton>
      <UiButton type="submit" form="profile-form" class="btn btn-filled">{{ t('common.save') }}</UiButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.profile-form {
  display: grid;
  gap: var(--nova-space-4);
  min-width: 0;
}

.form-section {
  display: grid;
  gap: var(--nova-space-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.advanced-editor {
  min-width: 0;
  padding: var(--nova-space-3) var(--nova-space-4);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-low);
}

.advanced-editor summary {
  cursor: pointer;
  color: var(--md-sys-color-on-surface);
  font-size: var(--md-sys-typescale-title-small-size);
  font-weight: var(--md-sys-typescale-weight-medium);
}

.advanced-editor .field-hint {
  margin-block: var(--nova-space-2);
}

.advanced-profile-json {
  width: 100%;
  min-height: 220px;
  resize: vertical;
}

.inline-error {
  margin: 0;
  color: var(--md-sys-color-error);
  font-size: var(--md-sys-typescale-body-medium-size);
}
</style>
