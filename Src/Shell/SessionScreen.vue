<script setup lang="ts">
import UiButton from '../Components/Material/UiButton.vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BackendAddressFields from '../Components/Material/BackendAddressFields.vue'
import UiIcon from '../Components/Material/UiIcon.vue'
import UiTextField from '../Components/Material/UiTextField.vue'
import { useNovaApp } from '../App/context'

const { t } = useI18n()
const logoSrc = './v2rayN.png'
const app = useNovaApp()
const { session, backend, state, actions } = app

const loginKeyField = ref<InstanceType<typeof UiTextField> | null>(null)
const setupKeyField = ref<InstanceType<typeof UiTextField> | null>(null)
const setupConfirmKeyField = ref<InstanceType<typeof UiTextField> | null>(null)
const loginSubmitting = ref(false)
const setupSubmitPending = ref(false)

// The session forms use `novalidate`: native constraint validation runs before
// submit and can overwrite a silently autofilled Material shadow input. Values
// are committed from the live controls here, then validated by useSession.

function syncLoginKey() {
  loginKeyField.value?.syncFromDom()
}

async function submitLogin() {
  if (loginSubmitting.value || session.loading.value) return
  loginSubmitting.value = true
  syncLoginKey()
  try {
    await actions.loginToBackend()
  } finally {
    loginSubmitting.value = false
  }
}

function syncSetupKeys() {
  setupKeyField.value?.syncFromDom()
  setupConfirmKeyField.value?.syncFromDom()
}

async function submitSetup() {
  if (setupSubmitPending.value || session.setupSubmitting.value) return
  setupSubmitPending.value = true
  syncSetupKeys()
  try {
    await actions.configureAndRemember()
  } finally {
    setupSubmitPending.value = false
  }
}

function submitOnEnter(event: KeyboardEvent, submit: () => void) {
  if (event.isComposing || event.target !== event.currentTarget) return
  event.preventDefault()
  submit()
}
</script>

<template>
  <main class="session-screen">
    <section v-if="!session.setupStatusReady.value" class="splash-screen" role="status">
      <div class="splash-mark">
        <img :src="logoSrc" alt="" />
        <span>{{ t('common.loading') }}</span>
      </div>
    </section>

    <section v-else-if="session.setupRequired.value && !session.setupAllowedFromRequest.value" class="session-card card card-elevated">
      <div class="session-brand">
        <img :src="logoSrc" alt="" />
        <h1>{{ t('setup.title') }}</h1>
      </div>
      <div class="banner banner-warning">
        <UiIcon name="warning" />
        <span>{{ t('setup.localOnly') }}</span>
      </div>
      <div class="session-stack">
        <BackendAddressFields
          v-model="backend.draft.value"
          :testing="state.connectionTesting.value"
          :error="backend.error.value"
          :history="backend.history.value"
          @apply="actions.applyBackend"
          @test="actions.testConnection"
          @forget="backend.forget"
        />
      </div>
    </section>

    <form
      v-else-if="session.setupRequired.value"
      class="session-card card card-elevated"
      novalidate
      @submit.prevent="submitSetup"
    >
      <div class="session-brand">
        <img :src="logoSrc" alt="" />
        <h1>{{ t('setup.title') }}</h1>
      </div>
      <div class="session-stack">
        <BackendAddressFields
          v-model="backend.draft.value"
          :testing="state.connectionTesting.value"
          :error="backend.error.value"
          :history="backend.history.value"
          @apply="actions.applyBackend"
          @test="actions.testConnection"
          @forget="backend.forget"
        />
        <UiTextField
          ref="setupKeyField"
          v-model="session.setupKey.value"
          :label="t('setup.managementKey')"
          type="password"
          autocomplete="new-password"
          minlength="12"
          maxlength="4096"
          reveal-password
          required
          @keydown.enter="submitOnEnter($event, submitSetup)"
        />
        <UiTextField
          ref="setupConfirmKeyField"
          v-model="session.setupConfirmKey.value"
          :label="t('setup.confirmKey')"
          type="password"
          autocomplete="new-password"
          minlength="12"
          maxlength="4096"
          reveal-password
          required
          @keydown.enter="submitOnEnter($event, submitSetup)"
        />
        <p v-if="session.setupError.value" class="field-error" role="alert">{{ session.setupError.value }}</p>
      </div>
      <div class="session-actions">
        <UiButton
          type="submit"
          class="btn btn-filled btn-large"
          :loading="session.setupSubmitting.value"
          :disabled="session.setupSubmitting.value"
        >
          {{ t('setup.submit') }}
        </UiButton>
      </div>
    </form>

    <form v-else class="session-card card card-elevated" novalidate @submit.prevent="submitLogin">
      <div class="session-brand">
        <img :src="logoSrc" alt="" />
        <h1>{{ t('auth.title') }}</h1>
      </div>
      <div class="session-stack">
        <BackendAddressFields
          v-model="backend.draft.value"
          :testing="state.connectionTesting.value"
          :error="backend.error.value"
          :history="backend.history.value"
          @apply="actions.applyBackend"
          @test="actions.testConnection"
          @forget="backend.forget"
        />
        <UiTextField
          ref="loginKeyField"
          v-model="session.managementKeyDraft.value"
          :label="t('auth.token')"
          type="password"
          autocomplete="current-password"
          :placeholder="t('auth.placeholder')"
          reveal-password
          required
          @keydown.enter="submitOnEnter($event, submitLogin)"
        />
      </div>
      <div class="session-actions">
        <UiButton
          type="submit"
          class="btn btn-filled btn-large"
          :loading="session.loading.value"
          :disabled="session.loading.value"
        >
          {{ t('auth.connect') }}
        </UiButton>
      </div>
    </form>
  </main>
</template>

<style scoped>
.session-stack {
  display: grid;
  gap: var(--nova-space-4);
}

.session-card > .banner {
  margin-bottom: var(--nova-space-4);
}
</style>
