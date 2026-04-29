import { ref, computed } from 'vue'

// ============================================================
// AUTH STATE (singleton)
// ============================================================

const VALID_USERNAME = 'Samael'
const VALID_PIN = '0049'

const user = ref(null)
const isAuthenticated = ref(!!localStorage.getItem('kudi-auth-completed'))
const error = ref(null)

// Initialize user from localStorage
if (isAuthenticated.value) {
  const saved = localStorage.getItem('kudi-user')
  if (saved) {
    try { user.value = JSON.parse(saved) } catch { /* ignore */ }
  }
  if (!user.value) {
    user.value = { username: VALID_USERNAME }
  }
}

// ============================================================
// LOGIN (synchronous local check)
// ============================================================

function login(username, pin) {
  error.value = null

  if (!username?.trim()) {
    error.value = 'Please enter your username'
    return { success: false, error: error.value }
  }
  if (!pin) {
    error.value = 'Please enter your PIN'
    return { success: false, error: error.value }
  }

  if (username.trim() === VALID_USERNAME && pin === VALID_PIN) {
    user.value = { username: VALID_USERNAME }
    isAuthenticated.value = true
    error.value = null
    localStorage.setItem('kudi-auth-completed', 'true')
    localStorage.setItem('kudi-user', JSON.stringify(user.value))
    return { success: true }
  }

  error.value = 'Invalid credentials'
  return { success: false, error: error.value }
}

// ============================================================
// LOGOUT
// ============================================================

function logout() {
  user.value = null
  isAuthenticated.value = false
  error.value = null
  localStorage.removeItem('kudi-auth-completed')
  localStorage.removeItem('kudi-user')
}

function clearError() {
  error.value = null
}

// ============================================================
// COMPOSABLE
// ============================================================

export function useAuth() {
  return {
    // State
    user: computed(() => user.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    error: computed(() => error.value),

    // Actions
    login,
    logout,
    clearError,
  }
}