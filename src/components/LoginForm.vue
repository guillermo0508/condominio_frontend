<script setup lang="ts">
import { ref } from 'vue'

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const name = ref('')
const error = ref('')

const emit = defineEmits<{
  login: [token: string, user: { id: number; name: string; email: string }]
}>()

const toggleForm = () => {
  isLogin.value = !isLogin.value
  error.value = ''
}

const submit = async () => {
  error.value = ''
  const url = isLogin.value ? '/auth/login' : '/auth/register'
  const payload = isLogin.value
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
    if (isLogin.value) {
      emit('login', data.token, data.user)
    } else {
      isLogin.value = true
      email.value = payload.email
      password.value = payload.password
      error.value = 'Registered. Now login.'
    }
  } catch (e) {
    error.value = 'Network error'
  }
}
</script>

<template>
  <main class="auth">
    <div class="card">
      <h1>{{ isLogin ? 'Iniciar sesión' : 'Registrarse' }}</h1>
      <form @submit.prevent="submit">
        <div v-if="!isLogin" class="input-group">
          <label>Nombre</label>
          <input v-model="name" type="text" placeholder="Tu nombre" required />
        </div>
        <div class="input-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="email@example.com" required />
        </div>
        <div class="input-group">
          <label>Contraseña</label>
          <input v-model="password" type="password" placeholder="Contraseña" required />
        </div>
        <button type="submit" class="btn">
          {{ isLogin ? 'Ingresar' : 'Crear cuenta' }}
        </button>
      </form>
      <p class="toggle">
        {{ isLogin ? '¿Sin cuenta?' : '¿Ya tienes cuenta?' }}
        <button type="button" @click="toggleForm" class="link">
          {{ isLogin ? 'Registrarse' : 'Inicia sesión' }}
        </button>
      </p>
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
</style>
