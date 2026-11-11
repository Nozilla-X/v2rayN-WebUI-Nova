<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import UiDisclosure from '../../Components/Material/UiDisclosure.vue'
import { useI18n } from 'vue-i18n'
import FormField from '../Dns/FormField.vue'

const props = defineProps<{
  form: Record<string, any>
  options: Record<string, any>
  dirty: boolean
  busy: boolean
}>()
const emit = defineEmits<{ save: [] }>()
const { t } = useI18n()
const values = (key: string): number[] => Array.isArray(props.options[key]) ? props.options[key] : []
</script>

<template>
  <article class="card settings-card">
    <div class="section-title">
      <div>
        <h2>{{ t('settings.speedtest') }}</h2>
        <small>{{ t('settings.speedUrl') }} · {{ t('settings.pingUrl') }}</small>
      </div>
    </div>

    <UiDisclosure :summary="t('settings.groupBasic')" open>
      <div class="field-row">
        <FormField v-model="form.speedTestTimeout" kind="select" :label="t('settings.speedTimeout')" :options="values('speedTestTimeouts')" />
        <FormField v-model="form.mixedConcurrencyCount" kind="select" :label="t('settings.mixedConcurrency')" :options="values('mixedConcurrencyCounts')" />
      </div>
    </UiDisclosure>

    <UiDisclosure :summary="t('settings.groupAddresses')">
      <div class="field-row">
        <FormField v-model="form.speedTestUrl" :label="t('settings.speedUrl')" :suggestions="options.speedTestUrls || []" />
        <FormField v-model="form.speedPingTestUrl" :label="t('settings.pingUrl')" :suggestions="options.speedPingTestUrls || []" />
        <FormField v-model="form.ipapiUrl" :label="t('settings.ipApiUrl')" :suggestions="options.ipapiUrls || []" />
        <FormField v-model="form.udpTestTarget" :label="t('settings.udpTarget')" :suggestions="options.udpTestTargets || []" />
      </div>
    </UiDisclosure>

    <div class="save-bar">
      <span class="draft-status" :class="{ 'is-dirty': dirty }" role="status">
        {{ t(busy ? 'polish.saving' : dirty ? 'polish.unsaved' : 'polish.saved') }}
      </span>
      <UiButton type="button" class="btn btn-filled" :disabled="busy" :aria-busy="busy" @click="emit('save')">
        {{ t('settings.saveSpeedtest') }}
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

@media (max-width: 600px) {
  .field-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .save-bar .btn {
    flex: 1 1 auto;
  }
}
</style>
