<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ChatRoom from '@/components/ChatRoom.vue'

const router = useRouter()
const authStore = useAuthStore()

const currentView = ref<'chat'>('chat')

onMounted(async () => {
  if (!authStore.user) {
    try {
      await authStore.getCurrentUser()
    } catch {
      router.push({ name: 'login' })
    }
  }
})

const handleLogout = async () => {
  await authStore.logout()
  router.push({ name: 'login' })
}

const goToAdmin = () => {
  router.push({ name: 'admin-users' })
}
</script>

<template>
  <div v-if="authStore.user" class="app layout">
    <aside class="sidebar">
      <h2>Condominio</h2>
      <nav>
        <button class="active">💬 Chat Room</button>
        <button v-if="authStore.isAdmin" @click="goToAdmin">🛡️ Admin Panel</button>
      </nav>
      <div class="sidebar-bottom">
        <button class="logout-btn" @click="handleLogout">Cerrar Sesión</button>
      </div>
    </aside>
    <main class="main-content">
      <ChatRoom :token="authStore.token!" :user="authStore.user!" />
    </main>
  </div>
  <div v-else class="loading">Cargando...</div>
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

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.5rem;
  color: #666;
}
</style>
