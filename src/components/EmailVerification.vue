<template>
  <div class="verification-container">
    <div class="verification-card">

      <template v-if="step === 'code'">
        <h1>✉️ Verifica tu Email</h1>
        <p class="subtitle">Ingresa el código de 6 dígitos que recibiste en <strong>{{ email }}</strong></p>

        <form @submit.prevent="handleVerify">
          <div class="code-input-group">
            <label for="code">Código de Verificación</label>
            <input
              v-model="code"
              id="code"
              type="text"
              placeholder="000000"
              maxlength="6"
              pattern="[0-9]{6}"
              inputmode="numeric"
              required
            />
            <small>Ingresa el código de 6 dígitos que recibiste en tu email</small>
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>
          <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

          <button type="submit" :disabled="isLoading" class="btn-primary">
            {{ isLoading ? 'Verificando...' : 'Verificar Email' }}
          </button>

          <div class="resend-section">
            <p>¿No recibiste el código?</p>
            <button
              type="button"
              @click="handleResend"
              :disabled="isResending || resendDisabled"
              class="btn-secondary"
            >
              {{ isResending ? 'Reenviando...' : resendDisabled ? `Reintentar en ${resendTimer}s` : 'Reenviar Código' }}
            </button>
          </div>
        </form>

        <div class="info-box">
          <p>El código expira en <strong>24 horas</strong></p>
        </div>
      </template>

      <template v-else-if="step === 'set-password'">
        <div class="step-header">
          <span class="step-icon">🔐</span>
          <h1>Crea tu Contraseña</h1>
          <p class="subtitle">¡Email verificado! Ahora elige una contraseña para tu cuenta, <strong>{{ verifiedUser?.name }}</strong>.</p>
        </div>

        <form @submit.prevent="handleSetPassword">
          <div class="code-input-group">
            <label for="password">Nueva Contraseña</label>
            <input
              v-model="password"
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              minlength="8"
              required
            />
          </div>

          <div class="code-input-group">
            <label for="password_confirmation">Confirmar Contraseña</label>
            <input
              v-model="passwordConfirmation"
              id="password_confirmation"
              type="password"
              placeholder="Repite tu contraseña"
              required
            />
            <small v-if="password && passwordConfirmation && password !== passwordConfirmation" class="mismatch">
              ⚠️ Las contraseñas no coinciden
            </small>
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>

          <button
            type="submit"
            :disabled="isLoading || (password !== passwordConfirmation)"
            class="btn-primary"
          >
            {{ isLoading ? 'Guardando...' : '✅ Guardar Contraseña e Ingresar' }}
          </button>
        </form>
      </template>

      <template v-else-if="step === 'done'">
        <div class="done-state">
          <span class="done-icon">🎉</span>
          <h1>¡Cuenta Activada!</h1>
          <p class="subtitle">Tu cuenta ha sido activada exitosamente. Redirigiendo...</p>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { getDeviceHeaders } from '@/utils/device'

interface Props {
  email: string
}

const props = defineProps<Props>()
const authStore = useAuthStore()
const router = useRouter()

const step = ref<'code' | 'set-password' | 'done'>('code')
const code = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const isLoading = ref(false)
const isResending = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const resendDisabled = ref(false)
const resendTimer = ref(0)
const setupToken = ref<string | null>(null)
const verifiedUser = ref<{ id: number; name: string; email: string } | null>(null)
let resendInterval: number | null = null

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

onMounted(() => {
  const lastResendTime = localStorage.getItem('lastResendTime')
  if (lastResendTime) {
    const timeDiff = Math.floor((Date.now() - parseInt(lastResendTime)) / 1000)
    if (timeDiff < 60) {
      resendDisabled.value = true
      resendTimer.value = 60 - timeDiff
      startResendTimer()
    }
  }
})

onUnmounted(() => {
  if (resendInterval) clearInterval(resendInterval)
})

function startResendTimer() {
  if (resendInterval) clearInterval(resendInterval)
  resendInterval = window.setInterval(() => {
    resendTimer.value--
    if (resendTimer.value <= 0) {
      resendDisabled.value = false
      if (resendInterval) clearInterval(resendInterval)
    }
  }, 1000)
}

async function handleVerify() {
  error.value = null

  if (code.value.length !== 6) {
    error.value = 'El código debe tener 6 dígitos'
    return
  }

  isLoading.value = true

  try {
    const response = await fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: props.email, code: code.value }),
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data.message || 'Error al verificar el email'
      return
    }

    if (data.needs_password && data.setup_token) {
      setupToken.value = data.setup_token
      verifiedUser.value = data.user
      step.value = 'set-password'
      return
    }

    successMessage.value = 'Email verificado correctamente. Redirigiendo...'
    step.value = 'done'
    setTimeout(() => router.push({ name: 'login' }), 2000)
  } catch (err) {
    error.value = 'Error de conexión. Intenta de nuevo.'
  } finally {
    isLoading.value = false
  }
}

async function handleSetPassword() {
  error.value = null

  if (password.value !== passwordConfirmation.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  if (!setupToken.value) {
    error.value = 'Token de configuración inválido. Por favor vuelve a verificar tu email.'
    return
  }

  isLoading.value = true

  try {
    const response = await fetch(`${API_URL}/auth/set-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${setupToken.value}`,
        ...getDeviceHeaders(),
      },
      body: JSON.stringify({
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data.message || 'Error al establecer la contraseña'
      return
    }

    authStore.setSession(data.access_token, data.user)
    step.value = 'done'
    setTimeout(() => router.push({ name: 'home' }), 2000)
  } catch (err) {
    error.value = 'Error de conexión. Intenta de nuevo.'
  } finally {
    isLoading.value = false
  }
}

async function handleResend() {
  error.value = null
  isResending.value = true

  try {
    await authStore.resendVerificationCode(props.email)
    successMessage.value = 'Código reenviado a tu email'
    code.value = ''

    localStorage.setItem('lastResendTime', Date.now().toString())
    resendDisabled.value = true
    resendTimer.value = 60
    startResendTimer()
  } catch (err) {
    error.value = authStore.error || 'Error al reenviar el código'
  } finally {
    isResending.value = false
  }
}
</script>

<style scoped>
.verification-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.verification-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  padding: 40px;
  max-width: 440px;
  width: 100%;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

h1 {
  color: #1f2937;
  margin-bottom: 10px;
  text-align: center;
  font-size: 1.75rem;
}

.subtitle {
  color: #6b7280;
  text-align: center;
  margin-bottom: 30px;
  font-size: 14px;
  line-height: 1.6;
}

.step-header {
  text-align: center;
  margin-bottom: 28px;
}

.step-icon {
  font-size: 48px;
  display: block;
  text-align: center;
  margin-bottom: 12px;
}

.code-input-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 8px;
  color: #374151;
  font-weight: 600;
  font-size: 14px;
}

input[type="text"],
input[type="password"] {
  padding: 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 16px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

input[id="code"] {
  font-size: 24px;
  text-align: center;
  letter-spacing: 8px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

small {
  color: #9ca3af;
  margin-top: 6px;
  font-size: 12px;
}

small.mismatch {
  color: #dc2626;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  border-left: 4px solid #dc2626;
  font-size: 14px;
}

.success-message {
  background: #f0fdf4;
  color: #16a34a;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  border-left: 4px solid #16a34a;
  font-size: 14px;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  margin-bottom: 20px;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.45);
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.resend-section {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
}

.resend-section p {
  color: #6b7280;
  margin-bottom: 10px;
  font-size: 14px;
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: #667eea;
  color: white;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-box {
  background: #f0f4ff;
  border-left: 4px solid #667eea;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 20px;
}

.info-box p {
  color: #4b5563;
  font-size: 13px;
  margin: 0;
}

.done-state {
  text-align: center;
  padding: 20px 0;
}

.done-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}
</style>
