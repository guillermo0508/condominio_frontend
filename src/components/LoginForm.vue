<script setup lang="ts">
import { onMounted, ref } from 'vue'

const isLogin = ref(true)
const isAdminLogin = ref(false)
const hasResidentAdmin = ref(false)
const email = ref('')
const adminUsername = ref('')
const password = ref('')
const name = ref('')
const error = ref('')
const info = ref('')

const emit = defineEmits<{
  login: [token: string, user: { id: number; name: string; email: string; role?: string; is_admin?: boolean }]
}>()

const toggleForm = () => {
  isLogin.value = !isLogin.value
  isAdminLogin.value = false
  error.value = ''
  info.value = ''
}

const showAdminLogin = () => {
  if (hasResidentAdmin.value) {
    isLogin.value = true
    isAdminLogin.value = false
    adminUsername.value = ''
    password.value = ''
    error.value = ''
    info.value = 'Ingresa con el email y contraseña del residente administrador.'
    return
  }

  isLogin.value = true
  isAdminLogin.value = true
  email.value = ''
  password.value = ''
  error.value = ''
  info.value = ''
}

const showResidentLogin = () => {
  isAdminLogin.value = false
  adminUsername.value = ''
  password.value = ''
  error.value = ''
  info.value = ''
}

const submit = async () => {
  error.value = ''
  info.value = ''
  const url = isAdminLogin.value ? '/auth/admin-master-login' : isLogin.value ? '/auth/login' : '/auth/register'
  const payload = isAdminLogin.value
    ? { username: adminUsername.value, password: password.value }
    : isLogin.value
    ? { email: email.value, password: password.value }
    : { name: name.value, email: email.value, password: password.value }

  try {
    const res = await fetch(`http://localhost:8000${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || 'Error'
      return
    }
    if (isLogin.value || isAdminLogin.value) {
      emit('login', data.token, data.user)
    } else {
      isLogin.value = true
      password.value = ''
      error.value = 'Registered. Now login.'
    }
  } catch (e) {
    error.value = 'Network error'
  }
}

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:8000/auth/admin-status')
    if (!res.ok) return

    const data = await res.json()
    hasResidentAdmin.value = Boolean(data.has_resident_admin)
  } catch (e) {
    console.error(e)
  }
})
</script>

<template>
  <main class="auth">
    <div class="card">
      <h1>{{ isAdminLogin ? 'Administrador' : isLogin ? 'Iniciar sesión' : 'Registrarse' }}</h1>
      <form @submit.prevent="submit">
        <div v-if="!isLogin && !isAdminLogin" class="input-group">
          <label>Nombre</label>
          <input v-model="name" type="text" placeholder="Tu nombre" required />
        </div>
        <div v-if="!isAdminLogin" class="input-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="email@example.com" required />
        </div>
        <div v-else class="input-group">
          <label>Usuario</label>
          <input v-model="adminUsername" type="text" placeholder="admin" required />
        </div>
        <div class="input-group">
          <label>Contraseña</label>
          <input v-model="password" type="password" placeholder="Contraseña" required />
        </div>
        <button type="submit" class="btn">
          {{ isAdminLogin ? 'Entrar al panel' : isLogin ? 'Ingresar' : 'Crear cuenta' }}
        </button>
      </form>
      <p v-if="!isAdminLogin" class="toggle">
        {{ isLogin ? '¿Sin cuenta?' : '¿Ya tienes cuenta?' }}
        <button type="button" @click="toggleForm" class="link">
          {{ isLogin ? 'Registrarse' : 'Inicia sesión' }}
        </button>
      </p>
      <p v-if="isLogin && !isAdminLogin" class="toggle">
        <button type="button" @click="showAdminLogin" class="link">
          Acceder como administrador
        </button>
      </p>
      <p v-if="isAdminLogin" class="toggle">
        <button type="button" @click="showResidentLogin" class="link">
          Volver al login de residentes
        </button>
      </p>
      <div v-if="info" class="info">{{ info }}</div>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </main>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
  min-height: 100vh;
  background: #f9fafb;
}

.card {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

h1 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: #333;
}

.input-group {
  margin-bottom: 1rem;
  display: grid;
  gap: 0.5rem;
}

label {
  font-weight: 600;
  font-size: 0.875rem;
  color: #555;
}

input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn {
  width: 100%;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
}

.btn:hover {
  background: #5568d3;
}

.toggle {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #666;
}

.link {
  background: none;
  border: none;
  color: #667eea;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;
}

.error {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee;
  border-left: 4px solid #f66;
  color: #c33;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #eef2ff;
  border-left: 4px solid #667eea;
  color: #3730a3;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}
</style>
