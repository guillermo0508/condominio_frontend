<template>
  <div class="login-view">
    <div class="login-sidebar">
      <h2>Condominio</h2>
      <p>Tu portal de gestión residencial</p>
    </div>

    <div class="login-content">
      <div class="login-card">
        <h1>Iniciar Sesión</h1>
        <p class="subtitle">Accede a tu cuenta</p>

        <form @submit.prevent="handleLogin">
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

          <div class="form-group">
            <label for="password">Contraseña</label>
            <input
              v-model="password"
              id="password"
              type="password"
              placeholder="Tu contraseña"
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
            {{ isLoading ? 'Cargando...' : 'Ingresar' }}
          </button>
        </form>

        <p class="register-link">
          ¿No tienes cuenta? <router-link to="/register">Regístrate aquí</router-link>
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

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)

async function handleLogin() {
  error.value = null
  isLoading.value = true

  try {
    await authStore.login(email.value, password.value)
    router.push({ name: 'home' })
  } catch (err) {
    if (authStore.error && authStore.error.includes('Account is not verified')) {
      router.push({ name: 'verify-email', params: { email: email.value } })
    } else {
      error.value = authStore.error || 'Error al iniciar sesión'
    }
  } finally {
    isLoading.value = false
  }
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
