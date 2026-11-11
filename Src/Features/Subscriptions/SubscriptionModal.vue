<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../../Components/Material/AppDialog.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiSelect from '../../Components/Material/UiSelect.vue'
import { useNovaApp } from '../../App/context'

const { t } = useI18n()
const app = useNovaApp()
const state = app.subscriptions.subscriptionModalState
const actions = app.subscriptions.subscriptionModalActions
const form = computed(() => state.subscriptionForm)
const datalistId = `subscription-profiles-${useId()}`

const selectableProfiles = computed(() => state.profileOptions.filter((profile: Record<string, any>) =>
  String(profile.protocol || '').toLowerCase() !== 'custom' && String(profile.remarks || '').trim(),
))
const titleKey = computed(() => state.editingSubscriptionId ? 'subscriptions.editSubscription' : 'subscriptions.addSubscription')

function close() {
  state.showSubscriptionForm = false
}

function toggleEnabled() {
  form.value.enabled = !form.value.enabled
}
</script>

<template>
  <AppDialog :open="state.showSubscriptionForm" :title="t(titleKey)" wide @close="close">
    <form id="subscription-form" class="subscription-form" @submit.prevent="actions.saveSubscription">
      <fieldset class="form-section">
        <legend class="section-title"><h3>{{ t('subscriptions.source') }}</h3></legend>
        <div class="field-row">
          <label class="field">
            <span class="field-label">{{ t('subscriptions.name') }}</span>
            <input v-model="form.remarks" required autocomplete="off" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('subscriptions.url') }}</span>
            <input v-model="form.url" inputmode="url" autocomplete="url" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('subscriptions.interval') }}</span>
            <input v-model.number="form.autoUpdateInterval" type="number" min="0" step="1" />
          </label>
          <label class="check subscription-enabled">
            <UiCheckbox :model-value="Boolean(form.enabled)" @change="toggleEnabled" />
            <span>{{ t('subscriptions.enabled') }}</span>
          </label>
          <label class="field field-wide">
            <span class="field-label">{{ t('subscriptions.moreUrl') }}</span>
            <textarea v-model="form.moreUrl" rows="3" />
          </label>
        </div>
      </fieldset>

      <fieldset class="form-section">
        <legend class="section-title"><h3>{{ t('subscriptions.filter') }}</h3></legend>
        <div class="field-row">
          <label class="field">
            <input v-model="form.filter" :aria-label="t('subscriptions.filter')" />
          </label>
          <UiSelect :label="t('subscriptions.convertTarget')" v-model="form.convertTarget">
            <option value="">{{ t('common.none') }}</option>
            <option
              v-if="form.convertTarget && !state.convertTargets.includes(form.convertTarget)"
              :value="form.convertTarget"
            >{{ form.convertTarget }}</option>
            <option v-for="target in state.convertTargets" :key="target" :value="target">{{ target }}</option>
          </UiSelect>
        </div>
      </fieldset>

      <fieldset class="form-section">
        <legend class="section-title"><h3>{{ t('subscriptions.requestOptions') }}</h3></legend>
        <div class="field-row">
          <label class="field">
            <span class="field-label">{{ t('subscriptions.userAgent') }}</span>
            <input v-model="form.userAgent" autocomplete="off" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('subscriptions.sort') }}</span>
            <input v-model.number="form.sort" type="number" step="1" />
          </label>
          <label class="field field-wide">
            <span class="field-label">{{ t('subscriptions.requestHeaders') }}</span>
            <textarea v-model="form.requestHeaders" class="code-area" spellcheck="false" rows="4" />
            <small class="field-hint">{{ t('subscriptions.requestHeadersTip') }}</small>
          </label>
        </div>
      </fieldset>

      <fieldset class="form-section">
        <legend class="section-title"><h3>{{ t('subscriptions.proxyChain') }}</h3></legend>
        <div class="field-row">
          <label class="field">
            <span class="field-label">{{ t('subscriptions.prevProfile') }}</span>
            <input v-model="form.prevProfile" :list="datalistId" autocomplete="off" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('subscriptions.nextProfile') }}</span>
            <input v-model="form.nextProfile" :list="datalistId" autocomplete="off" />
          </label>
          <datalist :id="datalistId">
            <option
              v-for="profile in selectableProfiles"
              :key="profile.indexId"
              :value="profile.remarks"
              :label="[profile.protocol, profile.address, profile.port].filter(Boolean).join(' · ')"
            />
          </datalist>
          <UiSelect :label="t('subscriptions.customCoreType')" v-model="form.customCoreType">
            <option :value="null">{{ t('common.none') }}</option>
            <option
              v-if="form.customCoreType && !state.coreTypes.includes(form.customCoreType)"
              :value="form.customCoreType"
            >{{ form.customCoreType }}</option>
            <option v-for="core in state.coreTypes" :key="core" :value="core">
              {{ core === 'sing_box' ? 'sing-box' : core }}
            </option>
          </UiSelect>
          <label class="field">
            <span class="field-label">{{ t('subscriptions.preSocksPort') }}</span>
            <input v-model.number="form.preSocksPort" type="number" min="0" max="65535" step="1" />
          </label>
        </div>
      </fieldset>

      <fieldset class="form-section">
        <legend class="section-title"><h3>{{ t('subscriptions.memo') }}</h3></legend>
        <label class="field">
          <textarea v-model="form.memo" rows="3" :aria-label="t('subscriptions.memo')" />
        </label>
      </fieldset>
    </form>

    <template #actions>
      <UiButton type="button" class="btn btn-text" @click="close">{{ t('common.cancel') }}</UiButton>
      <UiButton type="submit" form="subscription-form" class="btn btn-filled">{{ t('common.save') }}</UiButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.subscription-form {
  display: grid;
  gap: var(--nova-space-4);
  min-width: 0;
}

.form-section {
  display: grid;
  gap: var(--nova-space-3);
  min-width: 0;
  padding-bottom: var(--nova-space-4);
  border-bottom: 1px solid var(--nova-color-divider);
}

.form-section:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.form-section legend {
  display: block;
  width: 100%;
  padding: 0;
  margin-bottom: var(--nova-space-2);
}

.form-section legend h3 {
  font-size: var(--md-sys-typescale-title-medium-size);
}

.subscription-enabled {
  align-self: end;
  padding-bottom: var(--nova-space-2);
}

@media (max-width: 600px) {
  .subscription-enabled {
    align-self: start;
    padding: 0;
  }
}
</style>
