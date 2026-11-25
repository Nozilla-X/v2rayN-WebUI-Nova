<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiSelect from '../../Components/Material/UiSelect.vue'
import { optionValues } from './editorOptionValues'

const props = defineProps<{
  form: Record<string, any>
  editorOptions: Record<string, any>
}>()
const { t } = useI18n()

const network = computed(() => String(props.form.network || ''))
const transportExtra = computed(() => props.form.transportExtra || (props.form.transportExtra = {}))
const showRawHttpFields = computed(() => network.value === 'raw' && transportExtra.value.rawHeaderType === 'http')
// TCP has no transport-specific settings; rendering the legend alone leaves an
// empty section between "Authentication" and "TLS / Reality".
const hasTransportFields = computed(() => ['raw', 'ws', 'httpupgrade', 'grpc', 'xhttp', 'kcp', 'xdrive'].includes(network.value))

// The provider is a desktop-editor convenience: it is not stored by ServiceLib.
// Derive it from the persisted S3/search values exactly like AddServerViewModel,
// then apply the same defaults when the user picks a different provider.
const xdriveProvider = ref('')

function deriveXdriveProvider(): string {
  const extra = transportExtra.value
  const service = String(extra.xdriveService || '')
  const endpoint = String(extra.xdriveS3Endpoint || '')
  if (service === 'google-drive') return 'Google Drive'
  if (endpoint.includes('r2.cloudflarestorage.com')) return 'Cloudflare R2'
  if (endpoint.includes('amazonaws.com')) return 'AWS S3 (Global)'
  if (endpoint.includes('yandexcloud.net')) return 'Yandex Cloud S3'
  if (endpoint.includes('arvanstorage.ir')) return 'ArvanCloud S3'
  if (String(props.form.remarks || '').toLowerCase().includes('cloudflare')
    || (extra.xdriveS3PathStyle === true && extra.xdriveS3Region === 'auto')) return 'Cloudflare R2'
  if (service === 's3' || endpoint) return 'Custom S3'
  return 'Cloudflare R2'
}

function applyXdriveProviderPreset(provider: string) {
  const extra = transportExtra.value
  switch (provider) {
    case 'Cloudflare R2':
      extra.xdriveService = 's3'
      if (!extra.xdriveS3Region) extra.xdriveS3Region = 'auto'
      extra.xdriveS3PathStyle = true
      break
    case 'Google Drive':
      extra.xdriveService = 'google-drive'
      props.form.streamSecurity = 'tls'
      if (!props.form.sni) props.form.sni = 'www.google.com'
      if (!props.form.alpn) props.form.alpn = 'h2'
      if (!props.form.address) props.form.address = 'www.google.com'
      if (Number(props.form.port || 0) <= 0) props.form.port = 443
      break
    case 'AWS S3 (Global)':
      extra.xdriveService = 's3'
      if (!extra.xdriveS3Region) extra.xdriveS3Region = 'ap-northeast-1'
      extra.xdriveS3PathStyle = false
      break
    case 'Yandex Cloud S3':
      extra.xdriveService = 's3'
      if (!extra.xdriveS3Region) extra.xdriveS3Region = 'ru-central1'
      extra.xdriveS3PathStyle = true
      break
    case 'ArvanCloud S3':
      extra.xdriveService = 's3'
      if (!extra.xdriveS3Region) extra.xdriveS3Region = 'ir-tbz-sh1'
      extra.xdriveS3PathStyle = true
      break
    case 'Custom S3':
      extra.xdriveService = 's3'
      break
  }
}

function selectXdriveProvider(value: string | number | null) {
  xdriveProvider.value = String(value ?? '')
  applyXdriveProviderPreset(xdriveProvider.value)
}

function selectXdriveService(value: string | number | null) {
  transportExtra.value.xdriveService = String(value ?? '')
  xdriveProvider.value = deriveXdriveProvider()
}

// Derive the provider when the editor opens on an existing xdrive node. A
// brand-new xdrive selection starts from the desktop default provider.
watch(network, (value) => {
  if (value !== 'xdrive') {
    xdriveProvider.value = ''
    return
  }
  if (!transportExtra.value.xdriveService && !transportExtra.value.xdriveS3Endpoint) {
    xdriveProvider.value = 'Cloudflare R2'
    applyXdriveProviderPreset(xdriveProvider.value)
  } else {
    // An S3 endpoint without an explicit service still needs a value the
    // backend can emit; upstream treats that shape as S3.
    if (!transportExtra.value.xdriveService) transportExtra.value.xdriveService = 's3'
    xdriveProvider.value = deriveXdriveProvider()
  }
}, { immediate: true })
</script>

<template>
  <fieldset v-if="hasTransportFields" class="form-section">
    <legend class="section-title"><h3>{{ t('nodes.transport') }}</h3></legend>
    <div class="field-row">
      <template v-if="network === 'raw'">
        <div class="field">
          <span class="field-label">{{ t('nodes.rawHeaderType') }}</span>
          <UiSelect v-model="transportExtra.rawHeaderType" :aria-label="t('nodes.rawHeaderType')">
            <option
              v-for="type in optionValues(editorOptions.rawHeaderTypes, transportExtra.rawHeaderType)"
              :key="type"
              :value="type"
            >{{ type }}</option>
          </UiSelect>
        </div>
        <template v-if="showRawHttpFields">
          <label class="field">
            <span class="field-label">{{ t('nodes.host') }}</span>
            <input v-model="transportExtra.host" autocomplete="off" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('nodes.path') }}</span>
            <input v-model="transportExtra.path" autocomplete="off" />
          </label>
        </template>
      </template>

      <template v-if="network === 'ws' || network === 'httpupgrade'">
        <label class="field">
          <span class="field-label">{{ t('nodes.host') }}</span>
          <input v-model="transportExtra.host" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.path') }}</span>
          <input v-model="transportExtra.path" autocomplete="off" />
        </label>
      </template>

      <template v-if="network === 'grpc'">
        <div class="field">
          <span class="field-label">{{ t('nodes.grpcMode') }}</span>
          <UiSelect v-model="transportExtra.grpcMode" :aria-label="t('nodes.grpcMode')">
            <option v-for="mode in optionValues(editorOptions.grpcModes, transportExtra.grpcMode)" :key="mode" :value="mode">{{ mode }}</option>
          </UiSelect>
        </div>
        <label class="field">
          <span class="field-label">{{ t('nodes.grpcAuthority') }}</span>
          <input v-model="transportExtra.grpcAuthority" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.grpcServiceName') }}</span>
          <input v-model="transportExtra.grpcServiceName" autocomplete="off" />
        </label>
      </template>

      <template v-if="network === 'xhttp'">
        <div class="field">
          <span class="field-label">{{ t('nodes.xhttpMode') }}</span>
          <UiSelect v-model="transportExtra.xhttpMode" :aria-label="t('nodes.xhttpMode')">
            <option v-for="mode in optionValues(editorOptions.xhttpModes, transportExtra.xhttpMode)" :key="mode" :value="mode">{{ mode }}</option>
          </UiSelect>
        </div>
        <label class="field">
          <span class="field-label">{{ t('nodes.host') }}</span>
          <input v-model="transportExtra.host" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.path') }}</span>
          <input v-model="transportExtra.path" autocomplete="off" />
        </label>
        <label class="field field-wide">
          <span class="field-label">{{ t('nodes.xhttpExtra') }}</span>
          <textarea v-model="transportExtra.xhttpExtra" class="code-area" rows="4" spellcheck="false" />
        </label>
      </template>

      <template v-if="network === 'kcp'">
        <div class="field">
          <span class="field-label">{{ t('nodes.kcpHeaderType') }}</span>
          <UiSelect v-model="transportExtra.kcpHeaderType" :aria-label="t('nodes.kcpHeaderType')">
            <option
              v-for="type in optionValues(editorOptions.kcpHeaderTypes, transportExtra.kcpHeaderType)"
              :key="type"
              :value="type"
            >{{ type }}</option>
          </UiSelect>
        </div>
        <label class="field">
          <span class="field-label">{{ t('nodes.kcpSeed') }}</span>
          <input v-model="transportExtra.kcpSeed" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.kcpMtu') }}</span>
          <input v-model.number="transportExtra.kcpMtu" type="number" min="0" />
        </label>
      </template>

      <template v-if="network === 'xdrive'">
        <div class="field">
          <span class="field-label">{{ t('nodes.xdriveProvider') }}</span>
          <UiSelect
            :aria-label="t('nodes.xdriveProvider')"
            :model-value="xdriveProvider"
            @update:model-value="selectXdriveProvider"
          >
            <option
              v-for="provider in optionValues(editorOptions.xdriveProviders, xdriveProvider)"
              :key="provider"
              :value="provider"
            >{{ provider }}</option>
          </UiSelect>
        </div>
        <div class="field">
          <span class="field-label">{{ t('nodes.xdriveService') }}</span>
          <UiSelect
            :aria-label="t('nodes.xdriveService')"
            :model-value="transportExtra.xdriveService || editorOptions.xdriveServices?.[0] || ''"
            @update:model-value="selectXdriveService"
          >
            <option
              v-for="service in optionValues(editorOptions.xdriveServices, transportExtra.xdriveService)"
              :key="service"
              :value="service"
            >{{ service }}</option>
          </UiSelect>
        </div>
        <label class="field">
          <span class="field-label">{{ t('nodes.xdriveRemoteFolder') }}</span>
          <input v-model="transportExtra.xdriveRemoteFolder" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.xdriveSecrets') }}</span>
          <input v-model="transportExtra.xdriveSecrets" autocomplete="off" placeholder="AK,SK / OAuth" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.xdriveS3Endpoint') }}</span>
          <input v-model="transportExtra.xdriveS3Endpoint" autocomplete="off" placeholder="https://…" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.xdriveS3Bucket') }}</span>
          <input v-model="transportExtra.xdriveS3Bucket" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.xdriveS3Region') }}</span>
          <input v-model="transportExtra.xdriveS3Region" autocomplete="off" placeholder="auto" />
        </label>
        <label class="field check check-field">
          <UiCheckbox v-model="transportExtra.xdriveS3PathStyle" />
          <span>{{ t('nodes.xdriveS3PathStyle') }}</span>
        </label>
        <label class="field field-wide">
          <span class="field-label">{{ t('nodes.xdriveExtra') }}</span>
          <textarea v-model="transportExtra.xdriveExtra" class="code-area" rows="3" spellcheck="false" placeholder="{ }" />
          <small class="field-hint">{{ t('nodes.xdriveExtraTip') }}</small>
        </label>
      </template>
    </div>
  </fieldset>
</template>

<style scoped>
.form-section {
  display: grid;
  gap: var(--nova-space-3);
}

@media (max-width: 700px) {
  .field-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
