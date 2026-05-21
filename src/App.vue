<script setup lang="ts">
import { ref } from 'vue'
import LoginForm from './components/LoginForm.vue'
import ChatRoom from './components/ChatRoom.vue'

interface User {
  id: number
  name: string
  email: string
}

const token = ref<string | null>(sessionStorage.getItem('auth_token'))
const user = ref<User | null>(sessionStorage.getItem('auth_user') ? JSON.parse(sessionStorage.getItem('auth_user')!) : null)

const handleLogin = (t: string, u: User) => {
  token.value = t
  user.value = u
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
  <div v-else class="app">
    <ChatRoom :token="token" :user="user" @logout="handleLogout" />
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
