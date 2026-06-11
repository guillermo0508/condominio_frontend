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

    messages.value.push({
      id: ++messageId,
      userName: props.user.name,
      message: text,
      time: new Date().toLocaleTimeString(),
    })

    input.value = ''

    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })

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

    if (res.ok) {
      const data = await res.json()
      messages.value = data.map((msg: any) => {
        const date = new Date(msg.created_at)
        return {
          id: msg.id,
          userName: msg.user_name,
          message: msg.text,
          time: date.toLocaleTimeString(),
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
      <h1>💬 Chat de Condominio</h1>

      <div class="user-info">
        <span class="online-dot"></span>
        <span class="user-label">{{ user.name }}</span>
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
        Sin mensajes
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message', { own: msg.userName === user.name }]"
      >

        <div class="message-header">
          <strong>{{ msg.userName }}</strong>

          <span class="time">
            {{ msg.time }}
          </span>
        </div>

        <div class="message-body">
          {{ msg.message }}
        </div>

      </div>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <form @submit.prevent="send" class="input-area">
      <div class="input-area-fields">
        <input
          v-model="input"
          type="text"
          placeholder="Escribe un mensaje..."
          maxlength="500"
        />
        <HttpActionButton type="submit" class="send-btn" :loading="sendingMessage" loading-label="Enviando...">
          Enviar
        </HttpActionButton>
      </div>
      <ApiResultAlert :result="sendResult" />
    </form>

  </main>
</template>

<style scoped>
.chat {
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  color: #111827;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;

  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

h1 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.user-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.online-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10b981;
  display: inline-block;
  box-shadow: 0 0 0 2px #d1fae5;
}

.user-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #4b5563;
}

.messages {
  overflow-y: auto;

  padding: 1rem;

  display: grid;
  gap: 0.75rem;
}

.empty {
  text-align: center;
  color: #999;
  padding: 2rem;
}

.message {
  padding: 0.75rem 1rem;
  background: white;
  color: #333; 
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message.own {
  background: #e3f2fd;
  margin-left: 2rem;
}

.message-header {
  display: flex;
  justify-content: space-between;

  margin-bottom: 0.5rem;

  font-size: 0.875rem;
}

.time {
  color: #999;
  font-size: 0.75rem;
}

.message-body {
  word-wrap: break-word;
  color: #333;
}

.error {
  padding: 0.75rem 1rem;

  background: #ffebee;
  color: #c33;

  font-size: 0.875rem;

  border-left: 4px solid #f66;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border-top: 1px solid #ddd;
}

.input-area-fields {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}

input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

.send-btn {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 600;
}

.send-btn:hover:not(:disabled) {
  background: #5568d3;
}
</style>
