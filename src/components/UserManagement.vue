<template>
  <div>
    <h2>👥 Gestión de Usuarios</h2>
    
    <div class="search-section">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por nombre o email..."
        class="search-input"
      />
    </div>

    <div v-if="!isLoading" class="users-list">
      <div v-if="filteredUsers.length === 0" class="empty-state">
        <p>No hay usuarios encontrados</p>
      </div>
      
      <div v-else class="users-grid">
        <div v-for="user in paginatedUsers" :key="user.id" class="user-card">
          <div class="user-info">
            <h3>{{ user.name }}</h3>
            <p class="user-email">{{ user.email }}</p>
            <div class="user-badges">
              <span class="badge" :class="`role-${user.role}`">{{ user.role }}</span>
              <span class="badge" :class="`status-${user.status}`">{{ translateStatus(user.status) }}</span>
            </div>
          </div>
          <div class="user-actions">
            <button
              @click="editUser(user)"
              class="btn-icon"
              title="Editar usuario"
              aria-label="Editar usuario"
            >
              ✏️
            </button>
            <button
              v-if="user.id !== authStore.user?.id"
              @click="deleteUserConfirm(user)"
              class="btn-icon btn-danger"
              title="Eliminar usuario"
              aria-label="Eliminar usuario"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredUsers.length > itemsPerPage" class="pagination">
        <button
          :disabled="currentPageLocal === 1"
          @click="previousPage"
          class="btn-pag"
        >
          ← Anterior
        </button>
        <span class="page-info">{{ currentPageLocal }} / {{ Math.ceil(filteredUsers.length / itemsPerPage) }}</span>
        <button
          :disabled="currentPageLocal * itemsPerPage >= filteredUsers.length"
          @click="nextPage"
          class="btn-pag"
        >
          Siguiente →
        </button>
      </div>
    </div>

    <div v-else class="loading">Cargando usuarios...</div>

    <button @click="showCreateModal = true" class="btn-add">+ Agregar Usuario</button>

    <!-- Modal para crear/editar -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ showEditModal ? '✏️ Editar Usuario' : '➕ Agregar Usuario' }}</h2>
          <button @click="closeModal" class="btn-close">&times;</button>
        </div>

        <div v-if="createSuccess" class="success-message">
          <p>✅ Usuario creado exitosamente</p>
          <p class="text-small">Se envió un código a {{ formData.email }}</p>
          <button @click="closeModal" class="btn-action">Cerrar</button>
        </div>

        <form v-else @submit.prevent="saveUser" class="modal-form">
          <div class="form-group">
            <label>Nombre</label>
            <input v-model="formData.name" type="text" placeholder="Nombre completo" maxlength="255" required />
          </div>

          <div class="form-group">
            <label>Correo</label>
            <input
              v-model="formData.email"
              type="email"
              :disabled="showEditModal"
              placeholder="correo@ejemplo.com"
              maxlength="255"
              required
            />
          </div>

          <template v-if="showEditModal">
            <div class="form-group">
              <label>Rol</label>
              <select v-model="formData.role">
                <option value="user">Usuario</option>
                <option value="manager">Gestor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div class="form-group">
              <label>Estado</label>
              <select v-model="formData.status">
                <option value="pending">Pendiente</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>

            <div class="form-group">
              <label>Nueva contraseña (opcional)</label>
              <input
                v-model="formData.password"
                type="password"
                placeholder="Dejar vacío para no cambiar"
                maxlength="100"
              />
            </div>

            <div v-if="formData.password" class="form-group">
              <label>Confirmar</label>
              <input v-model="formData.password_confirmation" type="password" maxlength="100" required />
            </div>
          </template>

          <div v-if="formError" class="error-message">{{ formError }}</div>

          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-secondary" :disabled="isSaving">
              Cancelar
            </button>
            <button type="submit" class="btn-action" :disabled="isSaving">
              {{ isSaving ? 'Guardando...' : (showEditModal ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de confirmación de eliminación -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>⚠️ Confirmar Eliminación</h2>
        </div>
        <p class="confirm-text">¿Eliminar a <strong>{{ userToDelete?.name }}</strong>?</p>
        <div class="modal-footer">
          <button @click="showDeleteConfirm = false" class="btn-secondary" :disabled="isSaving">
            Cancelar
          </button>
          <button @click="confirmDelete" class="btn-danger" :disabled="isSaving">
            {{ isSaving ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/stores/users'

const userStore = useUserStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const userToDelete = ref<User | null>(null)
const editingUserId = ref<number | null>(null)
const createSuccess = ref(false)
const isSaving = ref(false)
const formError = ref<string | null>(null)
const itemsPerPage = 5
const currentPageLocal = ref(1)

const isLoading = computed(() => userStore.isLoading)
const users = computed(() => userStore.users)

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(
    user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
  )
})

const paginatedUsers = computed(() => {
  const start = (currentPageLocal.value - 1) * itemsPerPage
  return filteredUsers.value.slice(start, start + itemsPerPage)
})

const formData = ref({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: 'user',
  status: 'active',
  is_admin: false,
})

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  try {
    currentPageLocal.value = 1
    await userStore.fetchUsers()
  } catch (err) {
    console.error('Error loading users:', err)
  }
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  createSuccess.value = false
  formError.value = null
  resetForm()
  loadUsers()
}

function resetForm() {
  formData.value = {
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'user',
    status: 'active',
    is_admin: false,
  }
  editingUserId.value = null
}

function editUser(user: User) {
  editingUserId.value = user.id
  formData.value = {
    name: user.name,
    email: user.email,
    password: '',
    password_confirmation: '',
    role: user.role,
    status: user.status,
    is_admin: user.is_admin,
  }
  showEditModal.value = true
}

function deleteUserConfirm(user: User) {
  userToDelete.value = user
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!userToDelete.value || isSaving.value) return
  
  isSaving.value = true
  try {
    await userStore.deleteUser(userToDelete.value.id)
    showDeleteConfirm.value = false
    userToDelete.value = null
  } catch (err) {
    console.error('Error deleting user:', err)
  } finally {
    isSaving.value = false
  }
}

async function saveUser() {
  formError.value = null

  if (!formData.value.name || !formData.value.name.trim()) {
    formError.value = 'El nombre es requerido.'
    return
  }

  if (!formData.value.email || !formData.value.email.trim()) {
    formError.value = 'El correo electrónico es requerido.'
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.value.email)) {
    formError.value = 'Correo electrónico inválido.'
    return
  }

  if (showEditModal.value && formData.value.password) {
    if (formData.value.password.length < 6) {
      formError.value = 'La contraseña debe tener al menos 6 caracteres.'
      return
    }

    if (formData.value.password !== formData.value.password_confirmation) {
      formError.value = 'Las contraseñas no coinciden.'
      return
    }
  }

  if (isSaving.value) return
  isSaving.value = true

  try {
    if (showEditModal.value && editingUserId.value) {
      const updateData: any = {
        name: formData.value.name.trim(),
        role: formData.value.role,
        status: formData.value.status,
        is_admin: formData.value.is_admin,
      }
      if (formData.value.password) {
        updateData.password = formData.value.password
        updateData.password_confirmation = formData.value.password_confirmation
      }
      await userStore.updateUser(editingUserId.value, updateData)
      closeModal()
    } else {
      await userStore.createUser({ name: formData.value.name.trim(), email: formData.value.email.trim() } as any)
      createSuccess.value = true
    }
  } catch (err: any) {
    formError.value = err?.message || 'Error al guardar el usuario'
  } finally {
    isSaving.value = false
  }
}

function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    pending: 'Pendiente',
    active: 'Activo',
    inactive: 'Inactivo',
  }
  return translations[status] || status
}

function nextPage() {
  if (currentPageLocal.value * itemsPerPage < filteredUsers.value.length) {
    currentPageLocal.value++
  }
}

function previousPage() {
  if (currentPageLocal.value > 1) {
    currentPageLocal.value--
  }
}
</script>

<style scoped>
.search-section {
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #111827;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.users-list {
  margin-bottom: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.user-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  transition: all 0.2s;
}

.user-card:hover {
  background: white;
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.user-info {
  flex: 1;
}

.user-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.user-email {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  color: #6b7280;
  word-break: break-all;
}

.user-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.role-user {
  background: #d1ecf1;
  color: #0c5460;
}

.role-manager {
  background: #fef3cd;
  color: #856404;
}

.role-admin {
  background: #fee;
  color: #c33;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-inactive {
  background: #f8d7da;
  color: #721c24;
}

.user-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.5rem;
  transition: transform 0.2s;
  border-radius: 6px;
}

.btn-icon:hover {
  transform: scale(1.1);
  background: #e5e7eb;
}

.btn-icon:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.btn-icon.btn-danger:hover {
  background: #fee;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.page-info {
  color: #6b7280;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn-pag {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: #667eea;
  transition: all 0.2s;
}

.btn-pag:hover:not(:disabled) {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.btn-pag:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-add {
  width: 100%;
  padding: 0.875rem 1.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-add:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 450px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #111827;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
}

.btn-close:hover {
  color: #111827;
}

.modal-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.success-message {
  background: #f0fdf4;
  border-left: 4px solid #22c55e;
  padding: 1.5rem;
  border-radius: 8px;
  color: #166534;
}

.success-message p {
  margin: 0.5rem 0;
}

.text-small {
  font-size: 0.85rem;
  color: #15803d;
}

.error-message {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #991b1b;
  margin: 1rem 0;
}

.confirm-text {
  padding: 1.5rem;
  color: #374151;
  font-size: 0.95rem;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-action,
.btn-secondary,
.btn-danger {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-action {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-action:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-action:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #d1d5db;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-action:disabled,
.btn-secondary:disabled,
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .users-grid {
    grid-template-columns: 1fr;
  }

  .modal {
    width: 95%;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-footer button {
    width: 100%;
  }
}
</style>
