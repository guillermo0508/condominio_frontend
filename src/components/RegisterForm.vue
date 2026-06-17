<template>
  <div class="register-container">
    <div class="register-sidebar">
      <h2>Condominio</h2>
      <p>Tu portal de gestión residencial</p>
    </div>

    <div class="register-content">
      <div class="register-card">
        <h1>Crear Cuenta</h1>
        <p class="subtitle">Regístrate en nuestra plataforma</p>

        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="name">Nombre Completo</label>
            <input
              v-model="form.name"
              id="name"
              type="text"
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div class="form-group">
            <label for="email">Correo Electrónico</label>
            <input
              v-model="form.email"
              id="email"
              type="email"
              placeholder="correo@example.com"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <input
              v-model="form.password"
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              required
            />
            <small>Debe tener al menos 8 caracteres</small>
          </div>

          <div class="form-group">
            <label for="passwordConfirmation">Confirmar Contraseña</label>
            <input
              v-model="form.passwordConfirmation"
              id="passwordConfirmation"
              type="password"
              placeholder="Confirma tu contraseña"
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
            {{ isLoading ? 'Registrando...' : 'Registrarse' }}
          </button>
        </form>

        <p class="login-link">
          ¿Ya tienes cuenta? <router-link to="/login">Inicia sesión aquí</router-link>
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

const form = ref({
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
})

const isLoading = ref(false)
const error = ref<string | null>(null)

async function handleRegister() {
  error.value = null

  if (form.value.password !== form.value.passwordConfirmation) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  isLoading.value = true

  try {
    await authStore.register(
      form.value.name,
      form.value.email,
      form.value.password,
      form.value.passwordConfirmation,
    )

    router.push({
      name: 'verify-email',
      params: { email: form.value.email },
    })
  } catch (err) {
    error.value = authStore.error || 'Error al registrar'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  background: #f4f5f7;
}

.register-sidebar {
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

.register-sidebar h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  letter-spacing: 1px;
}

.register-sidebar p {
  color: #9ca3af;
  text-align: center;
  font-size: 1.1rem;
}

.register-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.register-card {
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

small {
  color: #9ca3af;
  margin-top: 4px;
  font-size: 12px;
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

.login-link {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

.login-link a {
  color: #111827;
  text-decoration: none;
  font-weight: 600;
}

.login-link a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .register-container {
    flex-direction: column;
  }
  .register-sidebar {
    width: 100%;
    padding: 3rem 2rem;
  }
}
</style>
