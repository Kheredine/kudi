import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('../views/AuthView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: () => import('../views/TransactionsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/forecast',
    name: 'Forecast',
    component: () => import('../views/ForecastView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('../views/ChatView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Auth guard — redirect to /auth if not authenticated
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth === false) return true

  // Check if user has completed auth by checking localStorage flag
  // (The auth composable manages this state)
  const authCompleted = localStorage.getItem('kudi-auth-completed')

  if (!authCompleted && to.name !== 'Auth') {
    return { name: 'Auth' }
  }

  return true
})

export default router