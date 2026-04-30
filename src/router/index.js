import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../composables/useSupabase'

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
    path: '/manage',
    name: 'Manage',
    component: () => import('../views/ManageView.vue'),
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

// Auth guard — check Supabase session
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth === false) return true

  const { data: { session } } = await supabase.auth.getSession()

  if (!session && to.name !== 'Auth') {
    return { name: 'Auth' }
  }

  return true
})

export default router