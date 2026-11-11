<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import UiDisclosure from '../../Components/Material/UiDisclosure.vue'
import { useI18n } from 'vue-i18n'
import FormField from '../Dns/FormField.vue'

const props = defineProps<{
  form: Record<string, any>
  options: Record<string, any>
  dirty: boolean
  busy: boolean
}>()
const emit = defineEmits<{ save: [] }>()
const { t } = useI18n()
const values = (key: string): (string | number | null)[] => Array.isArray(props.options[key]) ? props.options[key] : []
</script>

<template>
  <article class="card settings-card">
    <div class="section-title">
      <div>
        <h2>{{ t('settings.core') }}</h2>
        <small>{{ t('settings.loglevel') }} · {{ t('settings.fragment') }}</small>
      </div>
    </div>

    <UiDisclosure :summary="t('settings.groupBasic')" open>
      <div class="field-row">
        <FormField v-model="form.logEnabled" kind="check" :label="t('settings.logEnabled')" />
        <FormField v-model="form.loglevel" kind="select" :label="t('settings.loglevel')" :options="values('logLevels')" />
        <FormField v-model="form.defFingerprint" kind="select" :allow-none="true" :label="t('settings.fingerprint')" :options="values('fingerprints')" />
        <FormField v-model="form.defUserAgent" kind="select" :allow-none="true" :label="t('settings.userAgent')" :options="values('userAgents')" />
        <FormField v-model="form.sendThrough" :label="t('settings.sendThrough')" />
        <FormField v-model="form.bindInterface" :label="t('settings.bindInterface')" />
      </div>
    </UiDisclosure>

    <UiDisclosure :summary="t('settings.groupMux')">
      <div class="field-row">
        <FormField v-model="form.mux4RayConcurrency" kind="number" :min="0" :label="t('settings.muxRay')" />
        <FormField v-model="form.mux4RayXudpConcurrency" kind="number" :min="0" :label="t('settings.muxXudp')" />
        <FormField v-model="form.mux4RayXudpProxyUDP443" kind="select" :allow-none="true" :label="t('settings.muxXudp443')" :options="values('mux4RayXudpProxyUDP443Options')" />
        <FormField v-model="form.mux4SboxProtocol" kind="select" :allow-none="true" :label="t('settings.muxSboxProtocol')" :options="values('mux4SboxProtocols')" />
        <FormField v-model="form.mux4SboxPadding" kind="check" :label="t('settings.muxSboxPadding')" />
        <FormField v-model="form.enableCacheFile4Sbox" kind="check" :label="t('settings.cacheSbox')" />
        <FormField v-model="form.hy2UpMbps" kind="number" :min="0" :label="t('settings.hy2Up')" />
        <FormField v-model="form.hy2DownMbps" kind="number" :min="0" :label="t('settings.hy2Down')" />
      </div>
    </UiDisclosure>

    <UiDisclosure :summary="t('settings.groupFragment')">
      <div class="field-row">
        <FormField v-model="form.enableFragment" kind="check" :label="t('settings.fragment')" />
        <FormField v-model="form.enableFinalFragment" kind="check" :label="t('settings.finalFragment')" />
        <FormField v-model="form.fragmentPackets" kind="select" :allow-none="true" :label="t('settings.fragmentPackets')" :options="values('fragmentPacketsOptions')" />
        <FormField v-model="form.fragmentMaxSplit" :label="t('settings.fragmentMaxSplit')" />
        <FormField v-model="form.fragmentLengthsText" kind="textarea" :label="t('settings.fragmentLengths')" />
        <FormField v-model="form.fragmentDelaysText" kind="textarea" :label="t('settings.fragmentDelays')" />
      </div>
    </UiDisclosure>

    <div class="save-bar">
      <span class="draft-status" :class="{ 'is-dirty': dirty }" role="status">
        {{ t(busy ? 'polish.saving' : dirty ? 'polish.unsaved' : 'polish.saved') }}
      </span>
      <UiButton type="button" class="btn btn-filled" :disabled="busy" :aria-busy="busy" @click="emit('save')">
        {{ t('settings.saveCore') }}
      </UiButton>
    </div>
  </article>
</template>

<style scoped>
.settings-card {
  display: grid;
  gap: var(--nova-space-4);
}

.section-title {
  margin: 0;
}

.field-row {
  gap: var(--nova-space-3) var(--nova-space-4);
}

@media (max-width: 600px) {
  .field-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .save-bar .btn {
    flex: 1 1 auto;
  }
}
</style>
