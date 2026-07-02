<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHttpAction } from '../composables/useHttpAction'
import HttpActionButton from './HttpActionButton.vue'
import ApiResultAlert from './ApiResultAlert.vue'
import NotificationsButton from './NotificationsButton.vue'
import UserManagement from './UserManagement.vue'

const {
  loading: assigningAdmin,
  result: assignResult,
  run: runAssignAdmin,
} = useHttpAction()
const {
  loading: sendingNotification,
  result: notifyResult,
  run: runSendNotification,
} = useHttpAction()



const props = defineProps<{
  token: string
  user: {
    id: number
    name: string
    email: string
    is_admin?: boolean
  }
}>()

interface ResidentUser {
  id: number
  name: string
  email: string
  role?: string
  is_admin?: boolean
}

const users = ref<ResidentUser[]>([])
const selectedAdminId = ref<number | ''>('')
const lastNotification = ref<{
  recipient: string
  type: string
  title: string
  message: string
  details: Record<string, string>
} | null>(null)

const form = ref({
  user_id: 'all',
  type: 'multas',
  title: '',
  message: '',
  details: {} as Record<string, string>
})

const notificationTypes = [
  { value: 'multas', label: 'Multa', icon: '⚠️', color: '#ef4444' },
  { value: 'asambleas', label: 'Asamblea', icon: '📅', color: '#10b981' },
  { value: 'pagos_atrasados', label: 'Pago Atrasado', icon: '💰', color: '#f59e0b' },
]

const selectedType = computed(() => notificationTypes.find(t => t.value === form.value.type))
const currentAdmin = computed(() => users.value.find(u => u.role === 'admin'))
const selectedRecipient = computed(() => {
  if (form.value.user_id === 'all') return 'Todos los residentes'

  const user = users.value.find(u => String(u.id) === String(form.value.user_id))
  return user ? `${user.name} (${user.email})` : 'Residente seleccionado'
})

const extraFields = computed(() => {
  if (form.value.type === 'multas') return [{ key: 'monto', label: 'Monto (MXN)' }, { key: 'infraccion', label: 'Infracción' }]
  if (form.value.type === 'pagos_atrasados') return [{ key: 'monto', label: 'Monto adeudado (MXN)' }, { key: 'vencimiento', label: 'Fecha de Vencimiento' }]
  if (form.value.type === 'asambleas') return [{ key: 'fecha', label: 'Fecha y Hora' }, { key: 'lugar', label: 'Lugar' }]
  return []
})

const loadUsers = async () => {
  try {
    const res = await fetch('http://localhost:8000/admin/users', {
      headers: { Authorization: `Bearer ${props.token}` },
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    users.value = await res.json()
    selectedAdminId.value = currentAdmin.value?.id ?? ''
  } catch (error) {
    console.error('Error loading users:', error)
    assignResult.value = {
      ok: false,
      message: 'Error al cargar los usuarios.',
    }
  }
}

const assignAdministrator = (userId = selectedAdminId.value) => {
  if (!userId || isNaN(Number(userId))) {
    assignResult.value = {
      ok: false,
      message: 'Selecciona un residente válido para asignarlo como administrador.',
    }
    return
  }

  if (assigningAdmin.value) return

  selectedAdminId.value = userId

  return runAssignAdmin(async () => {
    try {
      const res = await fetch('http://localhost:8000/admin/assign-administrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${props.token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { ok: false, message: data.error || 'No se pudo asignar el administrador.' }
      }

      users.value = users.value.map(u => ({
        ...u,
        role: u.id === data.user.id ? 'admin' : 'resident',
        is_admin: u.id === data.user.id,
      }))

      return {
        ok: true,
        message: `${data.user.name} ahora es el administrador del condominio.`,
      }
    } catch (error) {
      return { ok: false, message: 'Error de conexión. Intenta nuevamente.' }
    }
  })
}

const onTypeChange = () => {
  form.value.details = {}
  form.value.title = ''
}

const handleSubmitNotification = (e: Event) => {
  e.preventDefault()
  sendNotification()
}

const sendNotification = () => {
  if (sendingNotification.value) return
  
  if (!form.value.title || !form.value.title.trim() || !form.value.message || !form.value.message.trim()) {
    notifyResult.value = {
      ok: false,
      message: 'Por favor completa el título y el mensaje.',
    }
    return
  }

  runSendNotification(async () => {
    try {
      lastNotification.value = null

      const notificationSummary = {
        recipient: selectedRecipient.value,
        type: selectedType.value?.label ?? form.value.type,
        title: form.value.title,
        message: form.value.message,
        details: { ...form.value.details },
      }

      const payload = {
        user_id: form.value.user_id,
        type: form.value.type,
        title: form.value.title.trim(),
        message: form.value.message.trim(),
        details: Object.keys(form.value.details).length > 0 ? form.value.details : undefined,
      }

      const res = await fetch('http://localhost:8000/admin/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${props.token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        return { ok: false, message: data.error || 'Error al enviar la notificación.' }
      }

      lastNotification.value = notificationSummary
      form.value.title = ''
      form.value.message = ''
      form.value.details = {}
      form.value.user_id = 'all'
      return { ok: true, message: 'Notificación enviada exitosamente.' }
    } catch (error) {
      return { ok: false, message: 'Error de conexión. Intenta nuevamente.' }
    }
  })
}

onMounted(loadUsers)
</script>

<template>
  <div class="admin-container">
    <div class="dashboard-header">
      <div class="header-content">
        <h1>Panel de Administración</h1>
        <p>Control central y gestión del condominio</p>
      </div>
    </div>

    <div class="admin-grid">
      <!-- Columna Izquierda: Admin Actual y Asignar Admin -->
      <div class="ui-card">
        <div class="card-title-group">
          <h2>Gestión de Administrador</h2>
        </div>
        
        <div class="info-section">
          <h3>Administrador Actual</h3>
          <div class="info-box">
            <div class="avatar">{{ currentAdmin?.name.charAt(0).toUpperCase() || '?' }}</div>
            <div class="info-text">
              <p class="name">{{ currentAdmin?.name || 'No asignado' }}</p>
              <p class="email">{{ currentAdmin?.email || '-' }}</p>
            </div>
          </div>
        </div>

        <div class="form-section separator">
          <h3>Reasignar Administrador</h3>
          <div class="form-group">
            <label for="admin-select">Selecciona un residente</label>
            <div class="select-wrapper">
              <select id="admin-select" v-model="selectedAdminId" class="field-input">
                <option disabled value="">-- Selecciona un residente --</option>
                <option v-for="u in users" :key="u.id" :value="u.id">
                  {{ u.name }}{{ u.role === 'admin' ? ' (actual)' : '' }}
                </option>
              </select>
            </div>
          </div>
          <HttpActionButton
            class="btn-action primary-btn"
            type="button"
            :loading="assigningAdmin"
            loading-label="Guardando..."
            @click="() => assignAdministrator()"
          >
            Asignar Administrador
          </HttpActionButton>
          <ApiResultAlert :result="assignResult" class="mt-3" />
        </div>
      </div>

      <!-- Columna Derecha: Enviar Notificaciones -->
      <div class="ui-card">
        <div class="card-title-group">
          <h2>Centro de Notificaciones</h2>
        </div>
        
        <form @submit="handleSubmitNotification" class="notification-form">
          <div class="form-group">
            <label>Tipo de Notificación</label>
            <div class="type-buttons">
              <button
                v-for="t in notificationTypes"
                :key="t.value"
                type="button"
                :class="['type-btn', { active: form.type === t.value }]"
                @click="form.type = t.value; onTypeChange()"
              >
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="user-select">Destinatario</label>
            <div class="select-wrapper">
              <select id="user-select" v-model="form.user_id" class="field-input">
                <option value="all">Todos los residentes</option>
                <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="notif-title">Título</label>
            <input
              id="notif-title"
              v-model="form.title"
              type="text"
              class="field-input"
              placeholder="Ej: Multa - Depto 302"
              required
            />
          </div>

          <div class="form-group">
            <label for="notif-message">Mensaje</label>
            <textarea
              id="notif-message"
              v-model="form.message"
              class="field-input"
              rows="3"
              placeholder="Escribe los detalles aquí..."
              required
            ></textarea>
          </div>

          <transition-group name="fade">
            <div v-if="extraFields.length > 0" class="extra-fields" key="extra">
              <div v-for="field in extraFields" :key="field.key" class="form-group">
                <label :for="`detail-${field.key}`">{{ field.label }}</label>
                <input
                  :id="`detail-${field.key}`"
                  v-model="form.details[field.key]"
                  type="text"
                  class="field-input"
                  required
                />
              </div>
            </div>
          </transition-group>

          <ApiResultAlert :result="notifyResult" class="mt-3" />
          <HttpActionButton
            type="submit"
            class="btn-action primary-btn full-width"
            :loading="sendingNotification"
            loading-label="Enviando..."
          >
            Enviar Notificación
          </HttpActionButton>
        </form>
      </div>

      <!-- Gestión de Usuarios (Ocupa todo el ancho) -->
      <div class="ui-card table-card full-width">
        <div class="card-title-group">
          <h2>Gestión de Usuarios</h2>
        </div>
        <div class="mt-4">
          <UserManagement />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.admin-container {
  padding: 2.5rem;
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: 'Inter', sans-serif;
  color: #0f172a;
  overflow-y: auto;
}

.dashboard-header {
  margin-bottom: 2rem;
  padding: 0 0.5rem;
}

.header-content h1 {
  font-size: 1.875rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.025em;
}

.header-content p {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  max-width: 1200px;
}

.table-card.full-width {
  grid-column: 1 / -1;
}

.ui-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
}

.card-title-group {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1rem;
}

.card-title-group h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: #0f172a;
}

.info-section h3, .form-section h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 1rem;
}

.info-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8fafc;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 9999px;
  background: #e0e7ff;
  color: #4338ca;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
}

.info-text p {
  margin: 0;
}

.info-text .name {
  font-weight: 500;
  color: #0f172a;
  font-size: 1rem;
}

.info-text .email {
  color: #64748b;
  font-size: 0.875rem;
  margin-top: 0.125rem;
}

.separator {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px dashed #e2e8f0;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
  margin-bottom: 0.5rem;
}

.field-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  font-family: inherit;
  font-size: 0.95rem;
  color: #0f172a;
  box-sizing: border-box;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.field-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

textarea.field-input {
  resize: vertical;
  min-height: 100px;
}

.select-wrapper {
  position: relative;
}

.select-wrapper::after {
  content: "▼";
  font-size: 0.6rem;
  color: #64748b;
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.select-wrapper select {
  appearance: none;
  padding-right: 2rem;
}

.type-buttons {
  display: flex;
  gap: 0.75rem;
}

.type-btn {
  flex: 1;
  padding: 0.625rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  transition: all 0.15s ease-in-out;
}

.type-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.type-btn.active {
  background: #eef2ff;
  color: #4338ca;
  border-color: #a5b4fc;
}

.extra-fields {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  margin-bottom: 1.25rem;
}

.btn-action {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.primary-btn {
  background-color: #4f46e5;
  color: #ffffff;
}

.primary-btn:hover:not(:disabled) {
  background-color: #4338ca;
}

.primary-btn:active:not(:disabled) {
  background-color: #3730a3;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.full-width {
  width: 100%;
}

.mt-3 {
  margin-top: 1rem;
}
.mt-4 {
  margin-top: 1.5rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@media (max-width: 1024px) {
  .admin-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .admin-container {
    padding: 1rem;
  }
  .ui-card {
    padding: 1.5rem;
  }
  .type-buttons {
    flex-direction: column;
  }
}
</style>
