<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../../Components/Material/AppDialog.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import { useNovaApp } from '../../App/context'

const { t } = useI18n()
const app = useNovaApp()
const state = app.routing.routeModalState
const actions = app.routing.routeModalActions

const formId = useId()
const submitting = ref(false)
const remarksError = ref('')

function strategyOptions(options: unknown, current: unknown, fallback: string[]): string[] {
  const values = Array.isArray(options) ? options.map(String) : fallback
  const selected = String(current ?? '')
  return [...new Set([...values, ...(selected && !values.includes(selected) ? [selected] : [])])]
}

const domainStrategies = computed(() => strategyOptions(
  state.routingOptions?.routingProfileDomainStrategies,
  state.routeForm.domainStrategy,
  ['AsIs', 'IPIfNonMatch', 'IPOnDemand'],
))
const singboxStrategies = computed(() => strategyOptions(
  state.routingOptions?.routingProfileDomainStrategies4Singbox,
  state.routeForm.domainStrategy4Singbox,
  ['', 'prefer_ipv4', 'prefer_ipv6', 'ipv4_only', 'ipv6_only'],
))

const ruleSetStatus = computed<'empty' | 'ok' | 'invalid'>(() => {
  const raw = String(state.routeForm.ruleSet ?? '').trim()
  if (!raw) return 'empty'
  try {
    return Array.isArray(JSON.parse(raw)) ? 'ok' : 'invalid'
  } catch {
    return 'invalid'
  }
})

function close() {
  state.showRouteForm = false
}

function toggle(field: 'enabled' | 'locked') {
  state.routeForm[field] = !state.routeForm[field]
}

async function submit() {
  if (submitting.value) return
  remarksError.value = ''
  if (!String(state.routeForm.remarks ?? '').trim()) {
    remarksError.value = t('routing.nameRequired')
    return
  }
  if (ruleSetStatus.value === 'invalid') return
  submitting.value = true
  try {
    await actions.saveRoute()
  } finally {
    submitting.value = false
  }
}
import UiSelect from '../../Components/Material/UiSelect.vue'
</script>

<template>
  <AppDialog
    :open="state.showRouteForm"
    wide
    :title="t(state.editingRouteId ? 'routing.edit' : 'routing.create')"
    @close="close"
  >
    <form :id="formId" class="route-form" novalidate @submit.prevent="submit">
      <section class="section route-form-section">
        <div class="field-row">
          <label class="field field-wide">
            <span class="field-label">{{ t('routing.name') }}</span>
            <input v-model="state.routeForm.remarks" :aria-invalid="remarksError ? 'true' : undefined" @input="remarksError = ''" />
            <p v-if="remarksError" class="field-error" role="alert">{{ remarksError }}</p>
          </label>
          <label class="field">
            <span class="field-label">{{ t('routing.url') }}</span>
            <input v-model="state.routeForm.url" inputmode="url" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('routing.customIcon') }}</span>
            <input v-model="state.routeForm.customIcon" />
          </label>
          <label class="field field-wide">
            <span class="field-label">{{ t('routing.singboxRuleSetPath') }}</span>
            <input v-model="state.routeForm.customRulesetPath4Singbox" />
          </label>
          <div class="check-group field-wide">
            <label class="check">
              <UiCheckbox
                :model-value="Boolean(state.routeForm.enabled)"
                :aria-label="t('common.enabled')"
                @change="toggle('enabled')"
              />
              {{ t('common.enabled') }}
            </label>
            <label class="check">
              <UiCheckbox
                :model-value="Boolean(state.routeForm.locked)"
                :aria-label="t('routing.locked')"
                @change="toggle('locked')"
              />
              {{ t('routing.locked') }}
            </label>
          </div>
        </div>
      </section>

      <section class="section route-form-section">
        <h3 class="route-heading">{{ t('routing.domainStrategy') }}</h3>
        <div class="field-row">
          <UiSelect :label="t('routing.domainStrategy')" v-model="state.routeForm.domainStrategy">
            <option v-for="strategy in domainStrategies" :key="strategy || 'none'" :value="strategy">
              {{ strategy || t('common.none') }}
            </option>
          </UiSelect>
          <UiSelect :label="t('routing.domainStrategySingbox')" v-model="state.routeForm.domainStrategy4Singbox">
              <option v-for="strategy in singboxStrategies" :key="strategy || 'none'" :value="strategy">
                {{ strategy || t('common.none') }}
              </option>
            </UiSelect>
        </div>
      </section>

      <details class="advanced-json">
        <summary>{{ t('routing.advancedJson') }}</summary>
        <div class="advanced-body">
          <p class="field-hint">{{ t('routing.routeAdvancedHint') }}</p>
          <label class="field field-wide">
            <span class="field-label">{{ t('common.rawJson') }}</span>
            <textarea
              v-model="state.routeForm.ruleSet"
              class="json-area"
              spellcheck="false"
              :aria-invalid="ruleSetStatus === 'invalid' ? 'true' : undefined"
            />
          </label>
          <div class="field-row">
            <label class="field">
              <span class="field-label">{{ t('routing.ruleCount') }}</span>
              <input v-model.number="state.routeForm.ruleNum" type="number" min="0" step="1" />
            </label>
            <label class="field">
              <span class="field-label">{{ t('routing.sort') }}</span>
              <input v-model.number="state.routeForm.sort" type="number" min="0" step="1" />
            </label>
          </div>
        </div>
      </details>

      <p v-if="ruleSetStatus === 'invalid'" class="banner banner-error" role="alert">
        {{ t('routing.rulesInvalid') }}
      </p>
    </form>

    <template #actions>
      <UiButton type="button" class="btn btn-text" :disabled="submitting" @click="close">
        {{ t('common.cancel') }}
      </UiButton>
      <UiButton type="submit" :form="formId" class="btn btn-filled" :disabled="submitting">
        {{ submitting ? t('common.working') : t('common.save') }}
      </UiButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.route-form {
  display: grid;
  gap: var(--nova-space-4);
}

.route-form-section {
  display: grid;
  gap: var(--nova-space-4);
}

.route-form .field-row {
  gap: var(--nova-space-4);
}

.route-heading {
  margin: 0;
  font-size: var(--md-sys-typescale-title-small-size);
  line-height: var(--md-sys-typescale-title-small-line);
}

.check-group {
  padding-block: var(--nova-space-1);
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

.json-area {
  min-height: 200px;
  font-family: var(--md-sys-typescale-font-mono);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: 1.6;
  tab-size: 2;
}

.banner {
  margin: 0;
}
</style>
