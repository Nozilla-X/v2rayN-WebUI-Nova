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
const values = (key: string): string[] => Array.isArray(props.options[key]) ? props.options[key] : []
</script>

<template>
  <article class="card settings-card">
    <div class="section-title">
      <div>
        <h2>{{ t('settings.application') }}</h2>
        <small>{{ t('settings.statistics') }} · {{ t('settings.geoAutoUpdate') }}</small>
      </div>
    </div>

    <UiDisclosure :summary="t('settings.groupBasic')" open>
      <div class="field-row">
        <FormField v-model="form.enableStatistics" kind="check" :label="t('settings.statistics')" />
        <FormField v-model="form.displayRealTimeSpeed" kind="check" :label="t('settings.realtimeSpeed')" />
        <FormField v-model="form.keepOlderDedupl" kind="check" :label="t('settings.keepOlderDedupl')" />
      </div>
    </UiDisclosure>

    <UiDisclosure :summary="t('settings.groupUpdates')">
      <div class="field-row">
        <FormField v-model="form.geoAutoUpdateInterval" kind="number" :min="0" :label="t('settings.geoAutoUpdate')" />
        <FormField v-model="form.rootCertProvider" kind="select" :allow-none="true" :none-value="null" :label="t('settings.rootCertProvider')" :options="values('rootCertProviders')" />
        <FormField v-model="form.geoSourceUrl" :label="t('settings.geoSourceUrl')" :suggestions="values('geoFilesSources')" />
        <FormField v-model="form.srsSourceUrl" :label="t('settings.srsSourceUrl')" :suggestions="values('singboxRulesetSources')" />
        <FormField v-model="form.routeRulesTemplateSourceUrl" :label="t('settings.routeRulesSourceUrl')" :suggestions="values('routingRulesSources')" />
        <FormField v-model="form.subConvertUrl" :label="t('settings.subConvertUrl')" :suggestions="values('subConvertUrls')" />
      </div>
    </UiDisclosure>

    <div class="save-bar">
      <span class="draft-status" :class="{ 'is-dirty': dirty }" role="status">
        {{ t(busy ? 'polish.saving' : dirty ? 'polish.unsaved' : 'polish.saved') }}
      </span>
      <UiButton type="button" class="btn btn-filled" :disabled="busy" :aria-busy="busy" @click="emit('save')">
        {{ t('settings.saveApplication') }}
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
