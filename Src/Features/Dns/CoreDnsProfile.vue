<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../../Components/Material/UiIcon.vue'
import UiSelect from '../../Components/Material/UiSelect.vue'
import FormField from './FormField.vue'
import { codeEditor as vCodeEditor } from '../../UI/codeEditor'

const props = defineProps<{
  profile: Record<string, any>
  options: Record<string, any>
  isXray: boolean
  dirty: boolean
  busy: boolean
}>()
const emit = defineEmits<{ importDefault: []; save: [] }>()
const { t } = useI18n()
const strategyId = useId()
const list = (key: string): string[] => Array.isArray(props.options[key]) ? props.options[key] : []
const coreType = computed(() => String(props.profile.coreType ?? '').toLowerCase().replaceAll('-', '_'))
const strategies = computed(() => list(coreType.value === 'sing_box' ? 'domainStrategies4Singbox' : 'domainStrategies4Freedom'))
const currentStrategy = computed(() => String(props.profile.domainStrategy4Freedom ?? ''))
const extraStrategy = computed(() => currentStrategy.value && !strategies.value.includes(currentStrategy.value) ? currentStrategy.value : '')
const docs = computed(() => props.isXray
  ? { url: 'https://xtls.github.io/config/dns.html#dnsobject', key: 'dns.docsXray' }
  : { url: 'https://sing-box.sagernet.org/zh/configuration/dns/', key: 'dns.docsSingbox' })
const coreName = computed(() => props.isXray ? 'Xray' : coreType.value === 'sing_box' ? 'sing-box' : String(props.profile.coreType || t('dns.profiles')))
const coreLabel = computed(() => {
  if (props.isXray) return t('dns.xrayTab')
  if (coreType.value === 'sing_box') return t('dns.singboxTab')
  return String(props.profile.coreType || t('dns.profiles'))
})
</script>

<template>
  <article class="card profile-card">
    <div class="card-head profile-head">
      <div>
        <h2>{{ coreLabel }}</h2>
        <small>{{ coreName }}</small>
      </div>
      <span class="badge" :class="profile.enabled ? 'badge-success' : ''">
        {{ t(profile.enabled ? 'common.enabled' : 'common.disabled') }}
      </span>
    </div>

    <div class="profile-actions">
      <a v-if="isXray || coreType === 'sing_box'" class="docs-link" :href="docs.url" target="_blank" rel="noopener noreferrer">
        <UiIcon name="link" /> {{ t(docs.key) }}
      </a>
      <UiButton type="button" class="btn btn-tonal btn-small" :disabled="busy" @click="emit('importDefault')" icon="import">{{ t('dns.importDefaultConfig') }}
      </UiButton>
    </div>

    <div class="field-row">
      <FormField v-model="profile.remarks" :label="t('dns.remarks')" />
      <FormField v-model="profile.enabled" kind="check" :label="t('dns.enabled')" />
      <UiSelect
        :id="strategyId"
        :key="`${coreType}:${strategies.join('|')}`"
        :label="t(isXray ? 'dns.domainStrategy' : 'dns.domainStrategy4Out')"
        v-model="profile.domainStrategy4Freedom"
      >
        <option value="">{{ t('common.none') }}</option>
        <option v-if="extraStrategy" :value="extraStrategy">{{ extraStrategy }}</option>
        <option v-for="value in strategies" :key="value || 'none'" :value="value">
          {{ value || t('common.none') }}
        </option>
      </UiSelect>
      <FormField v-model="profile.domainDNSAddress" :label="t('dns.domainDnsAddress')" :suggestions="list('domainDnsAddresses')" />
      <FormField v-if="isXray" v-model="profile.useSystemHosts" kind="check" :label="t('dns.useSystemHosts')" />
      <div class="field field-wide">
        <label class="field-label" :for="`dns-normal-${String(profile.coreType).replace(/[^a-z0-9]/gi, '-')}`">{{ t('dns.httpSocks') }}</label>
        <textarea
          :id="`dns-normal-${String(profile.coreType).replace(/[^a-z0-9]/gi, '-')}`"
          v-code-editor="() => emit('save')"
          v-model="profile.normalDNS"
          class="code-area dns-code"
          spellcheck="false"
        ></textarea>
      </div>
      <div class="field field-wide">
        <label class="field-label" :for="`dns-tun-${String(profile.coreType).replace(/[^a-z0-9]/gi, '-')}`">{{ t('dns.tunDns') }}</label>
        <textarea
          :id="`dns-tun-${String(profile.coreType).replace(/[^a-z0-9]/gi, '-')}`"
          v-code-editor="() => emit('save')"
          v-model="profile.tunDNS"
          class="code-area dns-code"
          spellcheck="false"
        ></textarea>
      </div>
    </div>

    <p class="field-hint profile-editor-hint">{{ t('polish.editorKeyboard') }}</p>

    <div class="save-bar">
      <span class="draft-status" :class="{ 'is-dirty': dirty }" role="status">
        {{ t(busy ? 'polish.saving' : dirty ? 'polish.unsaved' : 'polish.saved') }}
      </span>
      <UiButton type="button" class="btn btn-filled" :disabled="busy" :aria-busy="busy" @click="emit('save')" icon="save">{{ t('dns.saveCoreDns', { core: coreName }) }}
      </UiButton>
    </div>
  </article>
</template>

<style scoped>
.profile-card {
  display: grid;
  gap: var(--nova-space-4);
}

.profile-head {
  align-items: flex-start;
  margin-bottom: 0;
}

.profile-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--nova-space-2);
}

.docs-link {
  display: inline-flex;
  min-width: 0;
  min-height: var(--nova-control-height);
  align-items: center;
  gap: var(--nova-space-2);
  overflow-wrap: anywhere;
}

.docs-link .ui-icon {
  flex: 0 0 auto;
}

.field-row {
  gap: var(--nova-space-3) var(--nova-space-4);
}

.dns-code {
  min-height: 180px;
}

.save-bar .btn {
  min-width: 128px;
}

@media (max-width: 600px) {
  .profile-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .profile-actions .btn {
    width: 100%;
  }

  .field-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .save-bar {
    width: 100%;
  }

  .save-bar .btn {
    flex: 1 1 auto;
  }
}
</style>
