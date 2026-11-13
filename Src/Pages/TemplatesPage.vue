<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageFeedback from '../Components/Material/PageFeedback.vue'
import UiIcon from '../Components/Material/UiIcon.vue'
import TemplateEditor from '../Features/Templates/TemplateEditor.vue'
import { useNovaApp } from '../App/context'
import { useDraftState } from '../UI/useDraftState'

const { t } = useI18n()
const app = useNovaApp()
const state = app.templates.templatesPageState
const activeCore = ref('')

const coreKey = (value: unknown) => String(value ?? '').toLowerCase().replaceAll('_', '-')
const { dirtyKeys, status } = useDraftState(
  'templates',
  () => Object.fromEntries(state.templates.map((template: Record<string, any>) => [coreKey(template.coreType), template])),
  () => state.templates,
  (path: string) => [coreKey(decodeURIComponent(path.split('/').at(-1) || ''))],
)

const templateKeys = computed(() => state.templates.map((template: Record<string, any>) => coreKey(template.coreType)))
const resolvedCore = computed(() => templateKeys.value.includes(activeCore.value) ? activeCore.value : templateKeys.value[0] || '')

watch(templateKeys, (keys) => {
  if (!keys.includes(activeCore.value)) activeCore.value = keys[0] || ''
}, { immediate: true })

const currentTemplate = computed(() => state.templates.find((template) => coreKey(template.coreType) === resolvedCore.value) || null)
const currentDirty = computed(() => dirtyKeys.value.includes(resolvedCore.value))

function label(template: Record<string, any>) {
  return String(template.remarks || template.coreType || t('templates.core'))
}
</script>

<template>
  <section class="page templates-page">
    <PageFeedback scope="templates" />

    <nav v-if="state.templates.length" class="tabs template-tabs" :aria-label="t('templates.title')">
      <button
        v-for="template in state.templates"
        :key="String(template.coreType)"
        type="button"
        class="tab"
        :aria-selected="resolvedCore === coreKey(template.coreType)"
        @click="activeCore = coreKey(template.coreType)"
      >
        {{ label(template) }}
        <span class="count-pill">{{ template.coreType }}</span>
      </button>
    </nav>

    <article v-if="currentTemplate" class="card template-card">
      <div class="card-head">
        <div>
          <h2>{{ label(currentTemplate) }}</h2>
          <small>{{ t('templates.core') }} · {{ currentTemplate.coreType }}</small>
        </div>
        <span class="badge" :class="currentTemplate.enabled ? 'badge-success' : ''">
          {{ t(currentTemplate.enabled ? 'common.enabled' : 'common.disabled') }}
        </span>
      </div>
      <TemplateEditor :template="currentTemplate" :dirty="currentDirty" />
    </article>

    <div v-else class="card empty-state">
      <span class="empty-icon"><UiIcon name="templates" /></span>
      <strong>{{ t(status.reads ? 'common.loading' : 'common.empty') }}</strong>
      <p>{{ t('templates.coreUnavailable') }}</p>
    </div>
  </section>
</template>

<style scoped>
.templates-page {
  gap: var(--nova-space-3);
}

.template-tabs {
  max-width: 100%;
}

.template-tabs .tab {
  display: inline-flex;
  align-items: center;
  gap: var(--nova-space-2);
}

.template-tabs .count-pill {
  font-family: var(--md-sys-typescale-font-mono);
  font-size: var(--md-sys-typescale-label-small-size);
}

.template-card {
  min-width: 0;
  overflow: visible;
}

@media (max-width: 480px) {
  .template-card {
    padding: var(--nova-space-3);
  }

  .template-tabs .count-pill {
    display: none;
  }
}
</style>
