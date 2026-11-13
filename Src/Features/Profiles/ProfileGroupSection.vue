<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'
import { useListDragSort } from '../../UI/listDragSort'

const { t } = useI18n()
const app = useNovaApp()
const state = app.profiles.profileModalState
const actions = app.profiles.profileModalActions
const protocol = computed(() => String(state.profileForm.configType || ''))
const strategies = computed(() => state.editorOptions.multipleLoadStrategies || [])
const memberOrder = ref<HTMLElement | null>(null)
// ServiceLib excludes Custom configs from group membership; keep an already
// selected one visible so legacy groups can still be edited cleanly.
const selectableProfiles = computed(() => state.profileCatalog.filter((item: Record<string, any>) =>
  String(item.configType).toLowerCase() !== 'custom' || state.groupChildIds.includes(item.indexId)))
const memberDrag = useListDragSort({
  container: memberOrder,
  itemSelector: '.group-member-row',
  getIds: () => [...state.groupChildIds],
  onReorder: (ids) => actions.reorderGroupChild(ids),
  onCancel: (ids) => actions.reorderGroupChild(ids),
})
const draggingMemberId = memberDrag.draggingId
const beginMemberDrag = memberDrag.begin

function nameFor(profileId: string) {
  return state.profileCatalog.find((item: Record<string, any>) => item.indexId === profileId)?.remarks || profileId
}

function moveMember(id: string, offset: number) {
  const order = [...state.groupChildIds]
  const from = order.indexOf(id)
  const to = from + offset
  if (from < 0 || to < 0 || to >= order.length) return
  order.splice(from, 1)
  order.splice(to, 0, id)
  actions.reorderGroupChild(order)
}
import UiSelect from '../../Components/Material/UiSelect.vue'
</script>

<template>
  <fieldset class="form-section group-section">
    <legend class="section-title"><h3>{{ t(protocol === 'PolicyGroup' ? 'nodes.policyGroup' : 'nodes.proxyChain') }}</h3></legend>
    <div class="field-row">
      <UiSelect v-if="protocol === 'PolicyGroup'" :label="t('nodes.groupStrategy')" v-model="state.profileForm.protoExtra.multipleLoad">
          <option v-for="strategy in strategies" :key="strategy" :value="strategy">{{ t(`nodes.strategy${strategy}`) }}</option>
        </UiSelect>
      <UiSelect :label="t('nodes.groupSubscription')" v-model="state.profileForm.protoExtra.subChildItems">
          <option value="">{{ t('common.none') }}</option>
          <option v-for="group in state.groups" :key="group.id" :value="group.id">{{ group.name || t('common.allGroups') }}</option>
        </UiSelect>
      <label class="field">
        <span class="field-label">{{ t('nodes.groupFilter') }}</span>
        <input v-model="state.profileForm.protoExtra.filter" autocomplete="off" />
      </label>

      <div class="field field-wide group-member-editor">
        <strong>{{ t('nodes.groupMembers') }}</strong>
        <small class="field-hint">{{ t('nodes.groupMembersHint') }}</small>
        <div class="group-member-columns">
          <div class="group-profile-choices">
            <label v-for="item in selectableProfiles" :key="item.indexId" class="group-profile-choice">
              <UiCheckbox
                :model-value="state.groupChildIds.includes(item.indexId)"
                :disabled="item.indexId === state.editingProfileId"
                @change="actions.toggleGroupChild(item.indexId)"
              />
              <span>
                {{ item.remarks || item.indexId }}
                <small>{{ item.configType }} · {{ item.address }}:{{ item.port }}</small>
              </span>
            </label>
          </div>
          <div ref="memberOrder" class="group-member-order">
            <div
              v-for="id in state.groupChildIds"
              :key="id"
              :data-list-drag-id="id"
              class="group-member-row"
              :class="{ 'is-drag-source': draggingMemberId === id }"
            >
              <button
                type="button"
                class="icon-btn member-drag-handle"
                :aria-label="t('nodes.dragToSort')"
                :title="t('nodes.dragToSort')"
                @pointerdown="beginMemberDrag($event, id)"
                @keydown.up.prevent="moveMember(id, -1)"
                @keydown.down.prevent="moveMember(id, 1)"
              >
                <UiIcon name="drag-handle" />
              </button>
              <span>{{ nameFor(id) }}</span>
              <button
                type="button"
                class="icon-btn danger-text"
                :aria-label="t('common.delete')"
                @click="actions.toggleGroupChild(id)"
              >
                <UiIcon name="close" />
              </button>
            </div>
            <p v-if="!state.groupChildIds.length" class="muted">{{ t('common.empty') }}</p>
          </div>
        </div>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.form-section {
  display: grid;
  gap: var(--nova-space-3);
}

.group-member-editor {
  gap: var(--nova-space-2);
}

.group-member-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: var(--nova-space-4);
  align-items: start;
}

.group-profile-choices,
.group-member-order {
  display: grid;
  max-height: 280px;
  gap: var(--nova-space-1);
  padding: var(--nova-space-2);
  overflow: auto;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-lowest);
}

.group-profile-choice {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: var(--nova-space-2);
  padding: var(--nova-space-2);
  border-radius: var(--md-sys-shape-corner-small);
}

.group-profile-choice:hover {
  background: var(--nova-color-state-hover);
}

.group-profile-choice span {
  display: grid;
  min-width: 0;
  gap: 2px;
  overflow-wrap: anywhere;
}

.group-profile-choice small {
  color: var(--md-sys-color-on-surface-variant);
}

.group-member-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--nova-space-1);
  padding: var(--nova-space-1) var(--nova-space-2);
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container);
}

.group-member-row span {
  min-width: 0;
  flex: 1 1 auto;
  overflow-wrap: anywhere;
}

.group-member-row.is-drag-source {
  opacity: 0;
}

.member-drag-handle {
  color: var(--md-sys-color-on-surface-variant);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
}

.member-drag-handle:active {
  cursor: grabbing;
}

.list-drag-ghost {
  border: 1px solid color-mix(in srgb, var(--md-sys-color-primary) 36%, transparent);
  box-shadow: 0 14px 24px color-mix(in srgb, var(--md-sys-color-shadow) 32%, transparent);
}

.danger-text {
  color: var(--md-sys-color-error);
}

@media (max-width: 700px) {
  .field-row,
  .group-member-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
