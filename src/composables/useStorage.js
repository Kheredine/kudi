/**
 * Supabase-first data layer
 * - Supabase is the single source of truth
 * - No localStorage for persistent data
 * - localStorage only for temporary UI state (theme, blur toggle)
 */
import { supabase } from './useSupabase'

// ============================================================
// ERROR HANDLING
// ============================================================

function handleError(operation, err) {
  console.error(`[Supabase ${operation}] Failed:`, err.message)
  throw err // Let caller handle it — NO silent fallback to localStorage
}

// ============================================================
// DATA LOADING — Fetch ALL user data from Supabase
// ============================================================

export async function loadAllData(userId) {
  if (!userId) return null

  try {
    // Load profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileErr && profileErr.code !== 'PGRST116') {
      handleError('Load Profile', profileErr)
    }

    // Load transactions
    const { data: transactions, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (txErr) handleError('Load Transactions', txErr)

    // Load shifts
    const { data: shifts, error: shiftErr } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (shiftErr) handleError('Load Shifts', shiftErr)

    // Load recurring
    const { data: recurring, error: recErr } = await supabase
      .from('recurring')
      .select('*')
      .eq('user_id', userId)

    if (recErr) handleError('Load Recurring', recErr)

    // Load budgets
    const { data: budgets, error: budgetErr } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)

    if (budgetErr) handleError('Load Budgets', budgetErr)

    // Load savings goals
    const { data: savingsGoals, error: goalErr } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)

    if (goalErr) handleError('Load Goals', goalErr)

    // Load IOUs
    const { data: ious, error: iouErr } = await supabase
      .from('ious')
      .select('*')
      .eq('user_id', userId)

    if (iouErr) handleError('Load IOUs', iouErr)

    // Load accounts
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)

    if (accErr) handleError('Load Accounts', accErr)

    // Load members
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)

    if (memErr) handleError('Load Members', memErr)

    return {
      settings: profile ? {
        userName: profile.user_name,
        avatar: profile.avatar,
        baseCurrency: profile.base_currency,
        paydayDay: profile.payday_day,
        payday1: profile.payday1,
        payday2: profile.payday2,
        paydayDateOverrides: profile.payday_date_overrides || {},
        language: profile.language,
        theme: profile.theme,
        activeAccountId: profile.active_account_id,
        paycheckMode: profile.paycheck_mode || 'none',
        payPeriods: profile.pay_periods || [],
      } : null,
      transactions: (transactions || []).map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        currency: t.currency,
        category: t.category,
        label: t.label,
        date: t.date,
        note: t.note || '',
        accountId: t.account_id,
        memberId: t.member_id,
        isRecurringRef: t.recurring_ref,
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
        accountId: r.account_id || null,
        goalId: r.goal_id || null,
      })),
      budgets: (budgets || []).map(b => ({
        id: b.id,
        category: b.category,
        limit: Number(b.limit_amount),
        createdAt: b.created_at,
      })),
      savingsGoals: (savingsGoals || []).map(g => ({
        id: g.id,
        name: g.name,
        target: Number(g.target),
        saved: Number(g.saved),
        icon: g.icon,
        deadline: g.deadline,
        createdAt: g.created_at,
      })),
      ious: (ious || []).map(i => ({
        id: i.id,
        person: i.person,
        amount: Number(i.amount),
        dateLent: i.date_lent,
        dueDate: i.due_date,
        interestRate: Number(i.interest_rate),
        notes: i.notes,
        paid: i.paid,
      })),
      accounts: (accounts || []).map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        icon: a.icon,
        color: a.color,
        currency: a.currency,
        initialBalance: Number(a.initial_balance),
        createdAt: a.created_at,
      })),
      members: (members || []).map(m => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        color: m.color,
        role: m.role,
        joinedAt: m.joined_at,
      })),
      lastRecurringGen: profile?.last_recurring_gen || null,
    }
  } catch (err) {
    handleError('Load All', err)
    return null
  }
}

// ============================================================
// PROFILE / SETTINGS
// ============================================================

export async function upsertProfile(userId, settings) {
  const { error: err } = await supabase.from('profiles').upsert({
    id: userId,
    user_name: settings.userName || 'User',
    avatar: settings.avatar || null,
    base_currency: settings.baseCurrency || 'USD',
    payday_day: settings.paydayDay || 25,
    payday1: settings.payday1 || 10,
    payday2: settings.payday2 || 25,
    payday_date_overrides: settings.paydayDateOverrides || {},
    language: settings.language || 'en',
    theme: settings.theme || 'dark',
    active_account_id: settings.activeAccountId || null,
    last_recurring_gen: settings.lastRecurringGen || null,
    paycheck_mode: settings.paycheckMode || 'none',
    pay_periods: settings.payPeriods || [],
    onboarded: true,
  }, { onConflict: 'id' })

  if (err) handleError('Upsert Profile', err)
}

// ============================================================
// TRANSACTIONS
// ============================================================

export async function insertTransaction(userId, txn) {
  const { data, error: err } = await supabase.from('transactions').insert({
    user_id: userId,
    type: txn.type,
    amount: txn.amount,
    currency: txn.currency || 'USD',
    category: txn.category || 'Other',
    label: txn.label || '',
    date: txn.date,
    note: txn.note || '',
    account_id: txn.accountId || null,
    member_id: txn.memberId || null,
    recurring_ref: txn.isRecurringRef || null,
  }).select().single()

  if (err) handleError('Insert Transaction', err)
  return data
}

export async function updateTransaction(userId, id, updates) {
  const row = {}
  if (updates.type !== undefined) row.type = updates.type
  if (updates.amount !== undefined) row.amount = updates.amount
  if (updates.currency !== undefined) row.currency = updates.currency
  if (updates.category !== undefined) row.category = updates.category
  if (updates.label !== undefined) row.label = updates.label
  if (updates.date !== undefined) row.date = updates.date
  if (updates.note !== undefined) row.note = updates.note
  if (updates.accountId !== undefined) row.account_id = updates.accountId
  if (updates.memberId !== undefined) row.member_id = updates.memberId

  const { error: err } = await supabase.from('transactions')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Update Transaction', err)
}

export async function deleteTransaction(userId, id) {
  const { error: err } = await supabase.from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Delete Transaction', err)
}

// ============================================================
// SHIFTS
// ============================================================

export async function insertShift(userId, shift) {
  const { data, error: err } = await supabase.from('shifts').insert({
    user_id: userId,
    date: shift.date,
    start_time: shift.start_time,
    end_time: shift.end_time,
    break_hours: shift.break_hours || 0,
    hourly_rate: shift.hourly_rate || 25,
  }).select().single()

  if (err) handleError('Insert Shift', err)
  return data
}

export async function updateShift(userId, id, updates) {
  const row = {}
  if (updates.date !== undefined) row.date = updates.date
  if (updates.start_time !== undefined) row.start_time = updates.start_time
  if (updates.end_time !== undefined) row.end_time = updates.end_time
  if (updates.break_hours !== undefined) row.break_hours = updates.break_hours
  if (updates.hourly_rate !== undefined) row.hourly_rate = updates.hourly_rate

  const { error: err } = await supabase.from('shifts')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Update Shift', err)
}

export async function deleteShift(userId, id) {
  const { error: err } = await supabase.from('shifts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Delete Shift', err)
}

// ============================================================
// RECURRING
// ============================================================

export async function insertRecurring(userId, item) {
  const { data, error: err } = await supabase.from('recurring').insert({
    user_id: userId,
    name: item.name,
    type: item.type || 'expense',
    amount: item.amount,
    currency: item.currency || 'USD',
    frequency: item.frequency || 'monthly',
    day: item.day || null,
    day_of_week: item.day_of_week || null,
    active: true,
    account_id: item.accountId || null,
    goal_id: item.goalId || null,
  }).select().single()

  if (err) handleError('Insert Recurring', err)
  return data
}

export async function updateRecurring(userId, id, updates) {
  const row = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.type !== undefined) row.type = updates.type
  if (updates.amount !== undefined) row.amount = updates.amount
  if (updates.currency !== undefined) row.currency = updates.currency
  if (updates.frequency !== undefined) row.frequency = updates.frequency
  if (updates.day !== undefined) row.day = updates.day
  if (updates.day_of_week !== undefined) row.day_of_week = updates.day_of_week
  if (updates.active !== undefined) row.active = updates.active
  if (updates.accountId !== undefined) row.account_id = updates.accountId
  if (updates.goalId !== undefined) row.goal_id = updates.goalId

  const { error: err } = await supabase.from('recurring')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Update Recurring', err)
}

export async function deleteRecurring(userId, id) {
  const { error: err } = await supabase.from('recurring')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Delete Recurring', err)
}

// ============================================================
// BUDGETS
// ============================================================

export async function upsertBudget(userId, category, limit) {
  const { data, error: err } = await supabase.from('budgets').upsert({
    user_id: userId,
    category,
    limit_amount: limit,
  }, { onConflict: 'id' }).select().single()

  if (err) handleError('Upsert Budget', err)
  return data
}

export async function insertBudget(userId, budget) {
  const { data, error: err } = await supabase.from('budgets').insert({
    user_id: userId,
    category: budget.category,
    limit_amount: budget.limit,
  }).select().single()

  if (err) handleError('Insert Budget', err)
  return data
}

export async function updateBudget(userId, id, updates) {
  const row = {}
  if (updates.category !== undefined) row.category = updates.category
  if (updates.limit !== undefined) row.limit_amount = updates.limit

  const { error: err } = await supabase.from('budgets')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Update Budget', err)
}

export async function deleteBudget(userId, id) {
  const { error: err } = await supabase.from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Delete Budget', err)
}

// ============================================================
// SAVINGS GOALS
// ============================================================

export async function insertSavingsGoal(userId, goal) {
  const { data, error: err } = await supabase.from('savings_goals').insert({
    user_id: userId,
    name: goal.name,
    target: goal.target || 0,
    saved: goal.saved || 0,
    icon: goal.icon || '🎯',
    deadline: goal.deadline || null,
  }).select().single()

  if (err) handleError('Insert Savings Goal', err)
  return data
}

export async function updateSavingsGoal(userId, id, updates) {
  const row = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.target !== undefined) row.target = updates.target
  if (updates.saved !== undefined) row.saved = updates.saved
  if (updates.icon !== undefined) row.icon = updates.icon
  if (updates.deadline !== undefined) row.deadline = updates.deadline

  const { error: err } = await supabase.from('savings_goals')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Update Savings Goal', err)
}

export async function deleteSavingsGoal(userId, id) {
  const { error: err } = await supabase.from('savings_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Delete Savings Goal', err)
}

// ============================================================
// IOUS
// ============================================================

export async function insertIOU(userId, iou) {
  const { data, error: err } = await supabase.from('ious').insert({
    user_id: userId,
    person: iou.person,
    amount: iou.amount,
    date_lent: iou.dateLent,
    due_date: iou.dueDate || null,
    interest_rate: iou.interestRate || 0,
    notes: iou.notes || '',
    paid: false,
  }).select().single()

  if (err) handleError('Insert IOU', err)
  return data
}

export async function updateIOU(userId, id, updates) {
  const row = {}
  if (updates.person !== undefined) row.person = updates.person
  if (updates.amount !== undefined) row.amount = updates.amount
  if (updates.dateLent !== undefined) row.date_lent = updates.dateLent
  if (updates.dueDate !== undefined) row.due_date = updates.dueDate
  if (updates.interestRate !== undefined) row.interest_rate = updates.interestRate
  if (updates.notes !== undefined) row.notes = updates.notes
  if (updates.paid !== undefined) row.paid = updates.paid

  const { error: err } = await supabase.from('ious')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Update IOU', err)
}

export async function deleteIOU(userId, id) {
  const { error: err } = await supabase.from('ious')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Delete IOU', err)
}

// ============================================================
// ACCOUNTS
// ============================================================

export async function insertAccount(userId, account) {
  const { data, error: err } = await supabase.from('accounts').insert({
    user_id: userId,
    name: account.name || 'Untitled Account',
    type: account.type || 'checking',
    icon: account.icon || '💳',
    color: account.color || '#22C55E',
    currency: account.currency || 'USD',
    initial_balance: account.initialBalance || 0,
  }).select().single()

  if (err) handleError('Insert Account', err)
  return data
}

export async function updateAccount(userId, id, updates) {
  const row = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.type !== undefined) row.type = updates.type
  if (updates.icon !== undefined) row.icon = updates.icon
  if (updates.color !== undefined) row.color = updates.color
  if (updates.currency !== undefined) row.currency = updates.currency
  if (updates.initialBalance !== undefined) row.initial_balance = updates.initialBalance

  const { error: err } = await supabase.from('accounts')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Update Account', err)
}

export async function deleteAccount(userId, id) {
  const { error: err } = await supabase.from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Delete Account', err)
}

// ============================================================
// MEMBERS
// ============================================================

export async function insertMember(userId, member) {
  const { data, error: err } = await supabase.from('members').insert({
    user_id: userId,
    name: member.name || 'Unknown',
    avatar: member.avatar || '👤',
    color: member.color || '#6366F1',
    role: member.role || 'member',
  }).select().single()

  if (err) handleError('Insert Member', err)
  return data
}

export async function updateMember(userId, id, updates) {
  const row = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.avatar !== undefined) row.avatar = updates.avatar
  if (updates.color !== undefined) row.color = updates.color
  if (updates.role !== undefined) row.role = updates.role

  const { error: err } = await supabase.from('members')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Update Member', err)
}

export async function deleteMember(userId, id) {
  const { error: err } = await supabase.from('members')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (err) handleError('Delete Member', err)
}

// ============================================================
// RESET ALL DATA
// ============================================================

export async function resetAllData(userId) {
  if (!userId) return

  const tables = ['transactions', 'shifts', 'recurring', 'budgets', 'savings_goals', 'ious', 'accounts', 'members']
  for (const table of tables) {
    const { error: err } = await supabase.from(table)
      .delete()
      .eq('user_id', userId)
    if (err) console.warn(`[Reset ${table}]`, err.message)
  }

  const { error: err } = await supabase.from('profiles')
    .delete()
    .eq('id', userId)
  if (err) console.warn('[Reset Profile]', err.message)
}

// ============================================================
// MIGRATION: localStorage → Supabase (one-time)
// ============================================================

export async function migrateLocalData(userId) {
  if (!userId) return false

  const migrationKey = 'kudi-migrated'
  if (localStorage.getItem(migrationKey) === 'true') return false

  const raw = localStorage.getItem('kudi-finance-data')
  if (!raw) {
    localStorage.setItem(migrationKey, 'true')
    return false
  }

  try {
    const local = JSON.parse(raw)
    if (!local.transactions && !local.shifts && !local.settings) {
      localStorage.setItem(migrationKey, 'true')
      return false
    }

    console.log('[Migration] Found localStorage data, migrating to Supabase...')

    // Upsert profile/settings
    if (local.settings) {
      await upsertProfile(userId, local.settings)
    }

    // Migrate transactions
    if (local.transactions?.length > 0) {
      const rows = local.transactions.map(t => ({
        user_id: userId,
        type: t.type,
        amount: t.amount,
        currency: t.currency || 'USD',
        category: t.category || 'Other',
        label: t.label || '',
        date: t.date,
        note: t.note || '',
        account_id: t.accountId || null,
        member_id: t.memberId || null,
        recurring_ref: t.isRecurringRef || null,
      }))
      for (let i = 0; i < rows.length; i += 50) {
        await supabase.from('transactions').insert(rows.slice(i, i + 50))
      }
    }

    // Migrate shifts
    if (local.shifts?.length > 0) {
      const rows = local.shifts.map(s => ({
        user_id: userId,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        break_hours: s.break_hours || 0,
        hourly_rate: s.hourly_rate || 25,
      }))
      await supabase.from('shifts').insert(rows)
    }

    // Migrate recurring
    if (local.recurring?.length > 0) {
      const rows = local.recurring.map(r => ({
        user_id: userId,
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

    // Migrate budgets
    if (local.budgets?.length > 0) {
      const rows = local.budgets.map(b => ({
        user_id: userId,
        category: b.category,
        limit_amount: b.limit,
      }))
      await supabase.from('budgets').insert(rows)
    }

    // Migrate savings goals
    if (local.savingsGoals?.length > 0) {
      const rows = local.savingsGoals.map(g => ({
        user_id: userId,
        name: g.name,
        target: g.target,
        saved: g.saved,
        icon: g.icon || '🎯',
        deadline: g.deadline || null,
      }))
      await supabase.from('savings_goals').insert(rows)
    }

    // Migrate IOUs
    if (local.ious?.length > 0) {
      const rows = local.ious.map(i => ({
        user_id: userId,
        person: i.person,
        amount: i.amount,
        date_lent: i.dateLent,
        due_date: i.dueDate || null,
        interest_rate: i.interestRate || 0,
        notes: i.notes || '',
        paid: i.paid || false,
      }))
      await supabase.from('ious').insert(rows)
    }

    // Migrate accounts
    if (local.accounts?.length > 0) {
      const rows = local.accounts.map(a => ({
        user_id: userId,
        name: a.name,
        type: a.type,
        icon: a.icon,
        color: a.color,
        currency: a.currency,
        initial_balance: a.initialBalance || 0,
      }))
      await supabase.from('accounts').insert(rows)
    }

    // Migrate members
    if (local.members?.length > 0) {
      const rows = local.members.map(m => ({
        user_id: userId,
        name: m.name,
        avatar: m.avatar,
        color: m.color,
        role: m.role,
      }))
      await supabase.from('members').insert(rows)
    }

    // Clear localStorage data (keep only UI preferences)
    const keysToKeep = ['kudi-blur-unlocked', 'kudi-currency-from', 'kudi-currency-to', 'kudi-install-dismissed', 'kudi-fx-cache']
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('kudi-') && !keysToKeep.includes(key) && key !== migrationKey) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    localStorage.setItem(migrationKey, 'true')

    console.log('[Migration] Successfully migrated local data to Supabase')
    return true
  } catch (err) {
    console.error('[Migration] Failed:', err.message)
    return false
  }
}

// ============================================================
// REAL-TIME SUBSCRIPTION
// ============================================================

export function subscribeToChanges(userId, callbacks) {
  if (!userId) return () => {}

  const channel = supabase
    .channel(`user-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, (payload) => {
      if (callbacks.onTransactionChange) callbacks.onTransactionChange(payload)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `user_id=eq.${userId}` }, (payload) => {
      if (callbacks.onShiftChange) callbacks.onShiftChange(payload)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring', filter: `user_id=eq.${userId}` }, (payload) => {
      if (callbacks.onRecurringChange) callbacks.onRecurringChange(payload)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` }, (payload) => {
      if (callbacks.onBudgetChange) callbacks.onBudgetChange(payload)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals', filter: `user_id=eq.${userId}` }, (payload) => {
      if (callbacks.onSavingsGoalChange) callbacks.onSavingsGoalChange(payload)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ious', filter: `user_id=eq.${userId}` }, (payload) => {
      if (callbacks.onIOUChange) callbacks.onIOUChange(payload)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${userId}` }, (payload) => {
      if (callbacks.onAccountChange) callbacks.onAccountChange(payload)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `user_id=eq.${userId}` }, (payload) => {
      if (callbacks.onMemberChange) callbacks.onMemberChange(payload)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================================
// EXPORT UTILITIES (kept for backward compatibility)
// ============================================================

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
    `"${(t.category || '').replace(/"/g, '""')}"`,
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