<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useHttpAction } from '../composables/useHttpAction'
import HttpActionButton from './HttpActionButton.vue'
import ApiResultAlert from './ApiResultAlert.vue'
import NotificationsButton from './NotificationsButton.vue'

const { loading: sendingMessage, result: sendResult, run: runSend } = useHttpAction()

interface Message {
  id: number
  userName: string
  message: string
  time: string
  date: string
  lastSeenAt: string | null
  profilePictureUrl: string | null
  status?: 'sending' | 'sent'
}

const props = defineProps<{
  token: string
  user: {
    id: number
    name: string
    email: string
    profile_picture_url?: string | null
  }
}>()

const emit = defineEmits<{
  logout: []
}>()

const messages = ref<Message[]>([])
const chatUsers = ref<any[]>([])
const showUsersModal = ref(false)
const input = ref('')
const error = ref('')
const typingUsers = ref<string[]>([])

let echo: Echo<'reverb'> | null = null
let messageId = 0
let pollInterval: number | null = null

const messagesContainer = ref<HTMLElement | null>(null)

window.Pusher = Pusher

const getLocalDateString = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateLabel = (dateStr: string) => {
  const today = new Date()
  const [year, month, day] = dateStr.split('-')
  const msgDate = new Date(Number(year), Number(month) - 1, Number(day))
  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
  
  if (isSameDay(msgDate, today)) return 'Hoy'
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(msgDate, yesterday)) return 'Ayer'
  
  return msgDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatLastSeen = (lastSeenString: string | null) => {
  if (!lastSeenString) return 'hace un tiempo'
  const lastSeen = new Date(lastSeenString)
  const today = new Date()
  
  const diffInMinutes = (today.getTime() - lastSeen.getTime()) / 60000
  if (diffInMinutes < 3) {
    return 'En línea'
  }

  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
  
  const timeStr = lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isSameDay(lastSeen, today)) {
    return `hoy a las ${timeStr}`
  }
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(lastSeen, yesterday)) {
    return `ayer a las ${timeStr}`
  }

  return `${lastSeen.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} a las ${timeStr}`
}

const groupedMessages = computed(() => {
  const groups: Record<string, Message[]> = {}
  messages.value.forEach(msg => {
    if (!groups[msg.date]) {
      groups[msg.date] = []
    }
    groups[msg.date].push(msg)
  })
  return Object.keys(groups).map(date => ({
    date,
    label: formatDateLabel(date),
    messages: groups[date]
  }))
})

window.Pusher = Pusher

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
        Authorization: `Bearer ${props.token}`,
      },
    },
  })

  const channel = echo.private('department')

  channel
    .listen('.message.sent', (data: any) => {
      console.log('Mensaje recibido:', data)

      if (data.userId === props.user.id) {
        return
      }

      const now = new Date()
      messages.value.push({
        id: ++messageId,
        userName: data.userName || props.user.name,
        message: data.message,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: getLocalDateString(now),
        lastSeenAt: now.toISOString(),
        profilePictureUrl: data.profilePictureUrl || null
      })

      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop =
            messagesContainer.value.scrollHeight
        }
      })
    })
    .listenForWhisper('typing', (e: any) => {
      if (e.name) {
        if (!typingUsers.value.includes(e.name)) {
          typingUsers.value.push(e.name)
        }
        setTimeout(() => {
          typingUsers.value = typingUsers.value.filter(n => n !== e.name)
        }, 3000)
      }
    })
    .subscribed(() => {
      console.log('✅ Suscrito al canal department')
      if (pollInterval) {
        window.clearInterval(pollInterval)
        pollInterval = null
      }
    })
    .error((err: any) => {
      console.error('Channel error:', err)
      error.value = 'Error de conexión'
      if (!pollInterval) {
        startPollingMessages()
      }
    })
}

const send = async () => {
  if (!input.value.trim()) return

  const text = input.value
  input.value = ''

  const now = new Date()
  const tempId = ++messageId
  messages.value.push({
    id: tempId,
    userName: props.user.name,
    message: text,
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: getLocalDateString(now),
    lastSeenAt: now.toISOString(),
    profilePictureUrl: props.user.profile_picture_url || null,
    status: 'sending'
  })

  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })

  const result = await runSend(async () => {
    const res = await fetch('http://localhost:8000/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${props.token}`,
      },
      body: JSON.stringify({ message: text }),
    })

    if (!res.ok) {
      return { ok: false, message: 'Error al enviar el mensaje.' }
    }

    const msg = messages.value.find(m => m.id === tempId)
    if (msg) {
      msg.status = 'sent'
    }

    return { ok: true, message: 'Mensaje enviado.' }
  })

  if (!echo && !pollInterval) {
    startPollingMessages()
  }

  return result
}

let lastWhisper = 0
const handleTyping = () => {
  const now = Date.now()
  if (now - lastWhisper > 2000 && echo) {
    echo.private('department').whisper('typing', { name: props.user.name })
    lastWhisper = now
  }
}

const logout = async () => {
  try {
    await fetch('http://localhost:8000/auth/logout', {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })
  } catch (e) {
    console.error(e)
  }

  if (echo) {
    echo.disconnect()
  }

  emit('logout')
}

const refreshMessages = async () => {
  try {
    const res = await fetch('http://localhost:8000/chat/messages', {
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (!res.ok) {
      if (res.status === 401) {
        emit('logout')
      }
      return
    }

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) {
      return
    }

    const maxId = Math.max(...data.map((m: any) => m.id))
    if (maxId <= messageId) {
      return
    }

    messages.value = data.map((msg: any) => {
      const date = new Date(msg.created_at)
      return {
        id: msg.id,
        userName: msg.user_name,
        message: msg.text,
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: getLocalDateString(date),
        lastSeenAt: msg.last_seen_at || null,
        profilePictureUrl: msg.profile_picture_url || null,
        status: 'sent',
      }
    })

    messageId = maxId

    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  } catch (e) {
    console.error('Error loading messages:', e)
  }
}

const loadMessages = async () => {
  try {
    const res = await fetch('http://localhost:8000/chat/messages', {
      headers: {
        Authorization: `Bearer ${props.token}`,
      },
    })

    if (!res.ok) {
      if (res.status === 401) {
        emit('logout')
      }
      return
    }

    if (res.ok) {
      const data = await res.json()
      messages.value = data.map((msg: any) => {
        const date = new Date(msg.created_at)
        return {
          id: msg.id,
          userName: msg.user_name,
          message: msg.text,
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: getLocalDateString(date),
          lastSeenAt: msg.last_seen_at || null,
          profilePictureUrl: msg.profile_picture_url || null,
          status: 'sent',
        }
      })

      if (data.length > 0) {
        const maxId = Math.max(...data.map((m: any) => m.id))
        if (maxId > messageId) {
          messageId = maxId
        }
      }

      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }
  } catch (e) {
    console.error('Error loading messages:', e)
  }
}

const startPollingMessages = () => {
  if (pollInterval) return
  pollInterval = window.setInterval(() => {
    refreshMessages()
  }, 3000)
}

const loadUsers = async () => {
  try {
    const res = await fetch('http://localhost:8000/chat/users', {
      headers: { Authorization: `Bearer ${props.token}` }
    })
    if (res.ok) {
      chatUsers.value = await res.json()
    }
  } catch (e) {
    console.error('Error loading users:', e)
  }
}

onMounted(() => {
  loadMessages()
  loadUsers()
  initEcho()
  startPollingMessages()
})

onBeforeUnmount(() => {
  if (echo) {
    echo.disconnect()
  }
  if (pollInterval) {
    window.clearInterval(pollInterval)
  }
})
</script>

<template>
  <main class="chat">

    <header class="header">
      <div class="header-left" @click="showUsersModal = true" style="cursor: pointer;" title="Ver vecinos">
        <div class="avatar">
          <span>🏢</span>
        </div>
        <div class="header-info">
          <h1>Chat de Condominio</h1>
          <span class="online-status">
            <span class="online-dot"></span>
            Toca aquí para ver los vecinos
          </span>
        </div>
      </div>
      <div class="header-right">
        <NotificationsButton :token="token" :user="user" />
      </div>
    </header>

    <div v-if="showUsersModal" class="modal-overlay" @click.self="showUsersModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Vecinos en el Chat</h2>
          <button @click="showUsersModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div v-for="u in chatUsers" :key="u.id" class="user-item">
            <div class="user-avatar-container">
              <img v-if="u.profile_picture_url" :src="u.profile_picture_url" alt="avatar" class="user-avatar-img" />
              <div v-else class="user-avatar-placeholder">
                {{ u.name.charAt(0).toUpperCase() }}
              </div>
              <span class="online-dot-small" v-if="formatLastSeen(u.last_seen_at).includes('hoy') && formatLastSeen(u.last_seen_at).includes('min')"></span>
            </div>
            <div class="user-details">
              <span class="user-name">{{ u.name }}</span>
              <span class="user-status" :class="{ 'is-online': formatLastSeen(u.last_seen_at) === 'En línea' }">
                <span v-if="formatLastSeen(u.last_seen_at) !== 'En línea'">Últ. vez: </span>
                {{ formatLastSeen(u.last_seen_at) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="messages"
      ref="messagesContainer"
    >

      <div
        v-if="messages.length === 0"
        class="empty"
      >
        <p>Aún no hay mensajes. ¡Sé el primero en saludar!</p>
      </div>

      <template v-for="group in groupedMessages" :key="group.date">
        <div class="date-divider">
          <span>{{ group.label }}</span>
        </div>

        <div
          v-for="msg in group.messages"
          :key="msg.id"
          :class="['message-wrapper', { 'own-wrapper': msg.userName === user.name }]"
        >
          <div :class="['message', { own: msg.userName === user.name }]">

            <div class="message-header" v-if="msg.userName !== user.name">
              <div class="msg-author-info">
                <img v-if="msg.profilePictureUrl" :src="msg.profilePictureUrl" alt="avatar" class="msg-avatar" />
                <div v-else class="msg-avatar-placeholder">
                  {{ msg.userName.charAt(0).toUpperCase() }}
                </div>
                <strong>{{ msg.userName }}</strong>
              </div>
              <span class="last-seen" :class="{ 'is-online': formatLastSeen(msg.lastSeenAt) === 'En línea' }">
                <span v-if="formatLastSeen(msg.lastSeenAt) !== 'En línea'">Últ. vez: </span>
                {{ formatLastSeen(msg.lastSeenAt) }}
              </span>
            </div>

            <div class="message-content">
              <span class="message-body">{{ msg.message }}</span>
              <span class="time">
                {{ msg.time }}
                <span v-if="msg.userName === user.name" class="checkmarks" :class="{ 'is-sent': msg.status !== 'sending' }">
                  <svg v-if="msg.status === 'sending'" viewBox="0 0 16 15" width="16" height="15" fill="currentColor">
                    <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                  </svg>
                  <svg v-else viewBox="0 0 16 15" width="16" height="15" fill="currentColor">
                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.318.318 0 0 0 .036.46l1.32 1.053c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                  </svg>
                </span>
              </span>
            </div>

          </div>
        </div>
      </template>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <div v-if="typingUsers.length > 0" class="typing-indicator">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      {{ typingUsers.join(', ') }} {{ typingUsers.length === 1 ? 'está' : 'están' }} escribiendo...
    </div>

    <form @submit.prevent="send" class="input-area">
      <div class="input-wrapper">
        <div class="input-container">
          <input
            v-model="input"
            type="text"
            placeholder="Escribe un mensaje..."
            maxlength="500"
            class="chat-input"
            @keyup.enter="send"
            @input="handleTyping"
          />
          <HttpActionButton type="submit" class="send-btn" :loading="sendingMessage" loading-label="">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="transform: translateX(2px)">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </HttpActionButton>
        </div>
      </div>
    </form>

  </main>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  position: relative;
}

.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  color: #1e293b;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 44px;
  height: 44px;
  background-color: #f1f5f9;
  color: #64748b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 1px solid #e2e8f0;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.header-info h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.online-status {
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #22c55e;
}

.header-right {
  display: flex;
  align-items: center;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 5%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 1;
}

.empty {
  text-align: center;
  margin-top: 40px;
}

.empty p {
  background-color: #ffffff;
  color: #64748b;
  padding: 12px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  display: inline-block;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.date-divider {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}

.date-divider span {
  background-color: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
}

.message-wrapper {
  display: flex;
  justify-content: flex-start;
  width: 100%;
}

.own-wrapper {
  justify-content: flex-end;
}

.message {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  border-bottom-left-radius: 4px;
  padding: 10px 14px;
  max-width: 70%;
  position: relative;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.message.own {
  background-color: #4f46e5;
  border-color: #4f46e5;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 4px;
  color: #ffffff;
}

.message-header {
  font-size: 13px;
  color: #334155;
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.last-seen {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 400;
}

.message-content {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.message-body {
  font-size: 14.5px;
  color: #1e293b;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message.own .message-body {
  color: #ffffff;
}

.time {
  font-size: 11px;
  color: #94a3b8;
  margin-left: auto;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.message.own .time {
  color: rgba(255, 255, 255, 0.7);
}

.checkmarks {
  display: inline-flex;
  color: rgba(255, 255, 255, 0.5);
}

.checkmarks.is-sent {
  color: #ffffff;
}

.error-banner {
  background-color: #fef2f2;
  color: #dc2626;
  border-top: 1px solid #fecaca;
  text-align: center;
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 10;
}

.input-area {
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  z-index: 10;
}

.input-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-container {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 15px;
  color: #1e293b;
  background-color: #f8fafc;
  transition: all 0.2s;
}

.chat-input:focus {
  outline: none;
  border-color: #4f46e5;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.chat-input::placeholder {
  color: #94a3b8;
}

.send-btn {
  background-color: #4f46e5;
  color: white;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s, transform 0.1s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background-color: #4338ca;
}

.send-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.send-btn:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.api-alert {
  font-size: 12px;
  margin-top: 4px;
}

/* Modal Styles */
.modal-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  width: 90%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  max-height: 80%;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 16px;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #94a3b8;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.user-item:hover {
  background-color: #f8fafc;
}

.user-avatar-container {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.user-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar-placeholder {
  color: #64748b;
  font-weight: 600;
  font-size: 16px;
}

.online-dot-small {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background-color: #22c55e;
  border: 2px solid white;
  border-radius: 50%;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.user-status {
  font-size: 12px;
  color: #64748b;
}

/* Chat Message Avatars */
.msg-author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.msg-avatar-placeholder {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #e2e8f0;
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  justify-content: center;
  align-items: center;
}

.is-online {
  color: #22c55e !important;
  font-weight: 500;
}

.typing-indicator {
  padding: 8px 24px;
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #f8fafc;
  font-style: italic;
}

.typing-dot {
  width: 4px;
  height: 4px;
  background-color: #94a3b8;
  border-radius: 50%;
  display: inline-block;
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
