<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageFeedback from '../Components/Material/PageFeedback.vue'
import UiCheckbox from '../Components/Material/UiCheckbox.vue'
import LogsToolbar from '../Features/Logs/LogsToolbar.vue'
import LogsList from '../Features/Logs/LogsList.vue'
import LogsPagination from '../Features/Logs/LogsPagination.vue'
import { useNovaApp } from '../App/context'
import { usePageRequests } from '../UI/useUiRequests'

const { t } = useI18n()
const app = useNovaApp()
const state = app.logs.logsPageState
const actions = app.logs.logsPageActions
const paused = app.state.logsPaused
const { status } = usePageRequests('logs')
const autoScroll = ref(true)
const followOutput = ref(true)

const emptyText = computed(() => status.reads
  ? t('common.loading')
  : state.logFilter ? t('polish.noResults') : t('logs.noLogs'))
const showFollow = computed(() => !followOutput.value || state.logPage !== 1)

function activeLogPanel() {
  const selector = window.matchMedia('(max-width: 860px)').matches
    ? '.logs-page .log-mobile'
    : '.logs-page .log-table-desktop'
  return document.querySelector<HTMLDivElement>(selector)
}

async function scrollToLatest() {
  await nextTick()
  const element = activeLogPanel()
  if (element) element.scrollTop = element.scrollHeight
}

async function jumpToLatest() {
  followOutput.value = true
  await actions.loadLogs(1)
  await scrollToLatest()
}

async function toggleLive() {
  paused.value = !paused.value
  app.events.clearPendingLogQueue()
  if (paused.value) return
  followOutput.value = true
  await actions.loadLogs(1)
  await scrollToLatest()
}

function updateFollowOutput() {
  const element = activeLogPanel()
  if (!element) return
  followOutput.value = element.scrollHeight - element.scrollTop - element.clientHeight < 48
}

onMounted(() => scrollToLatest())

watch(() => state.logs, async () => {
  await nextTick()
  if (autoScroll.value && followOutput.value) await scrollToLatest()
}, { flush: 'post' })

watch(autoScroll, async (enabled) => {
  if (!enabled) return
  followOutput.value = true
  await scrollToLatest()
})
</script>

<template>
  <section class="page logs-page">
    <header class="page-head logs-head">
      <span class="logs-total">{{ t('logs.totalRows', { total: state.logTotal }) }}</span>
      <label class="check auto-scroll-check">
        <UiCheckbox :model-value="autoScroll" @change="autoScroll = !autoScroll" />
        <span>{{ t('logs.autoScroll') }}</span>
      </label>
    </header>

    <PageFeedback scope="logs" />

    <LogsToolbar :paused="paused" :show-follow="showFollow" @toggle-live="toggleLive" @follow="jumpToLatest" />

    <LogsList :empty-text="emptyText" @scroll="updateFollowOutput" />

    <LogsPagination />
  </section>
</template>

<style scoped>
.logs-page {
  gap: var(--nova-space-3);
}

.logs-head {
  align-items: center;
}

.logs-total {
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
  font-variant-numeric: tabular-nums;
}

.auto-scroll-check {
  padding-inline: var(--nova-space-2);
  border: 1px solid var(--nova-color-divider);
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-low);
}
</style>
