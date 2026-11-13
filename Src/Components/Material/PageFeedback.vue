<script setup lang="ts">
import { watch } from 'vue'
import { useNovaApp } from '../../App/context'
import { usePageRequests } from '../../UI/useUiRequests'

const props = defineProps<{ scope: string }>()
const { status } = usePageRequests(props.scope)
const app = useNovaApp()

// Request errors belong to the global toast channel. A banner rendered between
// the toolbar and the content shifted the whole page whenever a request failed.
// Write failures are already reported by the action that issued them, so only
// read failures need this fallback.
watch(
  () => [status.error, status.errorFromWrite] as const,
  ([message, fromWrite]) => {
    if (message && !fromWrite) app.feedback.showNotice(message, 'error')
  },
  { immediate: true },
)
</script>

<template>
  <!-- Page-scope errors are announced through the global toast viewport. -->
</template>
