<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from './AppDialog.vue'
import UiSegmented, { type SegmentedOption } from './UiSegmented.vue'
import { useNovaApp } from '../../App/context'

const { t } = useI18n()
const app = useNovaApp()
const { theme, locale, state, actions } = app

const open = computed(() => state.showAppearancePanel.value)
const themeOptions = computed<SegmentedOption[]>(() => [
  { id: 'system', label: t('theme.system'), icon: 'system' },
  { id: 'light', label: t('theme.light'), icon: 'sun' },
  { id: 'dark', label: t('theme.dark'), icon: 'moon' },
])
const localeOptions = computed<SegmentedOption[]>(() => [
  { id: 'zh-CN', label: t('localeNames.zhCN') },
  { id: 'zh-TW', label: t('localeNames.zhTW') },
  { id: 'en-US', label: t('localeNames.enUS') },
])

function close() {
  state.showAppearancePanel.value = false
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('more.appearance')"
    :subtitle="t('more.themeDesc')"
    small
    @close="close"
  >
    <div class="appearance-body">
      <section class="appearance-section" aria-labelledby="appearance-theme">
        <div class="appearance-copy">
          <strong id="appearance-theme">{{ t('theme.label') }}</strong>
          <small>{{ t('more.themeDesc') }}</small>
        </div>
        <UiSegmented
          :model-value="theme.preference.value"
          :options="themeOptions"
          :aria-label="t('theme.label')"
          @update:model-value="actions.setTheme"
        />
      </section>

      <section class="appearance-section" aria-labelledby="appearance-language">
        <div class="appearance-copy">
          <strong id="appearance-language">{{ t('header.language') }}</strong>
          <small>{{ t('more.languageDesc') }}</small>
        </div>
        <UiSegmented
          :model-value="locale"
          :options="localeOptions"
          :aria-label="t('header.language')"
          @update:model-value="actions.setLocale"
        />
      </section>

      <section class="palette-strip" aria-hidden="true">
        <span class="palette-dot palette-primary" />
        <span class="palette-dot palette-secondary" />
        <span class="palette-dot palette-tertiary" />
        <span class="palette-dot palette-success" />
        <span class="palette-dot palette-warning" />
        <span class="palette-dot palette-error" />
        <span class="palette-caption">Material You</span>
      </section>

      <p class="appearance-about">v2rayN Nova 2.0.0 · Material Design 3 · GPL-3.0-or-later</p>
    </div>
  </AppDialog>
</template>

<style scoped>
.appearance-body {
  display: grid;
  gap: var(--nova-space-5);
}

.appearance-section {
  display: grid;
  gap: var(--nova-space-3);
}

.appearance-copy {
  display: grid;
  gap: 2px;
}

.appearance-copy strong {
  color: var(--md-sys-color-on-surface);
  font-size: var(--md-sys-typescale-title-small-size);
  font-weight: var(--md-sys-typescale-title-small-weight);
  line-height: var(--md-sys-typescale-title-small-line-height);
}

.appearance-copy small {
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: var(--md-sys-typescale-body-small-line-height);
}

.palette-strip {
  display: flex;
  align-items: center;
  gap: var(--nova-space-2);
  padding: var(--nova-space-3) var(--nova-space-4);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
}

.palette-dot {
  width: 20px;
  height: 20px;
  border-radius: var(--md-sys-shape-corner-full);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-sys-color-outline) 28%, transparent);
}

.palette-primary { background: var(--md-sys-color-primary); }
.palette-secondary { background: var(--md-sys-color-secondary); }
.palette-tertiary { background: var(--md-sys-color-tertiary); }
.palette-success { background: var(--nova-color-success); }
.palette-warning { background: var(--nova-color-warning); }
.palette-error { background: var(--md-sys-color-error); }

.palette-caption {
  margin-left: auto;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-medium-size);
  font-weight: var(--md-sys-typescale-label-medium-weight);
  letter-spacing: var(--md-sys-typescale-label-medium-tracking);
}

.appearance-about {
  margin: 0;
  padding-top: var(--nova-space-3);
  border-top: 1px solid var(--nova-color-divider);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: var(--md-sys-typescale-body-small-line-height);
}

@media (max-width: 420px) {
  .appearance-section :deep(.ui-segmented-option) {
    padding-inline: var(--nova-space-2);
  }
}
</style>
