<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const errorMsg = ref('')

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  if (!file.type.startsWith('image/')) {
    errorMsg.value = 'Por favor selecciona una imagen.'
    return
  }

  errorMsg.value = ''
  uploading.value = true

  const formData = new FormData()
  formData.append('picture', file)

  try {
    const res = await fetch('http://localhost:8000/profile/picture', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: formData
    })

    if (!res.ok) {
      throw new Error('Error al subir la imagen')
    }

    const data = await res.json()
    if (authStore.user && data.profile_picture_url) {
      authStore.user.profile_picture_url = data.profile_picture_url
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Error desconocido al subir.'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="profile-container">
    <div class="profile-card">
      <h2>Mi Perfil</h2>

      <div class="profile-header">
        <div class="avatar-container" @click="triggerFileInput">
          <img v-if="authStore.user?.profile_picture_url" :src="authStore.user.profile_picture_url" alt="Perfil" class="avatar-img" />
          <div v-else class="avatar-placeholder">
            <span>{{ authStore.user?.name.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="avatar-overlay">
            <span>📷 Cambiar</span>
          </div>
        </div>
        <input type="file" ref="fileInput" accept="image/*" class="hidden-input" @change="handleFileChange" />
        <div v-if="uploading" class="uploading-text">Subiendo...</div>
        <div v-if="errorMsg" class="error-text">{{ errorMsg }}</div>
      </div>

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

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.avatar-container {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  background-color: #f3f4f6;
  border: 2px solid #e5e7eb;
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 2.5rem;
  color: #9ca3af;
  font-weight: 600;
}

.avatar-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-container:hover .avatar-overlay {
  opacity: 1;
}

.hidden-input {
  display: none;
}

.uploading-text {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #4f46e5;
}

.error-text {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #dc2626;
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
