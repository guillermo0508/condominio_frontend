<template>
  <div class="login-view">
    <div class="login-sidebar">
      <h2>Condominio</h2>
      <p>Tu portal de gestión residencial</p>
    </div>

    <div class="login-content">
      <div class="login-card">
        <h1>Recuperar Contraseña</h1>
        <p class="subtitle" v-if="step === 1">Ingresa tu correo para recibir un código de recuperación</p>
        <p class="subtitle" v-else-if="step === 2">Ingresa el código que enviamos a tu correo y tu nueva contraseña</p>
        <p class="subtitle" v-else>¡Contraseña restablecida con éxito!</p>

        <!-- Step 1: Request Code -->
        <form @submit.prevent="handleRequestCode" v-if="step === 1">
          <div class="form-group">
            <label for="email">Correo Electrónico</label>
            <input
              v-model="email"
              id="email"
              type="email"
              placeholder="correo@example.com"
              required
            />
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>
          <div v-if="successMessage" class="success-message">
            {{ successMessage }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="btn-primary"
          >
            {{ isLoading ? 'Enviando...' : 'Enviar Código' }}
          </button>
        </form>

        <!-- Step 2: Reset Password -->
        <form @submit.prevent="handleResetPassword" v-else-if="step === 2">
          <div class="form-group">
            <label for="code">Código de 6 dígitos</label>
            <input
              v-model="code"
              id="code"
              type="text"
              placeholder="000000"
              required
              maxlength="6"
              style="letter-spacing: 4px; text-align: center; font-size: 1.2rem; font-weight: bold;"
            />
          </div>

          <div class="form-group">
            <label for="password">Nueva Contraseña</label>
            <input
              v-model="password"
              id="password"
              type="password"
              placeholder="Nueva contraseña"
              required
            />
          </div>

          <div class="form-group">
            <label for="passwordConfirmation">Confirmar Nueva Contraseña</label>
            <input
              v-model="passwordConfirmation"
              id="passwordConfirmation"
              type="password"
              placeholder="Confirma la nueva contraseña"
              required
            />
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="btn-primary"
          >
            {{ isLoading ? 'Restableciendo...' : 'Restablecer Contraseña' }}
          </button>
        </form>

        <!-- Step 3: Success -->
        <div v-else class="success-container">
          <div class="success-message" style="margin-bottom: 20px;">
            Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.
          </div>
          <button @click="goToLogin" class="btn-primary">
            Ir a Iniciar Sesión
          </button>
        </div>

        <p class="register-link" v-if="step !== 3">
          ¿Recordaste tu contraseña? <router-link to="/login">Inicia Sesión</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const step = ref(1)
const email = ref('')
const code = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)

async function handleRequestCode() {
  error.value = null
  successMessage.value = null
  isLoading.value = true

  try {
    const res = await authStore.forgotPassword(email.value)
    successMessage.value = res.message || 'Código enviado.'
    step.value = 2
  } catch (err) {
    error.value = authStore.error || 'Error al solicitar recuperación'
  } finally {
    isLoading.value = false
  }
}

async function handleResetPassword() {
  error.value = null
  isLoading.value = true

  if (password.value !== passwordConfirmation.value) {
    error.value = 'Las contraseñas no coinciden'
    isLoading.value = false
    return
  }

  try {
    await authStore.resetPassword(email.value, code.value, password.value, passwordConfirmation.value)
    step.value = 3
  } catch (err) {
    error.value = authStore.error || 'Error al restablecer contraseña'
  } finally {
    isLoading.value = false
  }
}

function goToLogin() {
  router.push({ name: 'login' })
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  background: #f4f5f7;
}

.login-sidebar {
  width: 250px;
  background: #111827;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  flex-shrink: 0;
}

.login-sidebar h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  letter-spacing: 1px;
}

.login-sidebar p {
  color: #9ca3af;
  text-align: center;
  font-size: 1.1rem;
}

.login-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 40px;
  max-width: 400px;
  width: 100%;
}

h1 {
  color: #111827;
  margin-bottom: 8px;
  text-align: center;
  font-size: 1.75rem;
}

.subtitle {
  color: #6b7280;
  text-align: center;
  margin-bottom: 30px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 8px;
  color: #374151;
  font-weight: 500;
  font-size: 0.95rem;
}

input {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s;
  background-color: #f9fafb;
}

input:focus {
  outline: none;
  border-color: #111827;
  background-color: white;
  box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.1);
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
  border-left: 4px solid #ef4444;
}

.success-message {
  background: #f0fdf4;
  color: #166534;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
  border-left: 4px solid #22c55e;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #111827;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 20px;
}

.btn-primary:hover:not(:disabled) {
  background: #1f2937;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.register-link {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

.register-link a {
  color: #111827;
  text-decoration: none;
  font-weight: 600;
}

.register-link a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .login-view {
    flex-direction: column;
  }
  .login-sidebar {
    width: 100%;
    padding: 3rem 2rem;
  }
}
</style>
