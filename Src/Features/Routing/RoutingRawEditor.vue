<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionMenu, { type ActionMenuItem } from '../../Components/Material/ActionMenu.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import { codeEditor as vCodeEditor } from '../../UI/codeEditor'
import { vDetailsMotion } from '../../UI/detailsMotion'
import { usePageRequests } from '../../UI/useUiRequests'

const { t } = useI18n()
const app = useNovaApp()
const state = app.routing.routingPageState
const actions = app.routing.routingPageActions
const { status, run } = usePageRequests('routing')
const fileInput = ref<HTMLInputElement | null>(null)
const formatError = ref('')
const hasUrl = computed(() => Boolean(state.selectedRoute?.url?.trim()))
const importItems = computed<ActionMenuItem[]>(() => [
  { id: 'append', label: t('routing.append'), icon: 'check', checked: state.appendRules },
  { id: 'sep-append', separator: true },
  { id: 'file', label: t('routing.importFromFile'), icon: 'file' },
  { id: 'clipboard', label: t('routing.importFromClipboard'), icon: 'clipboard' },
  { id: 'url', label: t('routing.importFromUrl'), icon: 'link', disabled: !hasUrl.value },
])

function chooseImport(id: string) {
  if (id === 'append') state.appendRules = !state.appendRules
  else if (id === 'file') fileInput.value?.click()
  else if (id === 'clipboard') void actions.importRulesFromClipboard()
  else if (id === 'url') void actions.importRulesFromUrl()
}

function formatRaw() {
  try {
    state.rulesRaw = JSON.stringify(JSON.parse(state.rulesRaw), null, 2)
    formatError.value = ''
  } catch {
    formatError.value = t('common.invalidJson')
  }
}

function pasteRaw() {
  void navigator.clipboard.readText().then((text) => {
    if (!text) return
    state.rulesRaw = text
    formatError.value = ''
  }).catch(() => { formatError.value = t('common.clipboardUnavailable') })
}

function save() {
  void run(() => actions.saveRoutingRules())
}
</script>

<template>
  <details v-details-motion class="disclosure raw-editor">
    <summary>{{ t('routing.advancedJson') }}</summary>
    <div class="raw-content ui-details-content">
      <p class="field-hint">{{ t('routing.ruleJsonHint') }} · {{ t('polish.editorKeyboard') }}</p>
      <div class="import-bar">
        <label class="check append-check">
          <UiCheckbox
            :model-value="state.appendRules"
            @change="state.appendRules = !state.appendRules"
          />
          <span>{{ t('routing.append') }}</span>
        </label>
        <ActionMenu
          :items="importItems"
          :label="t('routing.importMenu')"
          :button-text="t('routing.importMenu')"
          button-icon="import"
          button-class="btn btn-tonal"
          @select="chooseImport"
        />
        <input ref="fileInput" hidden type="file" accept=".json,application/json,text/plain" @change="actions.readRulesFile" />
      </div>

      <label class="field import-field">
        <span class="field-label">{{ t('routing.importRulesLabel') }}</span>
        <textarea v-model="state.ruleImportText" class="code-area import-area" :aria-label="t('routing.importRulesLabel')" spellcheck="false"></textarea>
      </label>
      <div class="import-actions">
        <UiButton
          type="button"
          class="btn btn-filled"
          :disabled="!state.selectedRoutingId || !state.ruleImportText.trim()"
          @click="actions.importRoutingRules()"
         icon="import">{{ t('routing.importRules') }}
        </UiButton>
        <UiButton type="button" class="btn btn-outlined" @click="actions.importRulesFromClipboard" icon="clipboard">{{ t('routing.importFromClipboard') }}
        </UiButton>
        <label class="btn btn-outlined file-trigger">
          <UiIcon name="file" /> {{ t('routing.importFromFile') }}
          <input type="file" accept=".json,application/json,text/plain" @change="actions.readRulesFile" />
        </label>
        <UiButton
          type="button"
          class="btn btn-outlined"
          :disabled="!hasUrl"
          :title="state.selectedRoute?.url || t('routing.urlRequired')"
          @click="actions.importRulesFromUrl"
         icon="link">{{ t('routing.importFromUrl') }}
        </UiButton>
      </div>
      <p class="field-hint">{{ t('routing.importParserHint') }}</p>
      <textarea
        v-model="state.rulesRaw"
        v-code-editor="() => !status.writes && state.selectedRoutingId && save()"
        class="code-area rules-json"
        :aria-label="t('routing.advancedJson')"
        spellcheck="false"
        @input="formatError = ''"
      ></textarea>
      <p v-if="formatError" class="field-error" role="alert">{{ formatError }}</p>
      <div class="save-bar raw-save-bar">
        <UiButton type="button" class="btn btn-text" @click="formatRaw" icon="code">{{ t('common.format') }}</UiButton>
        <UiButton type="button" class="btn btn-text" @click="pasteRaw" icon="clipboard">{{ t('common.paste') }}</UiButton>
        <UiButton type="button" class="btn btn-outlined" @click="actions.copyRoutingRules" icon="copy">{{ t('common.copy') }}</UiButton>
        <UiButton type="button" class="btn btn-filled" :disabled="!state.selectedRoutingId || Boolean(status.writes)" @click="save" icon="save">{{ t('routing.saveRules') }}
        </UiButton>
      </div>
    </div>
  </details>
</template>

<style scoped>
.raw-editor {
  margin-top: var(--nova-space-2);
  border-top: 1px solid var(--nova-color-divider);
}

.raw-editor > summary {
  min-height: var(--nova-touch-target);
  padding: var(--nova-space-3) 0;
  color: var(--md-sys-color-primary);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-weight-medium);
  cursor: pointer;
  user-select: none;
}

.raw-content {
  display: grid;
  min-width: 0;
  gap: var(--nova-space-3);
}

.import-bar,
.import-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-2);
}

.append-check {
  min-height: var(--nova-control-height-comfortable);
  padding-inline: var(--nova-space-2);
}

.import-area {
  min-height: 84px;
}

.rules-json {
  min-height: 220px;
}

.raw-save-bar {
  justify-content: flex-start;
  padding-top: var(--nova-space-2);
}

.import-bar .btn,
.import-actions .btn,
.raw-save-bar .btn {
  min-height: var(--nova-control-height-comfortable);
}

@media (max-width: 860px) {
  .import-actions > .btn,
  .raw-save-bar > .btn {
    flex: 1 1 min(100%, 160px);
  }
}
</style>
