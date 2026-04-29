import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseKey)
}

/**
 * Generate or retrieve a user device ID for anonymous auth
 */
export function getDeviceId() {
  let id = localStorage.getItem('kudi-device-id')
  if (!id) {
    id = 'dev_' + crypto.randomUUID()
    localStorage.setItem('kudi-device-id', id)
  }
  return id
}