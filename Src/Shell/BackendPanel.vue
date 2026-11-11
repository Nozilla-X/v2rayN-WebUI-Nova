<script setup lang="ts">
import UiButton from '../Components/Material/UiButton.vue'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../Components/Material/AppDialog.vue'
import BackendAddressFields from '../Components/Material/BackendAddressFields.vue'
import { useNovaApp } from '../App/context'

const { t } = useI18n()
const app = useNovaApp()
const { backend, state, actions } = app

const open = computed(() => state.showBackendPanel.value)
const currentEndpoint = computed(() => backend.base.value || t('more.sameOrigin'))

watch(open, (value) => {
  if (value) backend.draft.value = backend.base.value
})

function close() { state.showBackendPanel.value = false }

function useAddress() {
  if (actions.applyBackend()) close()
}

function forget(address: string) {
  backend.forget(address)
}

async function test() {
  await actions.testConnection()
}

async function signOut() {
  close()
  await actions.disconnect()
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('more.connection')"
    :subtitle="t('more.backendDesc')"
    @close="close"
  >
    <div class="backend-body">
      <section class="meta-grid">
        <div class="meta-item">
          <small>{{ t('more.currentBackend') }}</small>
          <strong class="break-anywhere">{{ currentEndpoint }}</strong>
        </div>
        <div class="meta-item">
          <small>{{ t('more.sessionState') }}</small>
          <strong>
            <span class="status-dot" :class="{ 'is-on': app.session.authenticated.value }" />
            {{ app.session.authenticated.value ? t('more.authenticated') : t('more.notAuthenticated') }}
          </strong>
        </div>
      </section>

      <BackendAddressFields
        v-model="backend.draft.value"
        :testing="state.connectionTesting.value"
        :error="backend.error.value"
        :history="backend.history.value"
        @test="test"
        @apply="useAddress"
        @forget="forget"
      />

      <div class="scripts-actions scripts-actions-end">
        <UiButton type="button" class="btn btn-danger-tonal" @click="signOut" icon="logout">{{ t('more.signOut') }}
        </UiButton>
      </div>
    </div>
  </AppDialog>
</template>

<style scoped>
.backend-body {
  display: grid;
  gap: var(--nova-space-4);
}

.scripts-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: var(--nova-space-2);
}

.scripts-actions-end {
  padding-top: var(--nova-space-2);
  border-top: 1px solid var(--nova-color-divider);
  justify-content: flex-end;
}

.meta-item strong {
  display: flex;
  align-items: center;
  gap: var(--nova-space-2);
}
</style>
