<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
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
  status?: 'sending' | 'sent'
}

const props = defineProps<{
  token: string
  user: {
    id: number
    name: string
    email: string
  }
}>()

const emit = defineEmits<{
  logout: []
}>()

const messages = ref<Message[]>([])
const input = ref('')
const error = ref('')

let echo: Echo<'reverb'> | null = null
let messageId = 0
let pollInterval: number | null = null

const messagesContainer = ref<HTMLElement | null>(null)

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

      messages.value.push({
        id: ++messageId,
        userName: data.userName || props.user.name,
        message: data.message,
        time: new Date().toLocaleTimeString(),
      })

      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop =
            messagesContainer.value.scrollHeight
        }
      })
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

  const tempId = ++messageId
  messages.value.push({
    id: tempId,
    userName: props.user.name,
    message: text,
    time: new Date().toLocaleTimeString(),
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
        time: date.toLocaleTimeString(),
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
          time: date.toLocaleTimeString(),
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

onMounted(() => {
  loadMessages()
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
      <div class="header-left">
        <div class="avatar">
          <span>🏢</span>
        </div>
        <div class="header-info">
          <h1>Chat de Condominio</h1>
          <span class="online-status">
            <span class="online-dot"></span>
            {{ user.name }} (En línea)
          </span>
        </div>
      </div>
      <div class="header-right">
        <NotificationsButton :token="token" :user="user" />
      </div>
    </header>

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

      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message-wrapper', { 'own-wrapper': msg.userName === user.name }]"
      >
        <div :class="['message', { own: msg.userName === user.name }]">

          <div class="message-header" v-if="msg.userName !== user.name">
            <strong>{{ msg.userName }}</strong>
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
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
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
  background-color: #efeae2;
  font-family: 'Segoe UI', Helvetica Neue, Helvetica, Arial, sans-serif;
  position: relative;
}

.chat::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-5.5 5.5h-1.66l5.5-5.5-1.66-1.66 5.5-5.5v1.66l-3.01 3.01z' fill='%23000000' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

.header {
  background-color: #00a884;
  color: white;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  background-color: #dfe5e7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.header-info h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 21px;
}

.online-status {
  font-size: 13px;
  color: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #25d366;
}

.header-right {
  display: flex;
  align-items: center;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 5%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1;
}

.empty {
  text-align: center;
  margin-top: 20px;
}

.empty p {
  background-color: #fffbdd;
  color: #54656f;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  display: inline-block;
  box-shadow: 0 1px 0.5px rgba(11,20,26,.13);
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
  border-radius: 7.5px;
  padding: 6px 7px 8px 9px;
  max-width: 65%;
  position: relative;
  box-shadow: 0 1px 0.5px rgba(11,20,26,.13);
  display: flex;
  flex-direction: column;
}

.message:not(.own)::before {
  content: "";
  position: absolute;
  top: 0;
  left: -8px;
  width: 0;
  height: 0;
  border-top: 10px solid #ffffff;
  border-left: 10px solid transparent;
}

.message.own {
  background-color: #d9fdd3;
}

.message.own::before {
  content: "";
  position: absolute;
  top: 0;
  right: -8px;
  width: 0;
  height: 0;
  border-top: 10px solid #d9fdd3;
  border-right: 10px solid transparent;
}

.message-header {
  font-size: 12.5px;
  color: #029d00;
  font-weight: 500;
  margin-bottom: 2px;
}

.message-content {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.message-body {
  font-size: 14.2px;
  color: #111b21;
  line-height: 19px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.time {
  font-size: 11px;
  color: #667781;
  margin-left: auto;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.checkmarks {
  display: inline-flex;
  color: #8696a0; }

.checkmarks.is-sent {
  color: #53bdeb; }

.error-banner {
  background-color: #ffebee;
  color: #c33;
  text-align: center;
  padding: 8px;
  font-size: 13px;
  z-index: 10;
}

.input-area {
  background-color: #f0f2f5;
  padding: 10px 16px;
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
  gap: 12px;
}

.chat-input {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  color: #111b21;
  background-color: #ffffff;
  box-shadow: none;
}

.chat-input:focus {
  outline: none;
}

.chat-input::placeholder {
  color: #8696a0;
}

.send-btn {
  background-color: #00a884;
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background-color: #008f6f;
}

.send-btn:disabled {
  background-color: #8696a0;
  cursor: not-allowed;
}

.api-alert {
  font-size: 12px;
  margin-top: 4px;
}
</style>
