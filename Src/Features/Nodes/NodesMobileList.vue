<script setup lang="ts">
import UiButton from '../../Components/Material/UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionMenu, { type ActionMenuItem } from '../../Components/Material/ActionMenu.vue'
import UiCheckbox from '../../Components/Material/UiCheckbox.vue'
import UiIcon from '../../Components/Material/UiIcon.vue'
import { useNovaApp } from '../../App/context'

const { t } = useI18n()
const app = useNovaApp()
const state = app.nodes.nodesPageState
const actions = app.nodes.nodesPageActions
const showIp = computed(() => Boolean(state.showIpInfoColumn))

function menuFor(profile: Record<string, any>): ActionMenuItem[] {
  const id = profile.indexId
  return [
    { id: 'select', label: profile.isCurrent ? t('nodes.current') : t('nodes.switch'), icon: 'check', disabled: profile.isCurrent },
    { id: 'edit', label: t('common.edit'), icon: 'edit' },
    { id: 'copy', label: t('nodes.copySelected'), icon: 'copy' },
    { id: 'delete', label: t('common.delete'), icon: 'delete', danger: true },
    { id: 'sep-test', separator: true },
    { id: 'tcping', label: t('nodes.tcping') },
    { id: 'realping', label: t('nodes.realping') },
    { id: 'speedtest', label: t('nodes.speedtest') },
    { id: 'udpTest', label: t('nodes.udp') },
    { id: 'fastRealping', label: t('nodes.fastRealping') },
    { id: 'mixedtest', label: t('nodes.mixedtest') },
    { id: 'sep-share', separator: true },
    { id: 'share', label: t('nodes.shareProfile'), icon: 'share' },
    { id: 'copy-link', label: t('nodes.exportShareLinkClipboard'), icon: 'clipboard' },
    { id: 'export-config', label: t('nodes.exportFullConfig'), icon: 'file' },
  ].map((item) => item.id && !item.separator ? { ...item, id: `${item.id}:${id}` } : item)
}

function choose(profile: Record<string, any>, value: string) {
  const index = value.lastIndexOf(':')
  const action = index >= 0 ? value.slice(0, index) : value
  const id = profile.indexId
  if (action === 'select') void actions.selectProfile(profile)
  else if (action === 'edit') void app.profiles.openEditProfile(profile)
  else if (action === 'copy') void actions.runProfileAction('copy', [id])
  else if (action === 'delete') void actions.runProfileAction('delete', [id])
  else if (['tcping', 'realping', 'speedtest', 'udpTest', 'fastRealping', 'mixedtest'].includes(action)) {
    void actions.startSpeedTest(action, [id])
  } else if (action === 'share') app.nodes.nodesPageActions.shareProfile(id)
  else if (action === 'copy-link') void copyShareLink(id)
  else if (action === 'export-config') app.nodes.nodesPageActions.exportProfileConfig(id)
}

async function copyShareLink(id: string) {
  const previous = [...state.selectedIds]
  state.selectedIds = [id]
  try { app.nodes.nodesPageActions.exportShareLinksToClipboard() }
  finally { state.selectedIds = previous }
}

function selectCard(event: MouseEvent, profile: Record<string, any>) {
  if (event.detail > 1) {
    void actions.selectProfile(profile)
    return
  }
  actions.focusProfile(event, profile)
}
</script>

<template>
  <div class="mobile-card-list nodes-mobile-list">
    <article
      v-for="profile in state.filteredProfiles"
      :key="profile.indexId"
      class="mobile-card"
      :class="{ 'is-current': profile.isCurrent, 'is-selected': state.selectedIds.includes(profile.indexId) }"
      :data-profile-id="profile.indexId"
      @click="selectCard($event, profile)"
      @contextmenu.prevent
    >
      <div class="mobile-card-head">
        <span @click.stop>
          <UiCheckbox
            :model-value="state.selectedIds.includes(profile.indexId)"
            :aria-label="profile.remarks || profile.address"
            @change="actions.toggleProfile(profile.indexId)"
          />
        </span>
        <div class="mobile-card-title">
          <strong>
            <span class="mobile-card-remark">{{ profile.remarks || '—' }}</span>
            <UiIcon v-if="profile.isCurrent" name="check" :size="14" class="success-text" :label="t('nodes.current')" />
          </strong>
          <small>{{ profile.address }}:{{ profile.port }}</small>
        </div>
        <span class="badge badge-primary protocol-code">{{ profile.protocol }}</span>
        <span @click.stop>
          <ActionMenu
            :items="menuFor(profile)"
            :label="t('nodes.actions')"
            @select="choose(profile, $event)"
          />
        </span>
      </div>

      <div class="mobile-card-meta">
        <span class="badge">{{ profile.network || '—' }}</span>
        <span class="badge">{{ profile.streamSecurity || '—' }}</span>
        <span class="badge" :class="{ 'danger-text': profile.delay < 0 }">{{ actions.formatDelay(profile.delay) }}<template v-if="profile.delay > 0"> ms</template></span>
        <span v-if="profile.speed" class="badge">{{ profile.speed }} MB/s</span>
        <span v-if="showIp && profile.ipInfo" class="badge truncate">{{ profile.ipInfo }}</span>
      </div>

      <div class="node-mobile-traffic">
        <span>{{ t('nodes.todayUp') }} {{ actions.formatBytes(profile.todayUp) }}</span>
        <span>{{ t('nodes.todayDown') }} {{ actions.formatBytes(profile.todayDown) }}</span>
        <span class="spacer" />
        <span class="truncate">{{ profile.subscriptionName || t('common.none') }}</span>
      </div>
    </article>

    <div v-if="!state.filteredProfiles.length" class="empty-state">
      <div class="empty-icon"><UiIcon name="nodes" /></div>
      <strong>{{ state.filter ? t('common.noResults') : t('nodes.noProfile') }}</strong>
      <UiButton
        v-if="state.filter"
        type="button"
        class="btn btn-text btn-small"
        @click="state.filter = ''; actions.loadProfiles()"
      >
        {{ t('polish.clearSearch') }}
      </UiButton>
      <UiButton v-else type="button" class="btn btn-tonal btn-small" @click="actions.openAddProfile">
        {{ t('nodes.addNode') }}
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.protocol-code {
  font-family: var(--md-sys-typescale-font-mono);
  text-transform: uppercase;
}

.mobile-card-title strong {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--nova-space-1);
}

.mobile-card-remark {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-card-title strong .ui-icon {
  flex: 0 0 auto;
}

.node-mobile-traffic {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--nova-space-3);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-small-size);
  font-variant-numeric: tabular-nums;
}

.mobile-card-meta .badge {
  font-variant-numeric: tabular-nums;
}
</style>
