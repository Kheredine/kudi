import { ref, computed } from 'vue'
import { supabase } from './useSupabase'

// ============================================================
// AVATAR DEFINITIONS (finance-themed SVG icons)
// ============================================================

export const AVATARS = [
  { id: 'coin', label: 'Coin', emoji: '🪙', gradient: 'from-amber-400 to-orange-500' },
  { id: 'wallet', label: 'Wallet', emoji: '💰', gradient: 'from-emerald-400 to-teal-500' },
  { id: 'bank', label: 'Bank', emoji: '🏦', gradient: 'from-indigo-400 to-purple-500' },
  { id: 'card', label: 'Card', emoji: '💳', gradient: 'from-sky-400 to-blue-500' },
  { id: 'chart-up', label: 'Growth', emoji: '📈', gradient: 'from-green-400 to-emerald-500' },
  { id: 'chart-down', label: 'Trend', emoji: '📉', gradient: 'from-rose-400 to-pink-500' },
  { id: 'piggy', label: 'Piggy', emoji: '🐷', gradient: 'from-pink-400 to-fuchsia-500' },
  { id: 'safe', label: 'Vault', emoji: '🔒', gradient: 'from-slate-400 to-zinc-500' },
  { id: 'bag', label: 'Bag', emoji: '👜', gradient: 'from-yellow-400 to-amber-500' },
  { id: 'calculator', label: 'Calc', emoji: '🧮', gradient: 'from-violet-400 to-purple-500' },
  { id: 'diamond', label: 'Gem', emoji: '💎', gradient: 'from-cyan-400 to-sky-500' },
  { id: 'shield', label: 'Shield', emoji: '🛡️', gradient: 'from-emerald-400 to-green-600' },
]

export function getAvatarMeta(avatarId) {
  return AVATARS.find(a => a.id === avatarId) || AVATARS[0]
}

// ============================================================
// PROFILE STATE (singleton)
// ============================================================

const profile = ref({
  username: 'User',
  avatar: 'coin',
  email: '',
  createdAt: null,
})

// ============================================================
// FETCH PROFILE
// ============================================================

export async function fetchProfile(userId) {
  if (!userId) return

  let data, error
  try {
    ;({ data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle())
  } catch {
    return
  }

  if (error) {
    console.error('[Profile] fetch error:', error.message)
    return
  }

  if (data) {
    profile.value = {
      username: data.user_name || 'User',
      avatar: data.avatar || 'coin',
      email: data.email || '',
      createdAt: data.created_at,
    }
  } else {
    // No profile yet — create default
    await supabase.from('profiles').upsert({
      id: userId,
      user_name: 'User',
      avatar: 'coin',
      onboarded: false,
    })
    profile.value = {
      username: 'User',
      avatar: 'coin',
      email: '',
      createdAt: null,
    }
  }
}

// ============================================================
// UPDATE PROFILE (username and/or avatar)
// ============================================================

async function updateProfile(updates) {
  let authUser
  try {
    const { data } = await supabase.auth.getUser()
    authUser = data?.user
  } catch {
    return { success: false, error: 'Connection error. Please try again.' }
  }
  if (!authUser) return { success: false, error: 'Not authenticated' }

  const patch = {}
  if (updates.username !== undefined) patch.user_name = updates.username
  if (updates.avatar !== undefined) patch.avatar = updates.avatar

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', authUser.id)

  if (error) {
    console.error('[Profile] update error:', error.message)
    return { success: false, error: error.message }
  }

  if (updates.username !== undefined) profile.value.username = updates.username
  if (updates.avatar !== undefined) profile.value.avatar = updates.avatar

  return { success: true }
}

// ============================================================
// DELETE ACCOUNT (all user data)
// ============================================================

async function deleteAccount() {
  let authUser
  try {
    const { data } = await supabase.auth.getUser()
    authUser = data?.user
  } catch {
    return { success: false, error: 'Connection error. Please try again.' }
  }
  if (!authUser) return { success: false, error: 'Not authenticated' }

  const userId = authUser.id

  // Delete from all user-data tables (order doesn't matter due to CASCADE)
  const tables = ['transactions', 'shifts', 'recurring', 'budgets', 'savings_goals', 'ious', 'accounts', 'members', 'profiles']
  
  for (const table of tables) {
    await supabase.from(table).delete().eq('user_id', userId).then(r => {
      if (r.error && table !== 'profiles') console.warn(`[Delete] ${table}:`, r.error.message)
    })
  }
  // profiles uses 'id' not 'user_id'
  await supabase.from('profiles').delete().eq('id', userId)

  // Sign out
  await supabase.auth.signOut()

  // Reset local state
  profile.value = { username: 'User', avatar: 'coin', email: '', createdAt: null }

  return { success: true }
}

// ============================================================
// COMPOSABLE
// ============================================================

export function useProfile() {
  return {
    profile: computed(() => profile.value),
    avatarMeta: computed(() => getAvatarMeta(profile.value.avatar)),
    fetchProfile,
    updateProfile,
    deleteAccount,
    AVATARS,
    getAvatarMeta,
  }
}