<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const props = defineProps<{
  token: string
  user: {
    id: number
    name: string
    email: string
  }
}>()

interface Notification {
  id: string
  type: string
  data: {
    title: string
    message: string
    details: any
  }
  created_at: string
  read_at?: string | null
}

const notifications = ref<Notification[]>([])
const isDropdownOpen = ref(false)
const selectedNotification = ref<Notification | null>(null)
const hasNewNotification = ref(false)
let echo: Echo<'reverb'> | null = null
let prevUnreadCount = 0

// Use authStore token as fallback if prop is empty
const effectiveToken = computed(() => props.token || authStore.token || '')
const effectiveUser = computed(() => (props.user?.id ? props.user : authStore.user) as { id: number; name: string; email: string })

const NOTIFICATIONS_STORAGE_KEY = computed(() => `notifications_${effectiveUser.value?.id}`)

// Required for Laravel Echo to work with Pusher/Reverb
window.Pusher = Pusher

const normalizeNotification = (notification: any): Notification => {
  const data = notification.data ?? notification

  return {
    id: notification.id,
    type: data.type ?? notification.type,
    data: {
      title: data.title ?? 'Notificación',
      message: data.message ?? '',
      details: data.details ?? {},
    },
    created_at: notification.created_at ?? new Date().toISOString(),
    read_at: notification.read_at ?? null,
  }
}

const saveNotificationsToStorage = () => {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY.value, JSON.stringify(notifications.value))
  } catch (e) {
    console.warn('Error saving notifications to localStorage', e)
  }
}

const loadNotificationsFromStorage = () => {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY.value)
    if (stored) {
      notifications.value = JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Error loading notifications from localStorage', e)
  }
}

const initEcho = () => {
  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'app-key',
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: 'http://localhost:8000/broadcasting/auth',
    auth: {
      headers: {
        Authorization: `Bearer ${effectiveToken.value}`,
      },
    },
  })

  // Laravel BroadcastNotificationCreated event is dispatched when broadcasting a notification
  echo
    .private(`App.Models.User.${effectiveUser.value?.id}`)
    .notification((notification: any) => {
      console.log('Notificación recibida por WebSockets:', notification)
      const normalized = normalizeNotification(notification)
      notifications.value.unshift(normalized)
      saveNotificationsToStorage()
      hasNewNotification.value = true
      setTimeout(() => { hasNewNotification.value = false }, 2000)
    })
    .error((err: any) => {
      console.error('Error Echo en notificaciones:', err)
    })
}

let notificationsPoll: number | null = null

const loadNotifications = async () => {
  try {
    const res = await fetch('http://localhost:8000/notifications', {
      headers: {
        Authorization: `Bearer ${effectiveToken.value}`,
      },
    })
    if (res.ok) {
      const data = await res.json()
      notifications.value = data.map(normalizeNotification)
      saveNotificationsToStorage()
    }
  } catch (e) {
    console.error('Error cargando notificaciones', e)
  }
}

const refreshNotifications = async () => {
  try {
    const res = await fetch('http://localhost:8000/notifications', {
      headers: {
        Authorization: `Bearer ${effectiveToken.value}`,
      },
    })
    if (!res.ok) {
      return
    }
    const data = await res.json()
    notifications.value = data.map(normalizeNotification)
    saveNotificationsToStorage()
  } catch (e) {
    console.error('Error refrescando notificaciones', e)
  }
}

const startNotificationPolling = () => {
  if (notificationsPoll) return
  notificationsPoll = window.setInterval(() => {
    refreshNotifications()
  }, 3000)
}

const markAsRead = async (id: string) => {
  try {
    await fetch(`http://localhost:8000/notifications/${id}/mark-as-read`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${effectiveToken.value}`,
      },
    })
    // Update local state
    const notif = notifications.value.find(n => n.id === id)
    if (notif) {
      notif.read_at = new Date().toISOString()
      saveNotificationsToStorage()
    }
  } catch (e) {
    console.error('Error marcando notificación como leída', e)
  }
}

const openNotification = (notif: Notification) => {
  selectedNotification.value = notif
  isDropdownOpen.value = false
  
  if (!notif.read_at) {
    notif.read_at = new Date().toISOString()
    saveNotificationsToStorage()
  }
  markAsRead(notif.id)
}

const closeNotification = () => {
  selectedNotification.value = null
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const unreadCount = computed(() => notifications.value.filter(n => !n.read_at).length)

// Watch for new unread notifications and trigger bell animation
watch(unreadCount, (newCount) => {
  if (newCount > prevUnreadCount) {
    hasNewNotification.value = true
    setTimeout(() => { hasNewNotification.value = false }, 2000)
  }
  prevUnreadCount = newCount
})

onMounted(() => {
  // Load from localStorage first for instant display
  loadNotificationsFromStorage()
  // Then sync with server
  loadNotifications()
  // Initialize real-time updates
  initEcho()
  startNotificationPolling()
})

onBeforeUnmount(() => {
  if (echo) {
    echo.disconnect()
  }
  if (notificationsPoll) {
    window.clearInterval(notificationsPoll)
  }
})
</script>

<template>
  <div class="notifications-wrapper">
    <!-- Bell Button -->
    <button :class="['bell-button', { 'bell-shake': hasNewNotification }]" @click="toggleDropdown" aria-label="Notifications">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" :stroke="unreadCount > 0 ? '#ef4444' : 'currentColor'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <span v-if="unreadCount > 0" class="badge pulse-animation">{{ unreadCount }}</span>
    </button>

    <!-- Dropdown Menu -->
    <div v-if="isDropdownOpen" class="dropdown-menu">
      <div class="dropdown-header">
        <h4>Notificaciones</h4>
      </div>
      <div v-if="notifications.length === 0" class="empty-state">
        <p>No hay notificaciones</p>
      </div>
      <div class="notification-list" v-else>
        <div 
          v-for="notif in notifications" 
          :key="notif.id" 
          :class="['notification-item', { read: notif.read_at }]"
          @click="openNotification(notif)"
        >
          <div class="notif-icon">
            <svg v-if="notif.type === 'mensaje'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <svg v-else-if="notif.type === 'multas'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
            <svg v-else-if="notif.type === 'asambleas'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg>
            <svg v-else-if="notif.type === 'pagos_atrasados'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          </div>
          <div class="notif-content">
            <div class="notif-title">{{ notif.data.title }}</div>
            <div class="notif-message">{{ notif.data.message }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="selectedNotification" class="modal-overlay" @click.self="closeNotification">
      <div class="modal-content fade-in">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <div class="modal-icon" :class="selectedNotification.type">
              <svg v-if="selectedNotification.type === 'mensaje'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <svg v-else-if="selectedNotification.type === 'multas'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
              <svg v-else-if="selectedNotification.type === 'asambleas'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
              <svg v-else-if="selectedNotification.type === 'pagos_atrasados'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <h3>{{ selectedNotification.data.title }}</h3>
          </div>
          <button class="close-btn" @click="closeNotification">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-msg">{{ selectedNotification.data.message }}</p>
          
          <div v-if="selectedNotification.data.details && Object.keys(selectedNotification.data.details).length > 0" class="details-box">
            <h4>Detalles Adicionales</h4>
            <div class="details-grid">
              <div class="detail-row" v-for="(val, key) in selectedNotification.data.details" :key="key">
                <span class="detail-key">{{ key }}</span>
                <span class="detail-val">{{ val }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" @click="closeNotification">Entendido</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-wrapper {
  position: relative;
  display: inline-block;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Bell Button */
.bell-button {
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
  padding: 8px;
  border-radius: 50%;
  color: #4b5563;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bell-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #111827;
}

.badge {
  position: absolute;
  top: 0px;
  right: 0px;
  background-color: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  border: 2px solid white;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.pulse-animation {
  animation: pulse 2s infinite;
}

@keyframes bell-shake {
  0%   { transform: rotate(0deg); }
  15%  { transform: rotate(15deg); }
  30%  { transform: rotate(-12deg); }
  45%  { transform: rotate(10deg); }
  60%  { transform: rotate(-8deg); }
  75%  { transform: rotate(5deg); }
  90%  { transform: rotate(-3deg); }
  100% { transform: rotate(0deg); }
}

.bell-shake svg {
  animation: bell-shake 0.6s ease-in-out;
  transform-origin: top center;
}

/* Dropdown */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: -10px;
  width: 320px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  z-index: 50;
  overflow: hidden;
  border: 1px solid #f3f4f6;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-header {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}

.dropdown-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
}

.notification-list {
  max-height: 350px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  padding: 16px;
  gap: 12px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.notification-item.read {
  opacity: 0.65;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-item:last-child {
  border-bottom: none;
}

.notif-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-content {
  flex: 1;
}

.notif-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.notif-message {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(17, 24, 39, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  width: 90%;
  max-width: 450px;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.fade-in {
  animation: fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #f3f4f6;
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-icon.mensaje { background: #e0e7ff; color: #4f46e5; }
.modal-icon.multas { background: #fee2e2; color: #dc2626; }
.modal-icon.asambleas { background: #d1fae5; color: #059669; }
.modal-icon.pagos_atrasados { background: #fef3c7; color: #d97706; }

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #4b5563;
}

.modal-body {
  padding: 24px;
}

.modal-msg {
  margin: 0 0 24px 0;
  font-size: 15px;
  color: #4b5563;
  line-height: 1.6;
}

.details-box {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
}

.details-box h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  font-weight: 600;
}

.details-grid {
  display: grid;
  gap: 10px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e5e7eb;
}

.detail-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-key {
  color: #6b7280;
  text-transform: capitalize;
}

.detail-val {
  color: #111827;
  font-weight: 500;
  text-align: right;
}

.modal-footer {
  padding: 16px 24px;
  background: #f9fafb;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f3f4f6;
}

.btn-primary {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #4338ca;
}
</style>
