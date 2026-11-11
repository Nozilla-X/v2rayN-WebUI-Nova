<script setup lang="ts">
import { usePageRequests } from '../../UI/useUiRequests'

const props = defineProps<{ scope: string }>()
const { status } = usePageRequests(props.scope)
</script>

<template>
  <!-- Read/write progress is already shown by each control and by page-local
       loading states. Rendering it here as well inserted a banner between the
       toolbar and the table on every background refresh, shifting the page. -->
  <div v-if="status.error" class="page-feedback">
    <span class="field-error" role="alert">{{ status.error }}</span>
  </div>
</template>
