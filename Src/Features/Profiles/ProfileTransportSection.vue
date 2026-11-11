<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
const hasTransportFields = computed(() => ['raw', 'ws', 'httpupgrade', 'grpc', 'xhttp', 'kcp'].includes(network.value))
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
