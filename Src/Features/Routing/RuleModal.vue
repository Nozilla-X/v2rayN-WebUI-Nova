<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../../Components/Material/AppDialog.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiSelect from '../../Components/Material/UiSelect.vue'
import UiTextField from '../../Components/Material/UiTextField.vue'
import { useNovaApp } from '../../App/context'

const { t } = useI18n()
const app = useNovaApp()
const state = app.routing.ruleModalState
const actions = app.routing.ruleModalActions
const routingOptions = app.routing.routingOptions
const formId = useId()

const knownRuleTypes = ['ALL', 'Routing', 'DNS']
const knownTypes = ['field']
const knownNetworks = ['', 'tcp', 'udp', 'tcp,udp']
const knownOutboundTags = ['proxy', 'direct', 'block']
const fallbackProtocols = ['http', 'tls', 'quic', 'bittorrent']
const fallbackInboundTags = ['tun', 'socks', 'socks2', 'socks3']

function optionsWithCurrent(base: unknown, current: unknown, fallback: string[]): string[] {
  const options = Array.isArray(base) ? base.map(String) : fallback
  const selected = Array.isArray(current) ? current.map(String) : [String(current ?? '')]
  return [...new Set([...options, ...selected.filter((value) => value && !options.includes(value))])]
}

function parseList(value: unknown): string[] {
  return String(value ?? '').split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean)
}

function setList(field: 'inboundTagText' | 'protocolText', values: string[]) {
  const current = parseList(state.ruleForm[field])
  const known = field === 'inboundTagText' ? inboundTags.value : protocols.value
  const unchangedUnknown = current.filter((item) => !known.includes(item))
  state.ruleForm[field] = [...new Set([...values, ...unchangedUnknown])].join('\n')
}

const ruleTypes = computed(() => optionsWithCurrent(knownRuleTypes, state.ruleForm.ruleType, knownRuleTypes))
const types = computed(() => optionsWithCurrent(routingOptions.value?.routingRuleTypes, state.ruleForm.type, knownTypes))
const networks = computed(() => optionsWithCurrent(routingOptions.value?.routingRuleNetworks, state.ruleForm.network, knownNetworks))
const outboundTags = computed(() => optionsWithCurrent(routingOptions.value?.routingRuleOutboundTags, state.ruleForm.outboundTag, knownOutboundTags))
const protocols = computed(() => optionsWithCurrent(routingOptions.value?.routingRuleProtocols, parseList(state.ruleForm.protocolText), fallbackProtocols))
const inboundTags = computed(() => optionsWithCurrent(routingOptions.value?.routingRuleInboundTags, parseList(state.ruleForm.inboundTagText), fallbackInboundTags))
const selectedProtocols = computed(() => parseList(state.ruleForm.protocolText))
const selectedInboundTags = computed(() => parseList(state.ruleForm.inboundTagText))
const isSaving = computed(() => Boolean(state.savingRoutingRule))

function close() {
  if (!isSaving.value) state.showRuleForm = false
}

function toggleEnabled() {
  state.ruleForm.enabled = !state.ruleForm.enabled
}

function toggleMultiValue(field: 'inboundTagText' | 'protocolText', value: string) {
  const selected = field === 'inboundTagText' ? selectedInboundTags.value : selectedProtocols.value
  setList(field, selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
}

function submit() {
  if (isSaving.value) return
  void actions.saveRoutingRule()
}
</script>

<template>
  <AppDialog
    :open="state.showRuleForm"
    wide
    :close-on-scrim="!isSaving"
    :title="t(state.editingRuleId ? 'routing.editRule' : 'routing.addRule')"
    :subtitle="t('routing.ruleEditorHint')"
    @close="close"
  >
    <form :id="formId" class="rule-form" @submit.prevent="submit">
      <section class="section rule-section">
        <div class="field-row">
          <UiTextField v-model="state.ruleForm.remarks" :label="t('routing.remarks')" />
          <UiSelect :label="t('routing.ruleType')" v-model="state.ruleForm.ruleType">
            <option :value="null">{{ t('common.none') }}</option>
            <option v-for="value in ruleTypes" :key="value" :value="value">{{ value }}</option>
          </UiSelect>
          <UiSelect :label="t('nodes.type')" v-model="state.ruleForm.type">
            <option v-for="value in types" :key="value" :value="value">{{ value }}</option>
          </UiSelect>
          <UiSelect :label="t('routing.outboundTag')" v-model="state.ruleForm.outboundTag" required>
            <option value="">{{ t('common.none') }}</option>
            <option v-for="value in outboundTags" :key="value" :value="value">{{ value }}</option>
          </UiSelect>
          <UiTextField v-model="state.ruleForm.port" :label="t('routing.port')" inputmode="numeric" placeholder="80,443,1000-2000" />
          <UiSelect :label="t('routing.network')" v-model="state.ruleForm.network">
            <option v-for="value in networks" :key="value || 'any'" :value="value">
              {{ value || t('common.any') }}
            </option>
          </UiSelect>
          <label class="check rule-enabled">
            <UiCheckbox
              :model-value="Boolean(state.ruleForm.enabled)"
              :aria-label="t('common.enabled')"
              @change="toggleEnabled"
            />
            {{ t('common.enabled') }}
          </label>
        </div>
      </section>

      <section class="section rule-section">
        <div class="section-title rule-section-title">
          <h3>{{ t('routing.matchers') }}</h3>
        </div>
        <div class="field-row">
          <div class="field field-wide">
            <span class="field-label">{{ t('routing.inboundTag') }}</span>
            <span class="check-row" role="group" :aria-label="t('routing.inboundTag')">
              <label v-for="value in inboundTags" :key="value" class="check check-chip">
                <UiCheckbox
                  :model-value="selectedInboundTags.includes(value)"
                  :aria-label="value"
                  @change="toggleMultiValue('inboundTagText', value)"
                />
                {{ value }}
              </label>
            </span>
            <UiTextField
              v-model="state.ruleForm.inboundTagText"
              type="textarea"
              :aria-label="t('routing.inboundTag')"
              :placeholder="t('routing.listInputHint')"
              :rows="2"
            />
          </div>
          <div class="field field-wide">
            <span class="field-label">{{ t('routing.protocol') }}</span>
            <span class="check-row" role="group" :aria-label="t('routing.protocol')">
              <label v-for="value in protocols" :key="value" class="check check-chip">
                <UiCheckbox
                  :model-value="selectedProtocols.includes(value)"
                  :aria-label="value"
                  @change="toggleMultiValue('protocolText', value)"
                />
                {{ value }}
              </label>
            </span>
            <UiTextField
              v-model="state.ruleForm.protocolText"
              type="textarea"
              :aria-label="t('routing.protocol')"
              :placeholder="t('routing.listInputHint')"
              :rows="2"
            />
          </div>
          <UiTextField
            v-model="state.ruleForm.domainText"
            :label="t('routing.domain')"
            type="textarea"
            :placeholder="t('routing.domainInputHint')"
            :rows="3"
          />
          <UiTextField
            v-model="state.ruleForm.ipText"
            :label="t('routing.ip')"
            type="textarea"
            :placeholder="t('routing.listInputHint')"
            :rows="3"
          />
          <UiTextField
            v-model="state.ruleForm.processText"
            class="field-wide"
            :label="t('routing.process')"
            type="textarea"
            :placeholder="t('routing.listInputHint')"
            :rows="2"
          />
        </div>
      </section>

      <details class="advanced-json">
        <summary>{{ t('routing.advancedJson') }}</summary>
        <div class="advanced-body">
          <p class="field-hint">{{ t('routing.ruleJsonHint') }}</p>
          <UiTextField
            v-model="state.ruleAdvancedJson"
            class="field-wide"
            :label="t('common.rawJson')"
            type="textarea"
            mono
            :rows="12"
          />
        </div>
      </details>

      <p v-if="state.ruleModalError" class="banner banner-error" role="alert">
        {{ state.ruleModalError }}
      </p>
    </form>

    <template #actions>
      <UiButton type="button" class="btn btn-text" :disabled="isSaving" @click="close">
        {{ t('common.cancel') }}
      </UiButton>
      <UiButton type="submit" :form="formId" class="btn btn-filled" :disabled="isSaving">
        {{ isSaving ? t('common.working') : t('common.save') }}
      </UiButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.rule-form {
  display: grid;
  gap: var(--nova-space-4);
}

.rule-section {
  display: grid;
  gap: var(--nova-space-4);
}

.rule-form .field-row {
  gap: var(--nova-space-4);
}

.rule-section-title {
  margin-bottom: 0;
}

.rule-section-title h3 {
  font-size: var(--md-sys-typescale-title-small-size);
  line-height: var(--md-sys-typescale-title-small-line);
}

.rule-enabled {
  align-self: end;
  padding-bottom: var(--nova-space-2);
}

.check-row {
  display: flex;
  min-height: var(--nova-touch-target);
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-1) var(--nova-space-4);
  padding-inline: var(--nova-space-2);
}

.check-chip {
  min-height: var(--nova-touch-target);
  font-size: var(--md-sys-typescale-body-small-size);
}

.advanced-json {
  border: 1px solid var(--nova-color-divider);
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-lowest);
}

.advanced-json summary {
  display: flex;
  min-height: var(--nova-touch-target);
  align-items: center;
  padding: 0 var(--nova-space-4);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-weight-medium);
  cursor: pointer;
}

.advanced-json summary::marker {
  color: var(--md-sys-color-on-surface-variant);
}

.advanced-json[open] summary {
  border-bottom: 1px solid var(--nova-color-divider);
}

.advanced-body {
  display: grid;
  gap: var(--nova-space-3);
  padding: var(--nova-space-4);
}

.banner {
  margin: 0;
}

@media (max-width: 560px) {
  .rule-enabled {
    align-self: start;
    padding-bottom: 0;
  }

  .check-row {
    gap: 0 var(--nova-space-2);
  }
}
</style>
