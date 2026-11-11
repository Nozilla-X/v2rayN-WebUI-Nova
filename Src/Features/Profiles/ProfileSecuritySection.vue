<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiSelect from '../../Components/Material/UiSelect.vue'
import { optionValues } from './editorOptionValues'

const props = defineProps<{
  form: Record<string, any>
  editorOptions: Record<string, any>
  streamSecurityOptions: string[]
}>()
const { t } = useI18n()

const protocol = computed(() => String(props.form.configType || ''))
const isTls = computed(() => ['tls', 'reality'].includes(String(props.form.streamSecurity).toLowerCase()))
const isReality = computed(() => String(props.form.streamSecurity).toLowerCase() === 'reality')
const fingerprintDisabled = computed(() => ['Hysteria2', 'TUIC', 'Naive'].includes(protocol.value))
const alpnDisabled = computed(() => ['Hysteria2', 'Naive'].includes(protocol.value))
</script>

<template>
  <fieldset class="form-section">
    <legend class="section-title"><h3>{{ t('nodes.tlsReality') }}</h3></legend>
    <div class="field-row">
      <div class="field">
        <span class="field-label">{{ t('nodes.streamSecurity') }}</span>
        <UiSelect v-model="form.streamSecurity" :aria-label="t('nodes.streamSecurity')">
          <option v-for="security in streamSecurityOptions" :key="security || 'none'" :value="security">
            {{ security === 'tls' ? 'TLS' : security === 'reality' ? 'Reality' : t('common.none') }}
          </option>
        </UiSelect>
      </div>

      <template v-if="isTls">
        <label class="field">
          <span class="field-label">{{ t('nodes.sni') }}</span>
          <input v-model="form.sni" autocomplete="off" />
        </label>
        <div class="field">
          <span class="field-label">{{ t('nodes.alpn') }}</span>
          <UiSelect v-model="form.alpn" :aria-label="t('nodes.alpn')" :disabled="alpnDisabled">
            <option v-for="alpn in optionValues(editorOptions.alpns, form.alpn)" :key="alpn || 'none'" :value="alpn">{{ alpn || t('common.none') }}</option>
          </UiSelect>
        </div>
        <div class="field">
          <span class="field-label">{{ t('nodes.fingerprint') }}</span>
          <UiSelect v-model="form.fingerprint" :aria-label="t('nodes.fingerprint')" :disabled="fingerprintDisabled">
            <option
              v-for="fingerprint in optionValues(editorOptions.fingerprints, form.fingerprint)"
              :key="fingerprint || 'none'"
              :value="fingerprint"
            >{{ fingerprint || t('common.none') }}</option>
          </UiSelect>
        </div>
        <label class="check">
          <UiCheckbox v-model="form.allowInsecure" :disabled="protocol === 'Naive'" />
          <span>{{ t('nodes.allowInsecure') }}</span>
        </label>
      </template>

      <template v-if="isReality">
        <label class="field">
          <span class="field-label">{{ t('nodes.publicKey') }}</span>
          <input v-model="form.publicKey" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.shortId') }}</span>
          <input v-model="form.shortId" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.spiderX') }}</span>
          <input v-model="form.spiderX" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.mldsa65Verify') }}</span>
          <input v-model="form.mldsa65Verify" autocomplete="off" />
        </label>
      </template>

      <template v-if="form.streamSecurity === 'tls'">
        <label class="field field-wide">
          <span class="field-label">{{ t('nodes.cert') }}</span>
          <textarea v-model="form.cert" class="code-area" rows="4" spellcheck="false" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.certSha') }}</span>
          <input v-model="form.certSha" autocomplete="off" />
        </label>
        <label class="field field-wide">
          <span class="field-label">{{ t('nodes.echConfigList') }}</span>
          <textarea v-model="form.echConfigList" class="code-area" rows="3" spellcheck="false" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.verifyPeerCertByName') }}</span>
          <input v-model="form.verifyPeerCertByName" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">{{ t('nodes.finalmask') }}</span>
          <input v-model="form.finalmask" autocomplete="off" />
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
