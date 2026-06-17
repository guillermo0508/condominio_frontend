import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export interface User {
  id: number
  name: string
  email: string
  role: string
  is_admin: boolean
  status: 'pending' | 'active' | 'inactive'
  email_verified_at: string | null
  created_at?: string
  updated_at?: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const useUserStore = defineStore('user', () => {
  const authStore = useAuthStore()

  const users = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({
    currentPage: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  })

  const totalUsers = computed(() => pagination.value.total)

  async function fetchUsers(page = 1) {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/users?page=${page}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Accept': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users')
      }

      users.value = data.data
      pagination.value = data.pagination
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string; password_confirmation: string }) {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user')
      }

      users.value.unshift(data.user)
      return data.user
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateUser(userId: number, userData: Partial<User> & { password?: string; password_confirmation?: string }) {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user')
      }

      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value[index] = data.user
      }

      return data.user
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function deleteUser(userId: number) {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete user')
      }

      users.value = users.value.filter(u => u.id !== userId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    users,
    isLoading,
    error,
    pagination,
    totalUsers,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
})
