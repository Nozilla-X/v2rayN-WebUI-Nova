<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionMenu, { type ActionMenuItem } from '../../Components/Material/ActionMenu.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import { usePageRequests } from '../../UI/useUiRequests'

const props = defineProps<{ paused: boolean; showFollow: boolean }>()
const emit = defineEmits<{ toggleLive: []; follow: [] }>()
const { t } = useI18n()
const app = useNovaApp()
const state = app.logs.logsPageState
const actions = app.logs.logsPageActions
const { run } = usePageRequests('logs')

const levelPatterns = {
  all: '',
  errors: '[Ee][Rr][Rr][Oo][Rr]|[Ff][Aa][Tt][Aa][Ll]',
  warnings: '[Ww][Aa][Rr][Nn]',
  info: '[Ii][Nn][Ff][Oo]',
  debug: '[Dd][Ee][Bb][Uu][Gg]|[Tt][Rr][Aa][Cc][Ee]',
} as const
type LogLevel = keyof typeof levelPatterns
const levelOptions: { value: LogLevel; label: string }[] = [
  { value: 'all', label: 'polish.levelAll' },
  { value: 'errors', label: 'polish.levelErrors' },
  { value: 'warnings', label: 'polish.levelWarnings' },
  { value: 'info', label: 'polish.levelInfo' },
  { value: 'debug', label: 'polish.levelDebug' },
]
const levelFilter = ref<LogLevel>('all')
const invalidRegex = computed(() => {
  const input = state.logFilter.trim()
  if (!input) return false
  const options = /^\\(\\?([ims]+)\\)/i.exec(input)
  const pattern = options ? input.slice(options[0].length) : input
  const flags = options ? [...new Set(options[1].toLowerCase().split(''))].join('') : ''
  try { new RegExp(pattern, flags); return false }
  catch { return true }
})

watch(invalidRegex, (invalid) => {
  if (invalid) app.feedback.showNotice(t('polish.invalidRegex'), 'error')
})

const levelItems = computed<ActionMenuItem[]>(() => levelOptions.map((option) => ({
  id: option.value,
  label: t(option.label),
  checked: levelFilter.value === option.value,
})))

const actionItems = computed<ActionMenuItem[]>(() => [
  { id: 'selected', label: t('logs.copySelected'), icon: 'copy', disabled: !state.selectedLogKeys.length },
  { id: 'page', label: t('logs.copyPage'), icon: 'clipboard' },
  { id: 'all', label: t('logs.copyAll'), icon: 'copy' },
  { id: 'separator', separator: true },
  { id: 'clear', label: t('logs.clear'), icon: 'delete', danger: true },
])

function load() {
  if (invalidRegex.value) {
    app.feedback.showNotice(t('polish.invalidRegex'), 'error')
    return
  }
  return run(() => actions.loadLogs(1))
}

function applyLevel(id: string) {
  if (!(id in levelPatterns)) return
  const level = id as LogLevel
  levelFilter.value = level
  state.logFilter = levelPatterns[level]
  void load()
}

function logAction(id: string) {
  if (id === 'selected') void actions.copySelectedLogs()
  else if (id === 'page') void actions.copyCurrentPage()
  else if (id === 'all') void actions.copyAllLogs()
  else if (id === 'clear') void actions.clearLogs()
}
</script>

<template>
  <div class="page-toolbar logs-toolbar">
    <div class="stream-controls">
      <UiButton type="button" class="btn btn-tonal" @click="emit('toggleLive')" :icon="props.paused ? 'play' : 'stop'">{{ t(props.paused ? 'polish.resumeLogs' : 'polish.pauseLogs') }}
      </UiButton>
      <UiButton v-if="props.showFollow" type="button" class="btn btn-outlined" @click="emit('follow')" icon="arrow-down">{{ t('polish.followLogs') }}
      </UiButton>
    </div>

    <search class="field field-toolbar filter-field" :aria-label="t('logs.filter')">
      <div class="filter-line">
        <ActionMenu
          :items="levelItems"
          :label="t('polish.logLevels')"
          button-icon="filter"
          button-class="icon-btn icon-btn-small"
          align="start"
          @select="applyLevel"
        />
        <input
          id="log-filter"
          v-model="state.logFilter"
          type="search"
          :aria-label="t('logs.filter')"
          :placeholder="t('logs.filter')"
          :title="t('polish.logFilterHint')"
          :aria-invalid="invalidRegex"
          spellcheck="false"
          autocomplete="off"
          @input="levelFilter = 'all'"
          @keyup.enter="load"
        />
      </div>
    </search>

    <div class="log-actions">
      <UiButton type="button" class="btn btn-outlined desktop-only" :disabled="!state.selectedLogKeys.length" @click="actions.copySelectedLogs" icon="copy">{{ t('logs.copySelected') }}
      </UiButton>
      <UiButton type="button" class="btn btn-tonal desktop-only" @click="actions.copyCurrentPage" icon="clipboard">{{ t('logs.copyPage') }}
      </UiButton>
      <UiButton type="button" class="btn btn-tonal desktop-only" @click="actions.copyAllLogs" icon="copy">{{ t('logs.copyAll') }}
      </UiButton>
      <UiButton type="button" class="btn btn-danger-tonal desktop-only" @click="actions.clearLogs" icon="delete">{{ t('logs.clear') }}
      </UiButton>
      <ActionMenu
        :items="actionItems"
        :label="t('common.more')"
        :button-text="t('common.more')"
        button-icon="dots-vertical"
        button-class="btn btn-outlined btn-small mobile-only"
        @select="logAction"
      />
    </div>
  </div>
</template>

<style scoped>
.logs-toolbar {
  min-width: 0;
  align-items: flex-start;
}

.stream-controls,
.log-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--nova-space-2);
}

.log-actions {
  /* Keep the action cluster on the trailing edge even when it wraps below
     the filter at narrower desktop widths. */
  margin-inline-start: auto;
}

.filter-field {
  min-width: min(100%, 280px);
  flex: 1 1 280px;
}

.filter-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--nova-space-1);
}

.filter-line input {
  min-width: 0;
  flex: 1 1 auto;
}

@media (min-width: 861px) {
  /* Match the neighbouring buttons so the toolbar reads as one control row. */
  .filter-line :deep(.icon-btn-small) {
    width: var(--nova-control-height);
    height: var(--nova-control-height);
  }
}

@media (max-width: 860px) {
  .logs-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .stream-controls {
    width: auto;
    grid-column: 1;
    grid-row: 1;
  }

  .log-actions {
    width: auto;
    grid-column: 2;
    grid-row: 1;
  }

  .filter-field {
    width: 100%;
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .stream-controls > .btn,
  .log-actions > .btn,
  .log-actions > :last-child {
    flex: 0 1 auto;
    min-height: var(--nova-control-height-touch);
  }
}
</style>
