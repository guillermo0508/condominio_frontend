<script setup lang="ts">
import { ref } from 'vue'
import LoginForm from './components/LoginForm.vue'
import ChatRoom from './components/ChatRoom.vue'
import AdminDashboard from './components/AdminDashboard.vue'

interface User {
  id: number
  name: string
  email: string
  role?: string
  is_admin?: boolean
}

const token = ref<string | null>(sessionStorage.getItem('auth_token'))
const user = ref<User | null>(sessionStorage.getItem('auth_user') ? JSON.parse(sessionStorage.getItem('auth_user')!) : null)
const currentView = ref<'chat' | 'admin'>('chat')

const handleLogin = (t: string, u: User) => {
  token.value = t
  user.value = u
  currentView.value = u.is_admin ? 'admin' : 'chat'
  sessionStorage.setItem('auth_token', t)
  sessionStorage.setItem('auth_user', JSON.stringify(u))
}

const handleLogout = () => {
  token.value = null
  user.value = null
  sessionStorage.removeItem('auth_token')
  sessionStorage.removeItem('auth_user')
}
</script>

<template>
  <div v-if="!token || !user" class="app">
    <LoginForm @login="handleLogin" />
  </div>
  <div v-else class="app layout">
    <aside class="sidebar">
      <h2>Condominio</h2>
      <nav>
        <button :class="{ active: currentView === 'chat' }" @click="currentView = 'chat'">💬 Chat Room</button>
        <button v-if="user.is_admin" :class="{ active: currentView === 'admin' }" @click="currentView = 'admin'">🛡️ Admin Panel</button>
      </nav>
      <div class="sidebar-bottom">
        <button class="logout-btn" @click="handleLogout">Cerrar Sesión</button>
      </div>
    </aside>
    <main class="main-content">
      <ChatRoom v-if="currentView === 'chat'" :token="token" :user="user" @logout="handleLogout" />
      <AdminDashboard v-else-if="currentView === 'admin'" :token="token" :user="user" />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  background: #f4f5f7;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background: #111827;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 2rem 0;
  flex-shrink: 0;
}

.sidebar h2 {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.5rem;
  letter-spacing: 1px;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1rem;
}

.sidebar nav button {
  background: transparent;
  border: none;
  color: #9ca3af;
  text-align: left;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.sidebar nav button:hover, .sidebar nav button.active {
  background: #1f2937;
  color: white;
}

.sidebar-bottom {
  margin-top: auto;
  padding: 1rem;
}

.logout-btn {
  width: 100%;
  padding: 0.75rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}

.logout-btn:hover {
  background: #dc2626;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}
</style>
