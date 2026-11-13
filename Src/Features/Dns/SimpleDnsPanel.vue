<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../../Components/Material/UiIcon.vue'
import FormField from './FormField.vue'
import { codeEditor as vCodeEditor } from '../../UI/codeEditor'
import { vDetailsMotion } from '../../UI/detailsMotion'
import { useNovaApp } from '../../App/context'

const props = defineProps<{
  form: Record<string, any>
  options: Record<string, any>
  raw: string
  dirty: boolean
  busy: boolean
  disabled: boolean
  section: 'simple' | 'advanced'
}>()
const emit = defineEmits<{ 'update:raw': [value: string]; save: [] }>()
const { t } = useI18n()
const app = useNovaApp()
const jsonInvalid = ref(false)
const locked = computed(() => props.disabled || props.busy)
const list = (key: string): string[] => Array.isArray(props.options[key]) ? props.options[key] : []
const strategies = () => list('domainStrategies4Freedom')

function updateRaw(event: Event) {
  jsonInvalid.value = false
  emit('update:raw', (event.target as HTMLTextAreaElement).value)
}

function validJson(): boolean {
  try {
    const parsed = JSON.parse(props.raw || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape')
    jsonInvalid.value = false
    return true
  } catch {
    jsonInvalid.value = true
    app.feedback.showNotice(t('common.invalidJson'), 'error')
    return false
  }
}

function saveSimple() {
  if (validJson()) emit('save')
}
</script>

<template>
  <div class="dns-stack">
    <p v-if="disabled" class="banner banner-warning" role="status">
      <UiIcon name="warning" /> {{ t('dns.customDnsConflict') }}
    </p>

    <article v-if="section === 'simple'" class="card dns-card">
      <div class="section-title">
        <div>
          <h2>{{ t('dns.simple') }}</h2>
        </div>
      </div>
      <fieldset :disabled="locked">
        <div class="field-row">
          <FormField v-model="form.directDNS" :disabled="locked" :label="t('dns.directDns')" :suggestions="list('directDnsAddresses')" />
          <FormField v-model="form.remoteDNS" :disabled="locked" :label="t('dns.remoteDns')" :suggestions="list('remoteDnsAddresses')" />
          <FormField v-model="form.bootstrapDNS" :disabled="locked" :label="t('dns.bootstrapDns')" :suggestions="list('bootstrapDnsAddresses')" />
          <FormField v-model="form.strategy4Freedom" :disabled="locked" kind="select" :label="t('dns.strategyFreedom')" :options="strategies()" :allow-none="true" />
          <FormField v-model="form.strategy4Proxy" :disabled="locked" kind="select" :label="t('dns.strategyProxy')" :options="strategies()" :allow-none="true" />
          <FormField v-model="form.strategy4ProxyDial" :disabled="locked" kind="select" :label="t('dns.strategyProxyDial')" :options="strategies()" :allow-none="true" />
          <FormField v-model="form.parallelQuery" :disabled="locked" kind="check" :label="t('dns.parallelQuery')" />
          <FormField v-model="form.serveStale" :disabled="locked" kind="check" :label="t('dns.serveStale')" />
          <FormField v-model="form.enableHappyEyeballs" :disabled="locked" kind="check" :label="t('dns.happyEyeballs')" />
        </div>
      </fieldset>
      <div class="save-bar">
        <span class="draft-status" :class="{ 'is-dirty': dirty }" role="status">
          {{ t(busy ? 'polish.saving' : dirty ? 'polish.unsaved' : 'polish.saved') }}
        </span>
        <UiButton type="button" class="btn btn-filled" :disabled="disabled || busy" :aria-busy="busy" @click="saveSimple" icon="save">{{ t('dns.saveSimple') }}
        </UiButton>
      </div>
    </article>

    <article v-if="section === 'advanced'" class="card dns-card">
      <div class="section-title">
        <div>
          <h2>{{ t('dns.profiles') }}</h2>
        </div>
      </div>
      <fieldset :disabled="locked">
        <div class="field-row">
          <FormField v-model="form.useSystemHosts" :disabled="locked" kind="check" :label="t('dns.useSystemHosts')" />
          <FormField v-model="form.addCommonHosts" :disabled="locked" kind="check" :label="t('dns.addCommonHosts')" />
          <FormField v-model="form.fakeIP" :disabled="locked" kind="check" :label="t('dns.fakeIp')" />
          <FormField v-model="form.globalFakeIp" :disabled="locked" kind="check" :label="t('dns.globalFakeIp')" />
          <FormField v-model="form.fakeIPRange" :disabled="locked" :label="t('dns.fakeIpRange')" :suggestions="list('fakeIpRanges')" />
          <FormField v-model="form.blockBindingQuery" :disabled="locked" kind="check" :label="t('dns.blockBindingQuery')" />
          <FormField v-model="form.blockAAAAQuery" :disabled="locked" kind="check" :label="t('dns.blockAAAAQuery')" />
          <FormField v-model="form.directExpectedIPs" :disabled="locked" :label="t('dns.directExpectedIPs')" :suggestions="list('expectedIps')" />
          <FormField v-model="form.hosts" :disabled="locked" kind="textarea" :label="t('dns.hosts')" wide />
        </div>
      </fieldset>

      <details v-details-motion class="disclosure json-disclosure" open>
        <summary>{{ t('dns.jsonEditor') }}</summary>
        <div class="ui-details-content">
          <p class="field-hint">{{ t('dns.jsonCompatibilityHint') }} · {{ t('polish.editorKeyboard') }}</p>
          <textarea
            v-code-editor="saveSimple"
            class="code-area dns-code"
            :value="raw"
            :disabled="locked"
            :aria-label="t('dns.jsonEditor')"
            :aria-invalid="Boolean(jsonInvalid)"
            spellcheck="false"
            @input="updateRaw"
          ></textarea>
        </div>
      </details>

      <div class="save-bar">
        <span class="draft-status" :class="{ 'is-dirty': dirty }" role="status">
          {{ t(busy ? 'polish.saving' : dirty ? 'polish.unsaved' : 'polish.saved') }}
        </span>
        <UiButton type="button" class="btn btn-filled" :disabled="disabled || busy || Boolean(jsonInvalid)" :aria-busy="busy" @click="saveSimple" icon="save">{{ t('dns.saveSimple') }}
        </UiButton>
      </div>
    </article>
  </div>
</template>

<style scoped>
.dns-stack {
  display: grid;
  min-width: 0;
  gap: var(--nova-space-4);
}

.dns-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--nova-space-4);
}

.banner {
  align-items: center;
}

.banner .ui-icon {
  flex: 0 0 auto;
}

.field-row {
  /* DNS endpoints are long DoH URLs. Wider tracks keep the whole address
     readable in the field instead of hard-clipping it against the trailing
     suggestion button. */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: var(--nova-space-3) var(--nova-space-4);
}

.json-disclosure {
  border-top: 1px solid var(--nova-color-divider);
}

.json-disclosure > summary {
  padding: var(--nova-space-3) 0;
  color: var(--md-sys-color-primary);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-weight-medium);
  cursor: pointer;
  user-select: none;
}

.json-disclosure[open] > summary {
  margin-bottom: var(--nova-space-2);
}

.dns-code {
  min-height: 240px;
  resize: vertical;
}

.save-bar .btn {
  min-width: 128px;
}

@media (max-width: 600px) {
  .dns-card {
    padding: var(--nova-space-4);
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
