<template>
  <div class="admin-panel">
    <div class="panel-header">
      <h1>👥 Gestión de Usuarios</h1>
      <button @click="showCreateModal = true" class="btn-primary">
        + Agregar Usuario
      </button>
    </div>

    <!-- Search and Filter -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por nombre o email..."
        class="search-input"
      />
    </div>

    <!-- Users Table -->
    <div v-if="!isLoading" class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Admin</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id" class="user-row">
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>
              <span class="role-badge" :class="`role-${user.role}`">
                {{ user.role }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="`status-${user.status}`">
                {{ translateStatus(user.status) }}
              </span>
            </td>
            <td>
              <span v-if="user.is_admin" class="admin-badge">Sí</span>
              <span v-else class="non-admin-badge">No</span>
            </td>
            <td class="actions">
              <button
                @click="editUser(user)"
                class="btn-edit"
                title="Editar usuario"
              >
                ✏️
              </button>
              <button
                v-if="user.id !== authStore.user?.id"
                @click="deleteUserConfirm(user)"
                class="btn-delete"
                title="Eliminar usuario"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination">
        <button
          :disabled="pagination.currentPage === 1"
          @click="previousPage"
          class="btn-pagination"
        >
          ← Anterior
        </button>

        <span class="page-info">
          Página {{ pagination.currentPage }} de {{ pagination.lastPage }}
        </span>

        <button
          :disabled="pagination.currentPage === pagination.lastPage"
          @click="nextPage"
          class="btn-pagination"
        >
          Siguiente →
        </button>
      </div>
    </div>

    <div v-else class="loading">Cargando usuarios...</div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ showEditModal ? 'Editar Usuario' : '➕ Agregar Usuario' }}</h2>
          <button @click="closeModal" class="btn-close">&times;</button>
        </div>

        <!-- Success message after create -->
        <div v-if="createSuccess" class="success-banner">
          <span>✅</span>
          <div>
            <strong>¡Usuario creado!</strong>
            <p>Se envió un código de verificación a <strong>{{ formData.email }}</strong>. El usuario deberá ingresar ese código para activar su cuenta y crear su contraseña.</p>
          </div>
          <button @click="closeModal" class="btn-primary" style="margin-top: 12px; width: 100%;">Cerrar</button>
        </div>

        <form v-else @submit.prevent="saveUser" class="modal-form">
          <div class="form-group">
            <label>Nombre</label>
            <input v-model="formData.name" type="text" placeholder="Nombre completo" required />
          </div>

          <div class="form-group">
            <label>Correo electrónico</label>
            <input
              v-model="formData.email"
              type="email"
              :disabled="showEditModal"
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <!-- Edit-only fields -->
          <template v-if="showEditModal">
            <div class="form-group">
              <label>Rol</label>
              <select v-model="formData.role">
                <option value="user">Usuario</option>
                <option value="manager">Administrador de Edificio</option>
                <option value="admin">Administrador del Sistema</option>
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
              <input v-model="formData.password" type="password" placeholder="Dejar vacío para no cambiar" />
            </div>

            <div v-if="formData.password" class="form-group">
              <label>Confirmar contraseña</label>
              <input v-model="formData.password_confirmation" type="password" required />
            </div>

            <div class="form-group checkbox">
              <label>
                <input v-model="formData.is_admin" type="checkbox" />
                Es Administrador del Sistema
              </label>
            </div>
          </template>

          <!-- Info note for new users -->
          <div v-if="!showEditModal" class="info-note">
            📧 El usuario recibirá un código en su correo para verificar su cuenta y crear su contraseña.
          </div>

          <div v-if="formError" class="error-banner">{{ formError }}</div>

          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-secondary">
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="isSaving">
              {{ isSaving ? 'Guardando...' : (showEditModal ? 'Actualizar' : 'Crear y Enviar Código') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>⚠️ Confirmar Eliminación</h2>
        </div>

        <p class="confirm-text">
          ¿Estás seguro de que deseas eliminar al usuario
          <strong>{{ userToDelete?.name }}</strong>? Esta acción no se puede deshacer.
        </p>

        <div class="modal-footer">
          <button @click="showDeleteConfirm = false" class="btn-secondary">
            Cancelar
          </button>
          <button @click="confirmDelete" class="btn-danger">
            Eliminar Usuario
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

const isLoading = computed(() => userStore.isLoading)
const error = computed(() => userStore.error)
const users = computed(() => userStore.users)
const pagination = computed(() => userStore.pagination)

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(
    user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
  )
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

async function loadUsers(page = 1) {
  try {
    await userStore.fetchUsers(page)
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
  if (!userToDelete.value) return

  try {
    await userStore.deleteUser(userToDelete.value.id)
    showDeleteConfirm.value = false
    userToDelete.value = null
  } catch (err) {
    console.error('Error deleting user:', err)
  }
}

async function saveUser() {
  formError.value = null
  isSaving.value = true

  try {
    if (showEditModal.value && editingUserId.value) {
      const updateData: any = {
        name: formData.value.name,
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
      // New user: only send name and email
      await userStore.createUser({ name: formData.value.name, email: formData.value.email } as any)
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
  if (pagination.value.currentPage < pagination.value.lastPage) {
    loadUsers(pagination.value.currentPage + 1)
  }
}

function previousPage() {
  if (pagination.value.currentPage > 1) {
    loadUsers(pagination.value.currentPage - 1)
  }
}
</script>

<style scoped>
.admin-panel {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.panel-header h1 {
  margin: 0;
  color: #333;
}

.search-bar {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 400px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: #f8f9fa;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #eee;
}

.user-row {
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
}

.user-row:hover {
  background: #f9f9f9;
}

.users-table td {
  padding: 15px;
  color: #666;
}

.role-badge {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.role-admin {
  background: #fee;
  color: #c33;
}

.role-manager {
  background: #fef3cd;
  color: #856404;
}

.role-user {
  background: #d1ecf1;
  color: #0c5460;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
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

.admin-badge {
  color: #28a745;
  font-weight: 600;
}

.non-admin-badge {
  color: #999;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-edit,
.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  transition: transform 0.2s;
}

.btn-edit:hover {
  transform: scale(1.2);
}

.btn-delete:hover {
  transform: scale(1.2);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.page-info {
  color: #666;
  font-size: 14px;
}

.btn-pagination {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background: #764ba2;
}

.btn-pagination:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #eee;
  color: #333;
}

.btn-secondary:hover {
  background: #ddd;
}

.btn-danger {
  background: #dc3545;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
}

.btn-danger:hover {
  background: #c82333;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 15px;
  border-radius: 5px;
  margin-top: 20px;
  border-left: 4px solid #c33;
}

/* Modal Styles */
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
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
}

.modal-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group.checkbox {
  flex-direction: row;
  align-items: center;
  margin-bottom: 20px;
}

.form-group.checkbox input {
  margin-right: 10px;
}

.form-group.checkbox label {
  margin-bottom: 0;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #eee;
}

.confirm-text {
  padding: 20px;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.success-banner {
  padding: 24px;
  background: #f0fdf4;
  border-left: 4px solid #22c55e;
  border-radius: 0 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #166534;
}

.success-banner span {
  font-size: 28px;
  text-align: center;
}

.success-banner strong {
  font-size: 16px;
}

.success-banner p {
  margin: 4px 0 0 0;
  color: #15803d;
}

.info-note {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding: 12px 16px;
  border-radius: 5px;
  font-size: 13px;
  color: #1e40af;
  margin-bottom: 16px;
}

.error-banner {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  padding: 12px 16px;
  border-radius: 5px;
  font-size: 13px;
  color: #991b1b;
  margin-bottom: 16px;
}
</style>
