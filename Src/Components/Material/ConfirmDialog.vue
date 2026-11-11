<script setup lang="ts">
import UiButton from './UiButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from './AppDialog.vue'
import UiIcon from './UiIcon.vue'

const props = defineProps<{
  request: { message: string } | null
}>()

const emit = defineEmits<{ resolve: [confirmed: boolean] }>()
const { t } = useI18n()
const open = computed(() => Boolean(props.request))

function resolve(confirmed: boolean) {
  emit('resolve', confirmed)
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('common.confirmTitle')"
    small
    @close="resolve(false)"
  >
    <div class="confirm-copy">
      <div class="dialog-icon">
        <UiIcon name="warning" />
      </div>
      <p>{{ request?.message }}</p>
    </div>
    <template #actions>
      <UiButton type="button" class="btn btn-text" @click="resolve(false)">
        {{ t('common.cancel') }}
      </UiButton>
      <UiButton type="button" class="btn btn-danger" @click="resolve(true)">
        {{ t('common.confirm') }}
      </UiButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.confirm-copy {
  display: grid;
  gap: var(--nova-space-3);
  padding-bottom: var(--nova-space-2);
  text-align: center;
}

.confirm-copy p {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-large-size);
  line-height: var(--md-sys-typescale-body-large-line);
  overflow-wrap: anywhere;
}
</style>
