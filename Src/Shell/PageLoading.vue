<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div class="loading-state" role="status">
    <span class="spinner" />
    <span>{{ t('common.loading') }}</span>
  </div>
</template>
