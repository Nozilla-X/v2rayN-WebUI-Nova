<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiSelect from '../../Components/Material/UiSelect.vue'
import { optionValues } from './editorOptionValues'

const props = defineProps<{
  form: Record<string, any>
  options: Record<string, any>
  shadowsocksMethods: readonly string[]
}>()
const { t } = useI18n()
const protocol = computed(() => String(props.form.configType || ''))
const isPasswordProtocol = computed(() => !['HTTP', 'SOCKS', 'Naive', 'WireGuard'].includes(protocol.value))
const passwordRequired = computed(() => ['VMess', 'VLESS', 'Shadowsocks', 'Trojan', 'Hysteria2', 'TUIC', 'Anytls'].includes(protocol.value))
const muxSupported = computed(() => ['VMess', 'VLESS', 'Shadowsocks', 'Trojan'].includes(protocol.value))
const authUserLabel = computed(() => protocol.value === 'VMess' || protocol.value === 'VLESS' ? 'nodes.uuid' : 'nodes.password')
</script>

<template>
  <fieldset class="section auth-section">
    <legend class="section-title"><h3>{{ t('nodes.authentication') }}</h3></legend>
    <div class="field-row">
      <label v-if="isPasswordProtocol" class="field">
        <span class="field-label">{{ t(authUserLabel) }}</span>
        <input v-model="form.password" :required="passwordRequired" autocomplete="off" />
      </label>
      <label v-if="['HTTP', 'SOCKS', 'Naive'].includes(protocol)" class="field">
        <span class="field-label">{{ t('nodes.username') }}</span>
        <input v-model="form.username" autocomplete="off" />
      </label>
      <label v-if="protocol === 'TUIC'" class="field">
        <span class="field-label">{{ t('nodes.uuid') }}</span>
        <input v-model="form.username" required autocomplete="off" />
      </label>
      <label v-if="['HTTP', 'SOCKS', 'Naive'].includes(protocol)" class="field">
        <span class="field-label">{{ t('nodes.password') }}</span>
        <input v-model="form.password" :required="protocol === 'Naive'" autocomplete="off" />
      </label>

      <label v-if="protocol === 'VMess'" class="field">
        <span class="field-label">{{ t('nodes.alterId') }}</span>
        <input v-model="form.protoExtra.alterId" />
      </label>
      <div v-if="protocol === 'VMess'" class="field">
        <span class="field-label">{{ t('nodes.security') }}</span>
        <UiSelect v-model="form.protoExtra.vmessSecurity" :aria-label="t('nodes.security')">
          <option v-for="security in optionValues(options.vmessSecurities, form.protoExtra.vmessSecurity)" :key="security" :value="security">{{ security }}</option>
        </UiSelect>
      </div>
      <div v-if="['VLESS', 'Trojan'].includes(protocol)" class="field">
        <span class="field-label">{{ t('nodes.flow') }}</span>
        <UiSelect v-model="form.protoExtra.flow" :aria-label="t('nodes.flow')">
          <option v-for="flow in optionValues(options.flows, form.protoExtra.flow)" :key="flow || 'none'" :value="flow">{{ flow || t('common.none') }}</option>
        </UiSelect>
      </div>
      <label v-if="protocol === 'VLESS'" class="field">
        <span class="field-label">{{ t('nodes.encryption') }}</span>
        <input v-model="form.protoExtra.vlessEncryption" />
      </label>
      <div v-if="protocol === 'Shadowsocks'" class="field">
        <span class="field-label">{{ t('nodes.method') }}</span>
        <UiSelect v-model="form.protoExtra.ssMethod" :aria-label="t('nodes.method')" required>
          <option v-for="method in optionValues(shadowsocksMethods, form.protoExtra.ssMethod)" :key="method" :value="method">{{ method }}</option>
        </UiSelect>
      </div>
      <div v-if="protocol === 'TUIC'" class="field">
        <span class="field-label">{{ t('nodes.congestionControl') }}</span>
        <UiSelect v-model="form.protoExtra.congestionControl" :aria-label="t('nodes.congestionControl')">
          <option v-for="control in optionValues(options.tuicCongestionControls, form.protoExtra.congestionControl)" :key="control" :value="control">{{ control }}</option>
        </UiSelect>
      </div>
      <div v-if="protocol === 'Naive' && form.protoExtra.naiveQuic" class="field">
        <span class="field-label">{{ t('nodes.congestionControl') }}</span>
        <UiSelect v-model="form.protoExtra.congestionControl" :aria-label="t('nodes.congestionControl')">
          <option v-for="control in optionValues(options.naiveCongestionControls, form.protoExtra.congestionControl)" :key="control" :value="control">{{ control }}</option>
        </UiSelect>
      </div>

      <template v-if="protocol === 'Hysteria2'">
        <label class="field"><span class="field-label">{{ t('nodes.uploadBandwidth') }}</span><input v-model.number="form.protoExtra.upMbps" type="number" min="0" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.downloadBandwidth') }}</span><input v-model.number="form.protoExtra.downMbps" type="number" min="0" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.salamanderPassword') }}</span><input v-model="form.protoExtra.salamanderPass" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.portHopping') }}</span><input v-model="form.protoExtra.ports" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.hopInterval') }}</span><input v-model="form.protoExtra.hopInterval" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.realmUrl') }}</span><input v-model="form.protoExtra.hy2RealmUrl" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.geckoMinPacket') }}</span><input v-model="form.protoExtra.geckoMinPacketSize" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.geckoMaxPacket') }}</span><input v-model="form.protoExtra.geckoMaxPacketSize" /></label>
      </template>

      <template v-if="protocol === 'WireGuard'">
        <label class="field"><span class="field-label">{{ t('nodes.wgPrivateKey') }}</span><input v-model="form.password" required autocomplete="off" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.wgPublicKey') }}</span><input v-model="form.protoExtra.wgPublicKey" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.wgPresharedKey') }}</span><input v-model="form.protoExtra.wgPresharedKey" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.wgAddress') }}</span><input v-model="form.protoExtra.wgInterfaceAddress" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.wgReserved') }}</span><input v-model="form.protoExtra.wgReserved" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.wgMtu') }}</span><input v-model.number="form.protoExtra.wgMtu" type="number" min="0" /></label>
        <label class="field"><span class="field-label">{{ t('nodes.wgDns') }}</span><input v-model="form.protoExtra.wgDns" /></label>
      </template>

      <label v-if="['Anytls', 'Naive'].includes(protocol)" class="field">
        <span class="field-label">{{ t('nodes.insecureConcurrency') }}</span>
        <input v-model.number="form.protoExtra.insecureConcurrency" type="number" min="0" />
      </label>
      <label v-if="protocol === 'HTTP'" class="field field-wide">
        <span class="field-label">{{ t('nodes.httpHeaders') }}</span>
        <textarea v-model="form.protoExtra.httpHeaders" rows="3" spellcheck="false" />
      </label>

      <div class="field-wide check-group">
        <label v-if="['Shadowsocks', 'Naive'].includes(protocol)" class="check">
          <UiCheckbox v-model="form.protoExtra.uot" />
          <span>{{ t('nodes.udpOverTcp') }}</span>
        </label>
        <label v-if="protocol === 'Naive'" class="check">
          <UiCheckbox v-model="form.protoExtra.naiveQuic" />
          <span>{{ t('nodes.naiveQuic') }}</span>
        </label>
        <label v-if="muxSupported" class="check">
          <UiCheckbox v-model="form.muxEnabled" />
          <span>{{ t('nodes.mux') }}</span>
        </label>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.auth-section {
  display: grid;
  gap: var(--nova-space-3);
}

@media (max-width: 700px) {
  .field-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
