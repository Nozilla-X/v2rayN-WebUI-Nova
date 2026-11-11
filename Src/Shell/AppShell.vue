<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DesktopSidebar from './DesktopSidebar.vue'
import AppTopBar from './AppTopBar.vue'
import MobileTopBar from './MobileTopBar.vue'
import MobileTabBar from './MobileTabBar.vue'
import MobileBackButton from './MobileBackButton.vue'
import { useNovaApp } from '../App/context'

const { t } = useI18n()
const app = useNovaApp()
const railed = ref(false)
const workspaceScroll = ref<HTMLElement | null>(null)
const workspace = ref<HTMLElement | null>(null)

function readRailed(): boolean {
  try { return localStorage.getItem('v2rayn-nova-nav-railed') === 'true' } catch { return false }
}

function toggleRail() {
  railed.value = !railed.value
  try { localStorage.setItem('v2rayn-nova-nav-railed', String(railed.value)) } catch { /* per-session fallback */ }
}

function focusWorkspace() {
  workspace.value?.focus({ preventScroll: false })
}

async function scrollToTop() {
  await nextTick()
  if (window.matchMedia('(max-width: 860px)').matches) {
    window.scrollTo({ top: 0, behavior: 'instant' })
    workspaceScroll.value?.scrollTo({ top: 0, behavior: 'instant' })
  } else {
    workspaceScroll.value?.scrollTo({ top: 0, behavior: 'auto' })
  }
}

onMounted(() => { railed.value = readRailed() })
watch(() => app.route.currentPage.value, () => { void scrollToTop() })
</script>

<template>
  <a class="skip-link" href="#workspace" @click.prevent="focusWorkspace">{{ t('polish.skipContent') }}</a>
  <div class="app-shell" :class="{ 'is-railed': railed }">
    <DesktopSidebar :railed="railed" @toggle-rail="toggleRail" />

    <div class="app-main">
      <AppTopBar />
      <MobileTopBar />
      <div ref="workspaceScroll" class="workspace-scroll">
        <main id="workspace" ref="workspace" class="workspace" tabindex="-1">
          <slot />
        </main>
      </div>
    </div>

    <MobileTabBar />
    <MobileBackButton />
  </div>
</template>
