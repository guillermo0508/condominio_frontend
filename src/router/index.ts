import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/verify-email/:email',
      name: 'verify-email',
      component: () => import('../views/EmailVerificationView.vue'),
      meta: { requiresGuest: true },
      props: true,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('../views/AdminUsersView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next({ name: 'login' })
      return
    }

    if (!authStore.user) {
      try {
        await authStore.getCurrentUser()
      } catch {
        next({ name: 'login' })
        return
      }
    }

    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next({ name: 'home' })
      return
    }

    if (to.meta.roles && Array.isArray(to.meta.roles)) {
      if (!authStore.user || !to.meta.roles.includes(authStore.user.role)) {
        next({ name: 'home' })
        return
      }
    }
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'home' })
    return
  }

  next()
})

export default router
