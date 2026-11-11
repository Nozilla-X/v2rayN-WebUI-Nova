<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from './UiIcon.vue'

interface ToastEntry {
  id: number
  message: string
  kind: string
}

const props = defineProps<{
  toasts: ToastEntry[]
  closeLabel: string
}>()

const emit = defineEmits<{ dismiss: [id: number] }>()

const iconFor = computed<Record<string, string>>(() => ({
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
}))
</script>

<template>
  <Teleport to="body">
    <div class="toast-viewport" role="status" aria-live="polite" aria-atomic="false">
      <div
        v-for="toast in props.toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.kind}`"
      >
        <UiIcon :name="iconFor[toast.kind] || 'info'" />
        <span class="toast-message">{{ toast.message }}</span>
        <button
          type="button"
          class="icon-btn"
          :aria-label="closeLabel"
          :title="closeLabel"
          @click="emit('dismiss', toast.id)"
        >
          <UiIcon name="close" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
