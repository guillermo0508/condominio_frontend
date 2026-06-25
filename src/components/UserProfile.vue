<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div class="profile-container">
    <div class="profile-card">
      <h2>Mi Perfil</h2>

      <div class="user-info">
        <p><strong>Nombre:</strong> {{ authStore.user?.name }}</p>
        <p><strong>Email:</strong> {{ authStore.user?.email }}</p>
        <p><strong>Rol:</strong> {{ authStore.user?.role === 'admin' ? 'Administrador' : 'Residente' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100%;
}

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 2rem;
  width: 100%;
  max-width: 500px;
}

.profile-card h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #111827;
  font-size: 1.5rem;
  text-align: center;
}

.user-info {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.user-info p {
  margin: 0.5rem 0;
  color: #374151;
}
</style>
