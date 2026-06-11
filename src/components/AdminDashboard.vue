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

// Monitor de cambios en sendingNotification
watch(sendingNotification, (newVal) => {
  console.log('👁️ sendingNotification cambió a:', newVal)
})

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

// State
const users = ref<ResidentUser[]>([])
const selectedAdminId = ref<number | ''>('')
const lastNotification = ref<{
  recipient: string
  type: string
  title: string
  message: string
  details: Record<string, string>
} | null>(null)

// Form state
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
    if (res.ok) {
      users.value = await res.json()
      selectedAdminId.value = currentAdmin.value?.id ?? ''
    }
  } catch (e) {
    console.error(e)
  }
}

const assignAdministrator = (userId = selectedAdminId.value) => {
  if (!userId) {
    assignResult.value = {
      ok: false,
      message: 'Selecciona un residente para asignarlo como administrador.',
    }
    return
  }

  selectedAdminId.value = userId

  return runAssignAdmin(async () => {
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
  })
}

const onTypeChange = () => {
  form.value.details = {}
  form.value.title = ''
}

const handleSubmitNotification = (e: Event) => {
  e.preventDefault()
  console.log('📤 Iniciando envío de notificación', { loading: sendingNotification.value })
  sendNotification()
}

const sendNotification = () => {
  console.log('📝 sendNotification llamado')
  if (!form.value.title || !form.value.message) {
    notifyResult.value = {
      ok: false,
      message: 'Por favor completa el título y el mensaje.',
    }
    return
  }

  console.log('📤 Llamando runSendNotification')
  runSendNotification(async () => {
    console.log('🌐 Dentro de runSendNotification, enviando HTTP')
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
      title: form.value.title,
      message: form.value.message,
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

    if (res.ok) {
      lastNotification.value = notificationSummary
      form.value.title = ''
      form.value.message = ''
      form.value.details = {}
      form.value.user_id = 'all'
      return { ok: true, message: 'Notificación enviada exitosamente.' }
    }

    const data = await res.json()
    return { ok: false, message: data.error || 'Error al enviar la notificación.' }
  })
}

onMounted(loadUsers)
</script>

<template>
  <div class="admin-layout">
    <!-- Top Bar -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="page-title">
          <span class="title-icon">🛡️</span>
          <div>
            <h1>Panel de Administración</h1>
            <p>Gestión de notificaciones del condominio</p>
          </div>
        </div>
      </div>
      <div class="topbar-right">
        <NotificationsButton :token="token" :user="user" />
        <div class="admin-badge">Admin</div>
        <div class="user-avatar">{{ user.name.charAt(0).toUpperCase() }}</div>
      </div>
    </header>

    <!-- Main content -->
    <div class="admin-body">

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon" style="background:#fee2e2;color:#ef4444;">⚠️</div>
          <div>
            <p class="stat-label">Multas</p>
            <p class="stat-value">Activo</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#d1fae5;color:#10b981;">📅</div>
          <div>
            <p class="stat-label">Asambleas</p>
            <p class="stat-value">Activo</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fef3c7;color:#f59e0b;">💰</div>
          <div>
            <p class="stat-label">Pagos</p>
            <p class="stat-value">Activo</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#ede9fe;color:#6366f1;">👥</div>
          <div>
            <p class="stat-label">Residentes</p>
            <p class="stat-value">{{ users.length }}</p>
          </div>
        </div>
      </div>

      <div class="form-card admin-card">
        <div class="form-card-header">
          <h2>Administrador del Condominio</h2>
          <p>El residente seleccionado podrá entrar al panel al iniciar sesión con su cuenta.</p>
        </div>

        <div class="admin-card-content">
          <div class="admin-picker">
            <div class="field-group">
              <label for="admin-select">Residente administrador</label>
              <select id="admin-select" v-model="selectedAdminId" class="field-input">
                <option disabled value="">Selecciona un residente</option>
                <option v-for="u in users" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.email }}){{ u.role === 'admin' ? ' - actual' : '' }}
                </option>
              </select>
            </div>
            <HttpActionButton
              class="assign-btn"
              type="button"
              :loading="assigningAdmin"
              loading-label="Guardando..."
              @click="() => assignAdministrator()"
            >
              Guardar administrador
            </HttpActionButton>
          </div>

          <ApiResultAlert :result="assignResult" />

          <div v-if="!users.length" class="empty-residents">
            No hay residentes registrados todavía.
          </div>
        </div>
      </div>

      <!-- Notification Form -->
      <div class="form-card">
        <div class="form-card-header">
          <h2>Enviar Notificación</h2>
          <p>Selecciona el tipo, destinatario y completa la información.</p>
        </div>

        <form @submit="handleSubmitNotification" class="notify-form">

          <!-- Type selector -->
          <div class="field-group">
            <label>Tipo de Notificación</label>
            <div class="type-selector">
              <button
                v-for="t in notificationTypes"
                :key="t.value"
                type="button"
                :class="['type-btn', { selected: form.type === t.value }]"
                :style="form.type === t.value ? { borderColor: t.color, background: t.color + '10' } : {}"
                @click="form.type = t.value; onTypeChange()"
              >
                <span class="type-icon">{{ t.icon }}</span>
                {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Destination -->
          <div class="field-group">
            <label for="user-select">Destinatario</label>
            <select id="user-select" v-model="form.user_id" class="field-input">
              <option value="all">📢 Todos los residentes</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                👤 {{ u.name }} ({{ u.email }})
              </option>
            </select>
          </div>

          <!-- Title -->
          <div class="field-group">
            <label for="notif-title">Título</label>
            <input
              id="notif-title"
              v-model="form.title"
              type="text"
              class="field-input"
              :placeholder="`Ej: ${selectedType?.label} - Depto 302`"
              required
            />
          </div>

          <!-- Message -->
          <div class="field-group">
            <label for="notif-message">Mensaje</label>
            <textarea
              id="notif-message"
              v-model="form.message"
              class="field-input"
              rows="3"
              placeholder="Descripción detallada de la notificación..."
              required
            ></textarea>
          </div>

          <!-- Dynamic extra fields -->
          <div v-if="extraFields.length > 0" class="extra-fields">
            <p class="extra-fields-label">Detalles adicionales</p>
            <div class="extra-fields-grid">
              <div v-for="field in extraFields" :key="field.key" class="field-group">
                <label :for="`detail-${field.key}`">{{ field.label }}</label>
                <input
                  :id="`detail-${field.key}`"
                  v-model="form.details[field.key]"
                  type="text"
                  class="field-input"
                  :placeholder="field.label"
                />
              </div>
            </div>
          </div>

          <!-- Submit -->
          <div class="form-footer">
            <ApiResultAlert :result="notifyResult" />
            <Transition name="api-alert">
              <div v-if="lastNotification && notifyResult?.ok" key="sent-summary" class="sent-summary">
              <h3>Notificación enviada a: {{ lastNotification.recipient }}</h3>
              <div class="sent-summary-grid">
                <div>
                  <span>Tipo</span>
                  <strong>{{ lastNotification.type }}</strong>
                </div>
                <div>
                  <span>Título</span>
                  <strong>{{ lastNotification.title }}</strong>
                </div>
              </div>
              <p>{{ lastNotification.message }}</p>
              <div v-if="Object.keys(lastNotification.details).length" class="sent-details">
                <div v-for="(value, key) in lastNotification.details" :key="key">
                  <span>{{ key }}</span>
                  <strong>{{ value }}</strong>
                </div>
              </div>
              </div>
            </Transition>
            <HttpActionButton
              type="submit"
              class="send-btn"
              :loading="sendingNotification"
              loading-label="Enviando..."
              :style="{ background: selectedType?.color }"
            >
              {{ selectedType?.icon }} Enviar Notificación
            </HttpActionButton>
          </div>
        </form>
      </div>

      <!-- Gestión de Usuarios CRUD -->
      <div class="form-card" style="overflow: visible;">
        <UserManagement />
      </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.admin-layout {
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #f9fafb;
}

/* Top Bar */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.title-icon {
  font-size: 2rem;
}

.page-title h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
}

.page-title p {
  margin: 2px 0 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.admin-badge {
  background: #4f46e5;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
}

/* Body */
.admin-body {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #e5e7eb;
}

.stat-icon {
  font-size: 1.5rem;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-label {
  margin: 0 0 2px 0;
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.stat-value {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
}

/* Form Card */
.form-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.admin-card {
  overflow: visible;
}

.form-card-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}

.form-card-header h2 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
}

.form-card-header p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.notify-form {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-card-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.admin-picker {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 1rem;
}

.empty-residents {
  color: #6b7280;
  font-size: 0.9rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.field-input {
  padding: 0.75rem 1rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #111827;
  background: white;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.field-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}

textarea.field-input {
  resize: vertical;
  min-height: 80px;
}

/* Type selector */
.type-selector {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #4b5563;
  transition: all 0.2s;
  font-family: inherit;
}

.type-btn:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.type-btn.selected {
  font-weight: 600;
  color: #111827;
}

.type-icon {
  font-size: 1.1rem;
}

/* Extra Fields */
.extra-fields {
  background: #f9fafb;
  border-radius: 10px;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
}

.extra-fields-label {
  margin: 0 0 1rem 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: #6b7280;
}

.extra-fields-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

/* Form Footer */
.form-footer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
}

.alert-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.alert-success {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.sent-summary {
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 1rem;
  color: #1e3a8a;
}

.sent-summary h3 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
}

.sent-summary-grid,
.sent-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.sent-summary span,
.sent-details span {
  display: block;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.sent-summary strong,
.sent-details strong {
  display: block;
  color: #0f172a;
  overflow-wrap: anywhere;
}

.sent-summary p {
  margin: 0.75rem 0 0;
  color: #1e293b;
  overflow-wrap: anywhere;
}

.sent-details {
  margin-top: 0.75rem;
  border-top: 1px solid #bfdbfe;
  padding-top: 0.75rem;
}

.send-btn {
  align-self: flex-end;
  padding: 0.875rem 2.5rem;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.2s, transform 0.1s;
  font-family: inherit;
}

.send-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.send-btn:active {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.assign-btn {
  padding: 0.75rem 1.5rem;
  background: #111827;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  min-height: 47px;
}

.assign-btn:hover:not(:disabled) {
  background: #1f2937;
}

.assign-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
