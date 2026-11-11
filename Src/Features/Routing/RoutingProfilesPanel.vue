<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionMenu, { type ActionMenuItem } from '../../Components/Material/ActionMenu.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'

const props = defineProps<{ allowDiscard: (message: string) => Promise<boolean> }>()
const { t } = useI18n()
const app = useNovaApp()
const state = app.routing.routingPageState
const actions = app.routing.routingPageActions
const allSelected = computed(() => state.routes.length > 0 && state.selectedRouteIds.length === state.routes.length)
const selectionIndeterminate = computed(() => state.selectedRouteIds.length > 0 && !allSelected.value)
const presets = ['Default', 'Russia', 'Iran'] as const

async function selectRoute(id: string) {
  if (id === state.selectedRoutingId) return
  if (!await props.allowDiscard(t('polish.discardChanges'))) return
  await actions.selectRoutingProfile(id)
}

function toggleRoute(id: string) {
  state.selectedRouteIds = state.selectedRouteIds.includes(id)
    ? state.selectedRouteIds.filter((value: string) => value !== id)
    : [...state.selectedRouteIds, id]
}

function routeMenu(route: Record<string, any>): ActionMenuItem[] {
  return [
    { id: 'select', label: t('routing.profiles'), icon: 'check' },
    { id: 'activate', label: t('routing.setDefault'), icon: 'pin', disabled: route.id === state.activeRoutingId },
    { id: 'edit', label: t('common.edit'), icon: 'edit' },
    { id: 'delete', label: t('common.delete'), icon: 'delete', danger: true },
  ]
}

function chooseRoute(route: Record<string, any>, id: string) {
  if (id === 'select') void selectRoute(route.id)
  else if (id === 'activate') void actions.activateRoute(route.id)
  else if (id === 'edit') actions.openEditRoute(route)
  else if (id === 'delete') void actions.deleteRoute(route)
}
</script>

<template>
  <section class="card routing-panel routes-panel" aria-labelledby="routing-profiles-heading">
    <header class="card-head routes-head">
      <div class="heading-copy">
        <div class="title-line">
          <UiCheckbox
            :model-value="allSelected"
            :indeterminate="selectionIndeterminate"
            :aria-label="t('common.selectAll')"
            @change="actions.toggleAllRoutes"
          />
          <h2 id="routing-profiles-heading">{{ t('routing.profiles') }}</h2>
          <span class="count-pill">{{ state.routes.length }}</span>
        </div>
        <small v-if="state.selectedRouteIds.length">{{ t('common.selected', { count: state.selectedRouteIds.length }) }}</small>
      </div>
    </header>

    <div class="route-list mobile-card-list">
      <article
        v-for="route in state.routes"
        :key="route.id"
        class="route-item mobile-card"
        :class="{ 'is-current': route.id === state.activeRoutingId, 'is-selected': route.id === state.selectedRoutingId }"
      >
        <UiCheckbox
          :model-value="state.selectedRouteIds.includes(route.id)"
          :aria-label="route.remarks || t('routing.name')"
          @change="toggleRoute(route.id)"
        />
        <button
          type="button"
          class="route-pick"
          :aria-pressed="route.id === state.selectedRoutingId"
          :title="route.remarks"
          @click="selectRoute(route.id)"
          @dblclick.stop="actions.activateRoute(route.id)"
        >
          <span class="route-name">{{ route.remarks || '—' }}</span>
          <span class="route-meta">
            <span>{{ t('routing.ruleCount') }}: {{ route.ruleNum ?? 0 }}</span>
            <span class="badge" :class="route.enabled ? 'badge-success' : ''">
              {{ route.enabled ? t('common.enabled') : t('common.disabled') }}
            </span>
            <span v-if="route.id === state.activeRoutingId" class="badge badge-primary">{{ t('common.active') }}</span>
          </span>
          <span v-if="route.url" class="route-url" :title="route.url">{{ route.url }}</span>
        </button>
        <span class="route-menu-slot" @click.stop @dblclick.stop>
          <ActionMenu :items="routeMenu(route)" :label="t('nodes.actions')" @select="chooseRoute(route, $event)" />
        </span>
      </article>
      <div v-if="!state.routes.length" class="empty-state routes-empty">
        <div class="empty-icon"><UiIcon name="route" /></div>
        <strong>{{ t('routing.noRouting') }}</strong>
      </div>
    </div>

    <footer class="preset-bar">
      <span class="preset-label">{{ t('routing.regionalPreset') }}</span>
      <UiButton
        v-for="preset in presets"
        :key="preset"
        type="button"
        class="btn btn-tonal btn-small preset-button"
        :disabled="Boolean(state.applyingPreset)"
        :aria-busy="state.applyingPreset === preset"
        @click="actions.applyPreset(preset)"
      >
        {{ state.applyingPreset === preset ? t('common.loading') : t(`routing.preset${preset}`) }}
      </UiButton>
    </footer>
  </section>
</template>

<style scoped>
.routing-panel {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: var(--nova-space-3);
}

.routes-head {
  margin-bottom: 0;
}

.heading-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.heading-copy small {
  padding-left: calc(var(--nova-touch-target) + var(--nova-space-2));
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
}

.title-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--nova-space-2);
}

.title-line h2 {
  min-width: 0;
}

.route-list {
  display: grid;
  min-width: 0;
  max-height: 60dvh;
  align-content: start;
  gap: var(--nova-space-1);
  overflow-y: auto;
}

.route-item {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--nova-space-2);
  padding: var(--nova-space-1) var(--nova-space-2);
  border: 1px solid transparent;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-lowest);
}

.route-item.is-current {
  border-color: color-mix(in srgb, var(--md-sys-color-tertiary) 46%, transparent);
  background: var(--nova-color-current-row);
}

.route-item.is-selected {
  border-color: var(--md-sys-color-primary);
  background: var(--nova-color-selected-row);
}

.route-pick {
  display: grid;
  min-width: 0;
  min-height: var(--nova-touch-target);
  align-content: center;
  gap: 2px;
  padding: 0 var(--nova-space-1);
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.route-name {
  overflow: hidden;
  font-size: var(--md-sys-typescale-body-large-size);
  font-weight: var(--md-sys-typescale-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-meta,
.route-url {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-2);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-small-size);
}

.route-url {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-menu-slot {
  flex: 0 0 auto;
}

.routes-empty {
  min-height: 160px;
  padding: var(--nova-space-4);
}

.preset-bar {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-2);
  padding-top: var(--nova-space-3);
  border-top: 1px solid var(--nova-color-divider);
}

.preset-label {
  flex: 1 1 100%;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-medium-size);
}

.preset-button {
  min-height: var(--nova-control-height-comfortable);
}

@media (max-width: 860px) {
  .route-list {
    max-height: none;
  }

  /* Keep the label in normal flow instead of letting it grow and push
     "Default region" to the far edge of the first wrapped row. */
  .preset-label {
    flex: 0 1 auto;
  }
}
</style>
