<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSelect from '../../Components/Material/UiSelect.vue'
import { optionValues } from './editorOptionValues'

const props = defineProps<{
  form: Record<string, any>
  editorOptions: Record<string, any>
  protocolTypes: string[]
  coreTypes: string[]
  editingProfileId: string
  singboxOnly: string[]
  supportsTransport: boolean
  isGroup: boolean
  isCustom: boolean
}>()
const { t } = useI18n()

const protocol = computed(() => String(props.form.configType || ''))
const protocolOptions = computed(() => optionValues(props.protocolTypes, props.form.configType))
// ServiceLib only runs PolicyGroup/ProxyChain on Xray or sing-box; offering the
// other cores here lets a group save fail with the backend's generic
// "profile invalid" reply.
const groupCoreTypes = ['Xray', 'sing_box']
const coreOptions = computed(() => optionValues(
  props.isGroup
    ? props.coreTypes.filter((core) => groupCoreTypes.includes(core))
    : props.coreTypes,
  props.form.coreType,
))
const coreLocked = computed(() => props.singboxOnly.includes(protocol.value))
const addressLabel = computed(() => t(props.isCustom ? 'nodes.customConfigPath' : 'nodes.address'))
</script>

<template>
  <fieldset class="form-section">
    <legend class="section-title"><h3>{{ t('nodes.profileBase') }}</h3></legend>
    <div class="field-row">
      <div class="field">
        <span class="field-label">{{ t('nodes.type') }}</span>
        <UiSelect v-model="form.configType" :aria-label="t('nodes.type')" :disabled="Boolean(editingProfileId)">
          <option v-for="kind in protocolOptions" :key="kind" :value="kind">{{ kind === 'Anytls' ? 'AnyTLS' : kind }}</option>
        </UiSelect>
      </div>
      <div class="field">
        <span class="field-label">{{ t('nodes.coreType') }}</span>
        <UiSelect v-model="form.coreType" :aria-label="t('nodes.coreType')" :disabled="coreLocked">
          <option value="">{{ t('common.none') }}</option>
          <option v-for="core in coreOptions" :key="core" :value="core">{{ core === 'sing_box' ? 'sing-box' : core }}</option>
        </UiSelect>
      </div>
      <label class="field">
        <span class="field-label">{{ t('nodes.remarks') }}</span>
        <input v-model="form.remarks" required autocomplete="off" />
      </label>
      <template v-if="!isGroup">
        <label class="field" :class="{ 'field-wide': isCustom }">
          <span class="field-label">{{ addressLabel }}</span>
          <input
            v-model="form.address"
            required
            autocomplete="off"
            :placeholder="isCustom ? t('nodes.customConfigPathHint') : undefined"
          />
        </label>
        <label v-if="!isCustom" class="field">
          <span class="field-label">{{ t('nodes.port') }}</span>
          <input v-model.number="form.port" type="number" min="1" max="65535" required />
        </label>
        <div v-if="supportsTransport" class="field">
          <span class="field-label">{{ t('nodes.network') }}</span>
          <UiSelect v-model="form.network" :aria-label="t('nodes.network')">
            <option
              v-for="network in optionValues(editorOptions.networks, form.network)"
              :key="network"
              :value="network"
            >{{ network }}</option>
          </UiSelect>
        </div>
      </template>
    </div>
  </fieldset>
</template>

<style scoped>
.form-section {
  display: grid;
  gap: var(--nova-space-3);
}
</style>
