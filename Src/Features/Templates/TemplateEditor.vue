<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import { usePageRequests } from '../../UI/useUiRequests'
import { codeEditor as vCodeEditor } from '../../UI/codeEditor'

const props = defineProps<{ template: Record<string, any>; dirty: boolean }>()
const { t } = useI18n()
const app = useNovaApp()
const actions = app.templates.templatesPageActions
const { status } = usePageRequests('templates')

function save() {
  if (!status.writes) void actions.saveTemplate(props.template)
}

function toggle(field: string) {
  props.template[field] = !props.template[field]
}
</script>

<template>
  <form class="template-editor" @submit.prevent="save">
    <div class="field-row template-fields">
      <label class="field">
        <span class="field-label">{{ t('templates.remarks') }}</span>
        <input v-model="template.remarks" type="text" autocomplete="off" />
      </label>
      <label class="field">
        <span class="field-label">{{ t('templates.proxyDetour') }}</span>
        <input v-model="template.proxyDetour" type="text" autocomplete="off" spellcheck="false" />
      </label>
      <label class="check template-check">
        <UiCheckbox :model-value="Boolean(template.enabled)" @change="toggle('enabled')" />
        <span>{{ t('templates.enabled') }}</span>
      </label>
      <label class="check template-check">
        <UiCheckbox :model-value="Boolean(template.addProxyOnly)" @change="toggle('addProxyOnly')" />
        <span>{{ t('templates.addProxyOnly') }}</span>
      </label>
    </div>

    <label class="field code-field">
      <span class="field-label">{{ t('templates.config') }}</span>
      <textarea
        v-model="template.config"
        v-code-editor="save"
        class="code-area"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
      />
    </label>
    <label class="field code-field">
      <span class="field-label">{{ t('templates.tunConfig') }}</span>
      <textarea
        v-model="template.tunConfig"
        v-code-editor="save"
        class="code-area"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
      />
    </label>

    <p class="field-hint">{{ t('polish.editorKeyboard') }}</p>
    <div class="save-bar">
      <span class="draft-status" :class="{ 'is-dirty': dirty }">
        {{ t(dirty ? 'polish.unsaved' : 'polish.saved') }}
      </span>
      <UiButton type="submit" class="btn btn-filled" :disabled="Boolean(status.writes)" :aria-busy="Boolean(status.writes)" icon="save">{{ t('templates.save') }}
      </UiButton>
    </div>
  </form>
</template>

<style scoped>
.template-editor {
  display: grid;
  min-width: 0;
  gap: var(--nova-space-4);
  padding-top: var(--nova-space-4);
  border-top: 1px solid var(--nova-color-divider);
}

.template-fields {
  align-items: center;
}

.template-check {
  align-self: end;
  min-height: var(--nova-field-height);
  padding-inline: var(--nova-space-2);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container-lowest);
}

.code-field {
  min-width: 0;
}

.code-area {
  min-height: 230px;
  max-width: 100%;
  font-size: var(--md-sys-typescale-body-medium-size);
}

.save-bar {
  margin-inline: calc(-1 * var(--nova-space-4));
  margin-bottom: calc(-1 * var(--nova-space-2));
}

@media (min-width: 701px) and (max-width: 1200px) {
  /* Four controls in three auto-fit tracks leave one checkbox orphaned on a
     second row; an explicit 2×2 arrangement stays balanced. */
  .template-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .save-bar .btn {
    min-height: var(--nova-control-height-touch);
  }
}

@media (max-width: 480px) {
  .save-bar {
    position: static;
    margin-inline: 0;
    padding-inline: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .save-bar .btn {
    min-height: var(--nova-control-height-touch);
  }
}
</style>
