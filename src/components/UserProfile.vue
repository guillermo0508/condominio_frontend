<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/users'

const authStore = useAuthStore()
const userStore = useUserStore()

const password = ref('')
const passwordConfirmation = ref('')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const handleUpdatePassword = async () => {
  if (password.value !== passwordConfirmation.value) {
    errorMessage.value = 'Las contraseñas no coinciden'
    return
  }

  if (password.value.length < 8) {
    errorMessage.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (authStore.user) {
      await userStore.updateUser(authStore.user.id, {
        password: password.value,
        password_confirmation: passwordConfirmation.value
      })
      successMessage.value = '¡Contraseña actualizada correctamente!'
      password.value = ''
      passwordConfirmation.value = ''

      setTimeout(async () => {
        await authStore.logout()
        window.location.href = '/login'
      }, 2000)
    }
  } catch (error: any) {
    errorMessage.value = error.message || 'Error al actualizar la contraseña'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="profile-container">
    <div class="profile-card">
      <h2>Mi Perfil</h2>

      <div class="user-info">
        <p><strong>Nombre:</strong> {{ authStore.user?.name }}</p>
        <p><strong>Email:</strong> {{ authStore.user?.email }}</p>
        <p><strong>Rol:</strong> {{ authStore.user?.role === 'admin' ? 'Administrador' : 'Residente' }}</p>
      </div>

      <div class="password-section">
        <h3>Cambiar Contraseña</h3>
        <form @submit.prevent="handleUpdatePassword">
          <div class="form-group">
            <label for="password">Nueva Contraseña</label>
            <input
              v-model="password"
              type="password"
              id="password"
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>

          <div class="form-group">
            <label for="passwordConfirmation">Confirmar Contraseña</label>
            <input
              v-model="passwordConfirmation"
              type="password"
              id="passwordConfirmation"
              placeholder="Confirma la nueva contraseña"
              required
            />
          </div>

          <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>
          <div v-if="successMessage" class="success-msg">{{ successMessage }}<br>Serás redirigido al inicio de sesión...</div>

          <button type="submit" class="submit-btn" :disabled="isLoading">
            {{ isLoading ? 'Actualizando...' : 'Actualizar Contraseña' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100%;
}

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 2rem;
  width: 100%;
  max-width: 500px;
}

.profile-card h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #111827;
  font-size: 1.5rem;
  text-align: center;
}

.user-info {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.user-info p {
  margin: 0.5rem 0;
  color: #374151;
}

.password-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #111827;
  font-size: 1.2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #4b5563;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 1rem;
}

.submit-btn:hover:not(:disabled) {
  background: #4f46e5;
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.error-msg {
  color: #ef4444;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.success-msg {
  color: #10b981;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
}
</style>
