<script setup lang="ts">
import UiButton from '../Components/Material/UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionMenu, { type ActionMenuItem } from '../Components/Material/ActionMenu.vue'
import PageFeedback from '../Components/Material/PageFeedback.vue'
import UiSelect from '../Components/Material/UiSelect.vue'
import { useNovaApp } from '../App/context'
import { useDraftState } from '../UI/useDraftState'
import RoutingProfilesPanel from '../Features/Routing/RoutingProfilesPanel.vue'
import RoutingRulesPanel from '../Features/Routing/RoutingRulesPanel.vue'

const { t } = useI18n()
const app = useNovaApp()
const state = app.routing.routingPageState
const actions = app.routing.routingPageActions
const { dirty, status, allowDiscard } = useDraftState(
  'routing',
  () => ({ strategies: state.routingForm, rules: state.rulesRaw }),
  () => ({ strategies: state.routingForm, rules: state.routingRules }),
  (path) => path === '/api/settings/routing' ? ['strategies'] : path.endsWith('/rules') ? ['rules'] : [],
)

const pageMenu = computed<ActionMenuItem[]>(() => [
  { id: 'import-profiles', label: t('routing.importProfiles'), icon: 'import' },
])

function choosePageAction(id: string) {
  if (id === 'import-profiles') void actions.importRoutingProfiles()
}

</script>

<template>
  <section class="page routing-page">
    <header class="page-head page-head-actions-only">
      <div class="page-actions">
        <UiButton type="button" class="btn btn-filled" @click="actions.openAddRoute" icon="plus">{{ t('routing.create') }}
        </UiButton>
        <ActionMenu :items="pageMenu" :label="t('common.more')" button-class="btn btn-tonal" @select="choosePageAction" />
      </div>
    </header>

    <PageFeedback scope="routing" />
    <p v-if="dirty" class="draft-status is-dirty" role="status">{{ t('polish.unsaved') }}</p>

    <section class="card strategies-card" aria-labelledby="routing-strategies-heading">
      <div class="card-head strategies-head">
        <div>
          <h2 id="routing-strategies-heading">{{ t('routing.domainStrategy') }}</h2>
          <small>{{ t('routing.domainStrategySingbox') }}</small>
        </div>
        <span v-if="status.writes" class="badge">{{ t('common.working') }}</span>
      </div>
      <div class="field-row strategy-fields">
        <UiSelect :label="t('routing.domainStrategy')" v-model="state.routingForm.domainStrategy" :aria-label="t('routing.domainStrategy')">
            <option v-for="strategy in state.routingOptions.routingBasicDomainStrategies || []" :key="strategy" :value="strategy">{{ strategy }}</option>
          </UiSelect>
        <UiSelect :label="t('routing.domainStrategySingbox')" v-model="state.routingForm.domainStrategy4Singbox" :aria-label="t('routing.domainStrategySingbox')">
            <option v-for="strategy in state.routingOptions.routingBasicDomainStrategies4Singbox || []" :key="strategy || 'none'" :value="strategy">
              {{ strategy || t('common.none') }}
            </option>
          </UiSelect>
        <div class="strategy-actions">
          <UiButton type="button" class="btn btn-filled" :disabled="state.savingRoutingStrategies" :aria-busy="state.savingRoutingStrategies" @click="actions.saveRoutingStrategies" icon="save">{{ t('common.save') }}
          </UiButton>
        </div>
      </div>
    </section>

    <div class="routing-workspace">
      <RoutingProfilesPanel :allow-discard="allowDiscard" />
      <RoutingRulesPanel />
    </div>
  </section>
</template>

<style scoped>
.routing-page {
  gap: var(--nova-space-3);
}

.strategies-card {
  padding: var(--nova-space-4);
}

.strategies-head {
  margin-bottom: var(--nova-space-3);
}

.strategies-head small {
  display: block;
  margin-top: var(--nova-space-1);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
}

.strategy-fields {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  align-items: end;
}

.strategy-actions {
  display: flex;
  min-height: var(--nova-field-height);
  align-items: end;
  justify-content: flex-start;
}

.routing-workspace {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(270px, 0.8fr) minmax(0, 2fr);
  align-items: stretch;
  gap: var(--nova-space-4);
}

.page-actions > .btn,
.page-actions :deep(.action-menu-trigger),
.strategy-actions > .btn {
  min-height: var(--nova-control-height-comfortable);
}

@media (max-width: 1100px) {
  .routing-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 860px) {
  .page-actions {
    width: 100%;
  }

  .page-actions :deep(.action-menu-trigger.is-icon-only) {
    width: var(--nova-touch-target);
    min-width: var(--nova-touch-target);
    flex: 0 0 var(--nova-touch-target);
    padding-inline: 0;
  }

  .strategy-actions {
    min-height: auto;
  }
}
</style>
