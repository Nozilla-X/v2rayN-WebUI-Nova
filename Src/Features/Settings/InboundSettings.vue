<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import UiDisclosure from '../../Components/Material/UiDisclosure.vue'
import { useI18n } from 'vue-i18n'
import FormField from '../Dns/FormField.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
const props = defineProps<{
  inbound: Record<string, any>
  options: Record<string, any>
  dirty: boolean
  busy: boolean
}>()
const emit = defineEmits<{ save: []; toggleDestOverride: [protocol: string, checked: boolean] }>()
const { t } = useI18n()
const values = (key: string): string[] => Array.isArray(props.options[key]) ? props.options[key] : []
</script>

<template>
  <article class="card settings-card">
    <div class="section-title">
      <div>
        <h2>{{ t('settings.inbound') }}</h2>
        <small>{{ t('settings.inboundSummary') }}</small>
      </div>
    </div>

    <UiDisclosure :summary="t('settings.groupBasic')" open>
      <div class="field-row">
        <FormField v-model="inbound.localPort" kind="number" :min="1" :max="65535" :label="t('settings.localPort')" />
        <FormField v-model="inbound.secondLocalPortEnabled" kind="check" :label="t('settings.secondPort')" />
        <FormField v-model="inbound.udpEnabled" kind="check" :label="t('settings.udp')" />
        <FormField v-model="inbound.sniffingEnabled" kind="check" :label="t('settings.sniffing')" />
        <FormField v-model="inbound.routeOnly" kind="check" :label="t('settings.routeOnly')" />
      </div>
    </UiDisclosure>

    <UiDisclosure :summary="t('settings.groupLan')">
      <div class="field-row">
        <FormField v-model="inbound.allowLANConn" kind="check" :label="t('settings.allowLan')" />
        <FormField v-model="inbound.newPort4LAN" kind="check" :label="t('settings.newLanPort')" />
        <div class="field-pair">
          <FormField v-model="inbound.user" :label="t('settings.user')" />
          <FormField v-model="inbound.pass" kind="password" :label="t('settings.pass')" />
        </div>
      </div>
    </UiDisclosure>

    <UiDisclosure :summary="t('settings.destOverride')" open>
      <div v-if="values('destOverrideProtocols').length" class="check-group">
        <label v-for="protocol in values('destOverrideProtocols')" :key="protocol" class="check">
          <UiCheckbox
            :model-value="(inbound.destOverride || []).includes(protocol)"
            :aria-label="protocol"
            @change="emit('toggleDestOverride', protocol, !(inbound.destOverride || []).includes(protocol))"
          />
          <span>{{ protocol }}</span>
        </label>
      </div>
      <p v-else class="field-hint">{{ t('common.empty') }}</p>
    </UiDisclosure>

    <div class="save-bar">
      <span class="draft-status" :class="{ 'is-dirty': dirty }" role="status">
        {{ t(busy ? 'polish.saving' : dirty ? 'polish.unsaved' : 'polish.saved') }}
      </span>
      <UiButton type="button" class="btn btn-filled" :disabled="busy" :aria-busy="busy" @click="emit('save')">
        {{ t('settings.saveInbound') }}
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

.field-pair {
  display: grid;
  min-width: 0;
  grid-column: 1 / -1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--nova-space-4);
  padding-top: var(--nova-space-1);
}

@media (max-width: 600px) {
  .field-row,
  .field-pair {
    grid-template-columns: minmax(0, 1fr);
  }

  .save-bar .btn {
    flex: 1 1 auto;
  }
}
</style>
