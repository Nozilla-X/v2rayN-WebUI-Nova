<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { useI18n } from 'vue-i18n'
import { useNovaApp } from '../../App/context'

const { t } = useI18n()
const app = useNovaApp()
const state = app.logs.logsPageState
const actions = app.logs.logsPageActions
</script>

<template>
  <nav class="pagination logs-pagination" :aria-label="t('logs.title')">
    <div class="pagination-controls">
      <UiButton type="button" class="btn btn-outlined page-button" :disabled="state.logPage <= 1" @click="actions.changeLogPage(1)">
        {{ t('logs.firstPage') }}
      </UiButton>
      <UiButton type="button" class="btn btn-outlined page-button" :disabled="state.logPage <= 1" @click="actions.changeLogPage(state.logPage - 1)">
        {{ t('logs.previousPage') }}
      </UiButton>
      <strong>{{ t('logs.pageIndicator', { page: state.logPage, pages: state.logTotalPages }) }}</strong>
      <UiButton type="button" class="btn btn-outlined page-button" :disabled="state.logPage >= state.logTotalPages" @click="actions.changeLogPage(state.logPage + 1)">
        {{ t('logs.nextPage') }}
      </UiButton>
      <UiButton type="button" class="btn btn-outlined page-button" :disabled="state.logPage >= state.logTotalPages" @click="actions.changeLogPage(state.logTotalPages)">
        {{ t('logs.lastPage') }}
      </UiButton>
    </div>
  </nav>
</template>

<style scoped>
.logs-pagination {
  min-width: 0;
}

.pagination-controls {
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.page-button {
  min-height: var(--nova-control-height-touch);
  padding-inline: var(--nova-space-3);
  font-size: var(--md-sys-typescale-label-medium-size);
}

@media (max-width: 480px) {
  .pagination-controls {
    width: 100%;
    flex-wrap: nowrap;
    justify-content: space-between;
    gap: var(--nova-space-1);
  }

  .pagination-controls strong {
    flex: 0 0 auto;
    font-size: var(--md-sys-typescale-label-medium-size);
    white-space: nowrap;
  }

  .page-button {
    min-width: 0;
    flex: 0 1 auto;
    padding-inline: var(--nova-space-2);
  }
}
</style>
