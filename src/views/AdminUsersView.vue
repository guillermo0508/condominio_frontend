<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import AdminDashboard from '@/components/AdminDashboard.vue'

const authStore = useAuthStore()
</script>

<template>
  <div class="admin-view" role="main">
    <AdminDashboard v-if="authStore.user" :token="authStore.token!" :user="authStore.user" />
  </div>
</template>

<style scoped>
.admin-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  padding: 1rem;
}
</style>
