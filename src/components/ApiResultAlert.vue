<script setup lang="ts">
import type { HttpActionResult } from '../composables/useHttpAction'

const props = defineProps<{
  result: HttpActionResult | null
}>()
</script>

<template>
  <Transition name="api-alert">
    <div
      v-if="result"
      :key="`${result.ok}-${result.message}`"
      :class="['api-result-alert', result.ok ? 'api-result-alert--success' : 'api-result-alert--error']"
      role="alert"
    >
      <span class="alert-icon" :aria-label="result.ok ? 'Éxito' : 'Error'">
        {{ result.ok ? '✓' : '✕' }}
      </span>
      <span class="alert-message">{{ result.message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.api-result-alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  margin-top: 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  border-left: 4px solid;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.api-result-alert--success {
  background-color: #ecfdf5;
  border-color: #10b981;
  color: #065f46;
}

.api-result-alert--success .alert-icon {
  color: #10b981;
  font-weight: bold;
  font-size: 1.25rem;
}

.api-result-alert--error {
  background-color: #fef2f2;
  border-color: #ef4444;
  color: #7f1d1d;
}

.api-result-alert--error .alert-icon {
  color: #ef4444;
  font-weight: bold;
  font-size: 1.25rem;
}

.alert-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  width: 1.5rem;
  height: 1.5rem;
}

.alert-message {
  flex: 1;
  line-height: 1.5;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.api-alert-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.api-alert-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.api-alert-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.api-alert-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
