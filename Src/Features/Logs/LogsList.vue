<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../../Components/Material/AppDialog.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import { usePageRequests } from '../../UI/useUiRequests'
import type { Dict } from '../../Composables/types'

defineProps<{ emptyText: string }>()
const emit = defineEmits<{ scroll: [] }>()
const detailLog = ref<Dict | null>(null)
const { t, locale } = useI18n()
const app = useNovaApp()
const state = app.logs.logsPageState
const actions = app.logs.logsPageActions
const { status } = usePageRequests('logs')
const allSelected = computed(() => state.logs.length > 0 && state.logs.every((log: Dict, index: number) => state.selectedLogKeys.includes(actions.logKey(log, index))))
const selectedCount = computed(() => state.selectedLogKeys.length)
const partiallySelected = computed(() => selectedCount.value > 0 && !allSelected.value)

function key(log: Dict, index: number) {
  return actions.logKey(log, index)
}

function time(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleTimeString(locale.value, { hour12: false })
}

function detailSubtitle(log: Dict | null) {
  return log ? `${time(log.timestamp)} · ${log.source || t('common.unknown')}` : ''
}

function message(log: Dict) {
  return String(log.message || '')
}
</script>

<template>
  <div class="table-shell log-table-shell" :aria-busy="Boolean(status.reads)">
    <div class="log-table-desktop desktop-only" tabindex="0" :aria-label="t('logs.title')" @scroll.passive="emit('scroll')">
      <table class="data-table log-table">
        <thead>
          <tr>
            <th class="cell-check">
              <span class="selection-check">
                <UiCheckbox
                  :model-value="allSelected"
                  :indeterminate="partiallySelected"
                  :aria-label="t('common.selectAll')"
                  @change="actions.toggleAllLogs"
                />
                <span
                  v-if="selectedCount"
                  class="selection-count"
                  :aria-label="t('common.selected', { count: selectedCount })"
                >{{ selectedCount }}</span>
              </span>
            </th>
            <th class="time-column">{{ t('logs.time') }}</th>
            <th class="source-column">{{ t('logs.source') }}</th>
            <th>{{ t('logs.message') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(log, index) in state.logs"
            :key="key(log, index)"
            :class="{ 'is-selected': state.selectedLogKeys.includes(key(log, index)) }"
          >
            <td class="cell-check">
              <UiCheckbox
                :model-value="state.selectedLogKeys.includes(key(log, index))"
                :aria-label="String(log.message || t('logs.message'))"
                @change="actions.toggleLog(log, index)"
              />
            </td>
            <td class="log-time">{{ time(log.timestamp) }}</td>
            <td><span class="badge log-source">{{ log.source }}</span></td>
            <td class="log-message"><button type="button" class="text-button log-detail-trigger log-message" @click="detailLog = log">{{ message(log) }}</button></td>
          </tr>
          <tr v-if="!state.logs.length">
            <td colspan="4" class="empty-cell">{{ emptyText }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mobile-only log-mobile" tabindex="0" :aria-label="t('logs.title')" @scroll.passive="emit('scroll')">
      <div class="mobile-select-all">
        <label class="check">
          <span class="selection-check">
            <UiCheckbox
              :model-value="allSelected"
              :indeterminate="partiallySelected"
              :aria-label="t('common.selectAll')"
              @change="actions.toggleAllLogs"
            />
            <span
              v-if="selectedCount"
              class="selection-count"
              :aria-label="t('common.selected', { count: selectedCount })"
            >{{ selectedCount }}</span>
          </span>
          <span>{{ t('common.selectAll') }}</span>
        </label>
      </div>
      <div v-if="!state.logs.length" class="empty-state mobile-empty">
        <span class="empty-icon"><UiIcon name="logs" /></span>
        <p>{{ emptyText }}</p>
      </div>
      <div class="mobile-card-list">
        <article
          v-for="(log, index) in state.logs"
          :key="`mobile-${key(log, index)}`"
          class="mobile-card log-card"
          :class="{ 'is-selected': state.selectedLogKeys.includes(key(log, index)) }"
        >
          <div class="mobile-card-head">
            <label class="check log-card-check">
              <UiCheckbox
                :model-value="state.selectedLogKeys.includes(key(log, index))"
                :aria-label="String(log.message || t('logs.message'))"
                @change="actions.toggleLog(log, index)"
              />
            </label>
            <div class="mobile-card-title">
              <strong>{{ log.source || t('common.unknown') }}</strong>
              <small>{{ time(log.timestamp) }}</small>
            </div>
          </div>
          <button type="button" class="text-button log-detail-trigger log-message" @click="detailLog = log">{{ message(log) }}</button>
        </article>
      </div>
    </div>
  </div>

  <AppDialog
    :open="Boolean(detailLog)"
    :title="t('logs.message')"
    :subtitle="detailSubtitle(detailLog)"
    wide
    @close="detailLog = null"
  >
    <pre class="log-detail-content">{{ detailLog ? message(detailLog) : '' }}</pre>
    <template #actions>
      <UiButton type="button" class="btn btn-tonal" @click="detailLog = null">{{ t('common.close') }}</UiButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.log-table-shell {
  min-width: 0;
  max-height: min(62dvh, 680px);
  overflow: hidden;
  overscroll-behavior: contain;
}

.log-table-desktop {
  min-width: 0;
  max-height: inherit;
  overflow: auto;
}

.log-table {
  width: 100%;
  table-layout: fixed;
  white-space: normal;
}

.log-table .cell-check {
  width: 56px;
}

.log-table .time-column {
  width: 120px;
}

.log-table .source-column {
  width: min(24ch, 190px);
}

.log-time {
  color: var(--md-sys-color-on-surface-variant);
  font-family: var(--md-sys-typescale-font-mono);
  font-size: var(--md-sys-typescale-body-small-size);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.log-source {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-message {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  font-family: var(--md-sys-typescale-font-mono);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: var(--nova-log-line-height);
  white-space: pre-wrap;
}

.log-detail-trigger {
  display: block;
  width: 100%;
  overflow-wrap: anywhere;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  white-space: pre-wrap;
}

.log-detail-content {
  max-width: 100%;
  margin: 0;
  padding: var(--nova-space-3);
  overflow-wrap: anywhere;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--nova-color-code-surface);
  color: var(--nova-color-code-text);
  font-family: var(--md-sys-typescale-font-mono);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: var(--nova-log-line-height);
  white-space: pre-wrap;
}

.log-mobile {
  min-width: 0;
  max-height: 58dvh;
  overflow: auto;
  padding: var(--nova-space-2);
  border: 0;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container-lowest);
}

.mobile-select-all {
  padding-inline: var(--nova-space-1);
  border-bottom: 1px solid var(--nova-color-divider);
}

.log-card {
  gap: var(--nova-space-1);
  word-break: break-word;
}

.log-card-check {
  flex: 0 0 auto;
  min-height: var(--nova-touch-target);
  gap: var(--nova-space-2);
}

.log-card .log-message {
  margin: 0;
  padding-inline: var(--nova-space-1);
}

.mobile-empty {
  min-height: 160px;
}

@media (max-width: 860px) {
  .log-table-shell {
    display: block;
    max-height: none;
    overflow: visible;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .log-table-desktop {
    max-height: none;
  }

  .log-mobile {
    max-height: min(60dvh, 620px);
    padding: var(--nova-space-2);
    border: 1px solid var(--nova-color-divider);
    border-radius: var(--md-sys-shape-corner-large);
  }
}

@media (max-width: 480px) {
  .log-card {
    padding: var(--nova-space-2);
  }
}
</style>
