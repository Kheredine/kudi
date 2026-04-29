/**
 * Reactive localStorage persistence with Supabase cloud sync
 * - localStorage acts as immediate cache
 * - Supabase provides cloud backup & multi-device sync
 */
import { watch } from 'vue'
import { supabase, isSupabaseConfigured, getDeviceId } from './useSupabase'

const STORAGE_PREFIX = 'kudi-'

export function useStorage(key, defaultValue) {
  const storageKey = STORAGE_PREFIX + key

  function load() {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw === null) return defaultValue
      return JSON.parse(raw)
    } catch {
      return defaultValue
    }
  }

  function save(value) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch (e) {
      console.warn('Storage save failed:', e)
    }
  }

  function remove() {
    localStorage.removeItem(storageKey)
  }

  return { load, save, remove }
}

/**
 * Deep watch a reactive object and persist to localStorage + Supabase
 */
export function persistReactive(reactiveObj, key) {
  const { load, save } = useStorage(key)

  // Load initial data from localStorage (instant)
  const saved = load()
  if (saved) {
    Object.assign(reactiveObj, saved)
  }

  // Watch and persist (debounced)
  let timeout = null
  watch(
    () => JSON.parse(JSON.stringify(reactiveObj)),
    (newVal) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        save(newVal)
        syncToSupabase(key, newVal)
      }, 300)
    },
    { deep: true }
  )

  return reactiveObj
}

// ============================================================
// SUPABASE SYNC
// ============================================================

let syncInitialized = false
let pendingSync = false

/**
 * Push local state to Supabase
 */
async function syncToSupabase(key, data) {
  if (!isSupabaseConfigured()) return
  if (pendingSync) return

  pendingSync = true
  const deviceId = getDeviceId()

  try {
    // Ensure profile exists
    await supabase
      .from('profiles')
      .upsert({
        id: deviceId,
        user_name: data.settings?.userName || 'User',
        base_currency: data.settings?.baseCurrency || 'USD',
        payday_day: data.settings?.paydayDay || 25,
        onboarded: true,
      }, { onConflict: 'id' })

    // Sync transactions
    if (data.transactions) {
      // Delete existing and re-insert (simple full sync)
      await supabase.from('transactions').delete().eq('profile_id', deviceId)
      if (data.transactions.length > 0) {
        const rows = data.transactions.map(t => ({
          id: t.id,
          profile_id: deviceId,
          type: t.type,
          amount: t.amount,
          currency: t.currency || 'USD',
          category: t.category || 'Other',
          label: t.label || '',
          date: t.date,
          note: t.note || '',
        }))
        // Insert in batches of 50
        for (let i = 0; i < rows.length; i += 50) {
          await supabase.from('transactions').insert(rows.slice(i, i + 50))
        }
      }
    }

    // Sync shifts
    if (data.shifts) {
      await supabase.from('shifts').delete().eq('profile_id', deviceId)
      if (data.shifts.length > 0) {
        const rows = data.shifts.map(s => ({
          id: s.id,
          profile_id: deviceId,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          break_hours: s.break_hours || 0,
          hourly_rate: s.hourly_rate || 25,
        }))
        await supabase.from('shifts').insert(rows)
      }
    }

    // Sync recurring
    if (data.recurring) {
      await supabase.from('recurring').delete().eq('profile_id', deviceId)
      if (data.recurring.length > 0) {
        const rows = data.recurring.map(r => ({
          id: r.id,
          profile_id: deviceId,
          name: r.name,
          type: r.type,
          amount: r.amount,
          currency: r.currency || 'USD',
          frequency: r.frequency,
          day: r.day,
          day_of_week: r.day_of_week,
          active: r.active,
        }))
        await supabase.from('recurring').insert(rows)
      }
    }
  } catch (err) {
    console.warn('[Supabase Sync] Failed:', err.message)
  } finally {
    pendingSync = false
  }
}

/**
 * Load data from Supabase (called on app init)
 * Returns null if no cloud data or not configured
 */
export async function loadFromSupabase() {
  if (!isSupabaseConfigured()) return null

  const deviceId = getDeviceId()

  try {
    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', deviceId)
      .single()

    if (!profile) return null

    // Load transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('profile_id', deviceId)
      .order('date', { ascending: false })

    // Load shifts
    const { data: shifts } = await supabase
      .from('shifts')
      .select('*')
      .eq('profile_id', deviceId)
      .order('date', { ascending: false })

    // Load recurring
    const { data: recurring } = await supabase
      .from('recurring')
      .select('*')
      .eq('profile_id', deviceId)

    return {
      settings: {
        userName: profile.user_name,
        baseCurrency: profile.base_currency,
        paydayDay: profile.payday_day,
      },
      transactions: (transactions || []).map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        currency: t.currency,
        category: t.category,
        label: t.label,
        date: t.date,
        note: t.note || '',
      })),
      shifts: (shifts || []).map(s => ({
        id: s.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        break_hours: Number(s.break_hours),
        hourly_rate: Number(s.hourly_rate),
      })),
      recurring: (recurring || []).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        amount: Number(r.amount),
        currency: r.currency,
        frequency: r.frequency,
        day: r.day,
        day_of_week: r.day_of_week,
        active: r.active,
      })),
    }
  } catch (err) {
    console.warn('[Supabase Load] Failed:', err.message)
    return null
  }
}

/**
 * Export data as JSON file
 */
export function exportData() {
  const data = localStorage.getItem('kudi-finance-data')
  if (!data) return

  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kudi-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export data as CSV
 */
export function exportCSV() {
  const data = localStorage.getItem('kudi-finance-data')
  if (!data) return

  const parsed = JSON.parse(data)
  const transactions = parsed.transactions || []
  if (transactions.length === 0) return

  const headers = ['Date', 'Type', 'Category', 'Label', 'Amount', 'Currency', 'Note']
  const rows = transactions.map(t => [
    t.date,
    t.type,
    t.category,
    `"${(t.label || '').replace(/"/g, '""')}"`,
    t.amount,
    t.currency || 'USD',
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kudi-transactions-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Import data from JSON file
 */
export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    if (!data.transactions && !data.shifts && !data.settings) {
      throw new Error('Invalid backup file')
    }
    localStorage.setItem('kudi-finance-data', jsonString)
    return true
  } catch (err) {
    console.warn('Import failed:', err.message)
    return false
  }
}