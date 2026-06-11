<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import AdminDashboard from '@/components/AdminDashboard.vue'

const authStore = useAuthStore()
</script>

<template>
  <div class="admin-view">
    <nav class="admin-nav">
      <div class="nav-brand">
        <h2>🏢 Condominio Admin</h2>
      </div>
      <div class="nav-menu">
        <router-link to="/" class="nav-link">💬 Volver al Chat</router-link>
      </div>
    </nav>

    <div class="admin-content">
      <AdminDashboard v-if="authStore.user" :token="authStore.token!" :user="authStore.user" />
    </div>
  </div>
</template>

<style scoped>
.admin-view {
  min-height: 100vh;
  background: #f5f5f5;
}

.admin-nav {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.nav-menu {
  display: flex;
  gap: 20px;
  align-items: center;
}

.nav-link,
.nav-logout {
  text-decoration: none;
  color: #667eea;
  font-weight: 600;
  border: none;
  background: none;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-link:hover,
.nav-logout:hover {
  color: #764ba2;
}

.admin-content {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
