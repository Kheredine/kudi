import { ref, computed } from 'vue'
import { supabase } from './useSupabase'
import { fetchProfile } from './useProfile'

// ============================================================
// AUTH STATE (singleton)
// ============================================================

const user = ref(null)
const isAuthenticated = ref(false)
const error = ref(null)
const loading = ref(true)

// ============================================================
// USERNAME → FAKE EMAIL HELPER
// ============================================================

function usernameToEmail(username) {
  // Supabase Auth requires an email. We map username → username@kudi.app
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${clean}@kudi.app`
}

// Listen to Supabase auth state changes (handles token refresh, etc.)
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    // Extract username from email (strip @kudi.app) or from metadata
    const email = session.user.email || ''
    let username = session.user.user_metadata?.username || email.split('@')[0] || 'User'

    user.value = {
      id: session.user.id,
      email,
      username,
    }
    isAuthenticated.value = true
  } else {
    user.value = null
    isAuthenticated.value = false
  }
  loading.value = false
})

// ============================================================
// SIGN UP (username + passcode)
// ============================================================

async function signUp(username, password) {
  error.value = null

  if (!username?.trim()) {
    error.value = 'Please choose a username'
    return { success: false, error: error.value }
  }
  if (username.trim().length < 2) {
    error.value = 'Username must be at least 2 characters'
    return { success: false, error: error.value }
  }
  if (!password || password.length < 6) {
    error.value = 'Passcode must be at least 6 characters'
    return { success: false, error: error.value }
  }

  const email = usernameToEmail(username)

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: username.trim() },
    },
  })

  if (signUpError) {
    // Translate common errors
    let msg = signUpError.message
    if (msg.includes('already registered')) msg = 'Username is already taken'
    error.value = msg
    return { success: false, error: error.value }
  }

  // Create profile row
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      user_name: username.trim(),
      avatar: 'coin',
      onboarded: false,
    })
    // Fetch the profile into state
    await fetchProfile(data.user.id)
  }

  return { success: true }
}

// ============================================================
// LOGIN (username + passcode)
// ============================================================

async function login(username, password) {
  error.value = null

  if (!username?.trim()) {
    error.value = 'Please enter your username'
    return { success: false, error: error.value }
  }
  if (!password) {
    error.value = 'Please enter your passcode'
    return { success: false, error: error.value }
  }

  const email = usernameToEmail(username)

  const { data, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (loginError) {
    let msg = loginError.message
    if (msg.includes('Invalid login credentials')) msg = 'Wrong username or passcode'
    error.value = msg
    return { success: false, error: error.value }
  }

  if (data.user) {
    const extractedUsername = data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'User'
    user.value = {
      id: data.user.id,
      email: data.user.email,
      username: extractedUsername,
    }
    isAuthenticated.value = true
    // Fetch profile into state
    await fetchProfile(data.user.id)
  }

  return { success: true }
}

// ============================================================
// LOGOUT
// ============================================================

async function logout() {
  await supabase.auth.signOut()
  user.value = null
  isAuthenticated.value = false
  error.value = null
}

function clearError() {
  error.value = null
}

// ============================================================
// GET CURRENT USER ID (for data queries)
// ============================================================

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id || null
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
    loading: computed(() => loading.value),

    // Actions
    signUp,
    login,
    logout,
    clearError,
    getUserId,
  }
}