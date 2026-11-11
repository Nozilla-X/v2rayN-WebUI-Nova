<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '../Components/Material/UiIcon.vue'
import { useNovaApp } from '../App/context'
import { MORE_GROUPS } from '../Shell/navigation'
import type { AppPage } from '../Composables/useAppRoute'

const { t } = useI18n()
const app = useNovaApp()
const { backend, runtime, state, actions } = app

const endpoint = computed(() => backend.base.value || t('more.sameOrigin'))
const coreState = computed(() => String(runtime.status.value?.runtimeState || (runtime.status.value?.coreRunning ? 'running' : 'stopped')))
const coreRunning = computed(() => Boolean(runtime.status.value?.coreRunning))
const version = '2.0.0'

function go(page: AppPage) {
  void actions.navigate(page)
}
</script>

<template>
  <section class="page more-page">
    <section class="more-hero">
      <img :src="state.brandIconSrc.value" :alt="t('brand')" />
      <div class="more-hero-copy">
        <h2>v2rayN Nova</h2>
        <p>Material Design 3 · {{ t('brand') }}</p>
        <span class="more-hero-status">
          <span class="status-dot" :class="{ 'is-on': coreRunning, 'is-error': coreState === 'faulted' }" />
          {{ t(`core.runtime.${coreState}`) }}
          <span class="muted">· {{ endpoint }}</span>
        </span>
      </div>
    </section>

    <div v-for="group in MORE_GROUPS" :key="group.titleKey" class="more-section">
      <h2>{{ t(group.titleKey) }}</h2>
      <div class="more-list">
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          class="more-link"
          @click="go(item.id)"
        >
          <span class="more-link-icon"><UiIcon :name="item.icon" /></span>
          <span class="more-link-copy">
            <strong>{{ t(item.labelKey) }}</strong>
            <small>{{ t(item.descriptionKey) }}</small>
          </span>
          <UiIcon name="chevron-right" />
        </button>
      </div>
    </div>

    <div class="more-section">
      <h2>{{ t('more.about') }}</h2>
      <div class="more-list">
        <div class="more-settings-row">
          <div class="row-copy">
            <strong>v2rayN Nova</strong>
            <small>{{ t('more.aboutText') }}</small>
          </div>
        </div>
        <div class="more-settings-row">
          <div class="row-copy">
            <strong>{{ t('more.version') }}</strong>
            <small>{{ version }} · {{ t('more.material') }}</small>
          </div>
        </div>
        <div class="more-settings-row">
          <div class="row-copy">
            <strong>{{ t('more.license') }}</strong>
            <small>GPL-3.0-or-later · v2rayN</small>
          </div>
        </div>
      </div>
    </div>

    <p class="more-footer">
      v2rayN Nova · GPL-3.0-or-later
    </p>
  </section>
</template>

<style scoped>
.more-page {
  max-width: 880px;
  margin-inline: auto;
  width: 100%;
}

.more-settings-row {
  flex-wrap: wrap;
}

.more-settings-row .segmented {
  max-width: 100%;
}

@media (max-width: 520px) {
  .more-settings-row {
    display: grid;
    justify-content: stretch;
  }

  .more-settings-row .segmented {
    width: 100%;
    overflow: visible;
  }

  .more-settings-row .segmented button {
    min-width: 0;
    flex: 1 1 0;
    padding-inline: var(--nova-space-2);
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
