<script setup lang="ts">
defineProps<{
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
}>()
</script>

<template>
  <button v-bind="$attrs" :disabled="loading || disabled" :class="['http-action-button', { loading }]">
    <Transition name="btn-state" mode="out-in">
      <span v-if="loading" key="loading" class="btn-loading">
        <span class="btn-spinner" aria-hidden="true" />
        <span class="loading-text">{{ loadingLabel ?? 'CARGANDO' }}</span>
      </span>
      <span v-else key="idle" class="btn-idle">
        <slot />
      </span>
    </Transition>
  </button>
</template>

<style scoped>
.http-action-button {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.http-action-button:disabled {
  cursor: not-allowed;
}

.http-action-button:disabled.loading {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1) !important;
}

.btn-idle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.btn-loading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-weight: 500;
}

.loading-text {
  font-weight: 600;
  letter-spacing: 0.05em;
}

/* Spinner - Círculo animado */
.btn-spinner {
  display: inline-block;
  width: 1.2em;
  height: 1.2em;
  border: 3px solid;
  border-color: currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin-loader 0.8s linear infinite;
  opacity: 0.8;
}

@keyframes spin-loader {
  to {
    transform: rotate(360deg);
  }
}

/* Transiciones suaves para cambio de estado */
.btn-state-enter-active,
.btn-state-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-state-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.btn-state-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
