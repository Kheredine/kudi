import { reactive, computed, ref } from 'vue'
import * as storage from './useStorage'

// ============================================================
// DATE UTILITIES
// ============================================================

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateStr(d) {
  const date = new Date(d)
  return date.toISOString().split('T')[0]
}

function today() {
  return toDateStr(new Date())
}

function daysBetween(a, b) {
  return Math.ceil((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24))
}

function getDayOfWeek(dateStr) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(dateStr + 'T00:00:00').getDay()]
}

/** Safe number — returns 0 for NaN / Infinity / undefined */
function safeNum(n) {
  const num = Number(n)
  return (isNaN(num) || !isFinite(num)) ? 0 : num
}

// ============================================================
// CURRENCY FORMATTING (respects settings)
// ============================================================

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', XAF: 'FCFA', XOF: 'FCFA',
  RUB: '₽', JPY: '¥', CNY: '¥', CAD: 'C$', AUD: 'A$',
  NGN: '₦', GHS: '₵', KES: 'KSh',
}

function getCurrencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || code || '$'
}

function fmtCurrency(amount, currency) {
  const symbol = getCurrencySymbol(currency)
  const num = Number(amount)
  if (isNaN(num) || !isFinite(num)) return `${symbol}0.00`
  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ============================================================
// DEFAULT / EMPTY STATE (no seed data)
// ============================================================

// ============================================================
// CATEGORY ICONS
// ============================================================

export const CATEGORY_ICONS = {
  'Food & Drink': '🍔',
  'Subscription': '📱',
  'Transport': '🚌',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Utilities': '💡',
  'Other': '📦',
  'Income': '💰',
  'Freelance': '💻',
  'Gift': '🎁',
  'Savings': '🏦',
  'Vault': '🔐',
  'Emergency Fund': '🚨',
  'Investment': '📈',
}

function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || '📦'
}

function createDefaultState() {
  return {
    settings: {
      baseCurrency: 'RUB',
      paydayDay: 25,
      payday1: 10,
      payday2: 25,
      paydayDateOverrides: {},
      userName: '',
      language: 'en',
      theme: 'dark',
      activeAccountId: null,
      paycheckMode: 'none',
      payPeriods: [],
    },
    accounts: [],
    members: [],
    shifts: [],
    transactions: [],
    recurring: [],
    budgets: [],
    savingsGoals: [],
    ious: [],
    lastRecurringGen: null,
  }
}

// ============================================================
// CORE STATE (Singleton)
// ============================================================

const rawState = createDefaultState()
const state = reactive(rawState)

// Supabase state tracking
const dataLoaded = ref(false)
const lastDbError = ref(null)
let _userId = null

/** Track Supabase errors so the UI can display them */
function trackDbError(operation, err) {
  const msg = err?.message || String(err)
  console.error(`[Supabase ${operation}]`, msg)
  const time = Date.now()
  lastDbError.value = { operation, message: msg, time }
  // Auto-clear after 5 seconds
  setTimeout(() => {
    if (lastDbError.value?.time === time) lastDbError.value = null
  }, 5000)
}

/**
 * Initialize data from Supabase. Called once after auth.
 */
async function initData(userId) {
  if (!userId) return
  _userId = userId

  try {
    const data = await storage.loadAllData(userId)
    if (data) {
      if (data.settings) Object.assign(state.settings, data.settings)
      state.transactions = data.transactions || []
      state.shifts = data.shifts || []
      state.recurring = data.recurring || []
      state.budgets = data.budgets || []
      state.savingsGoals = data.savingsGoals || []
      state.ious = data.ious || []
      state.accounts = data.accounts || []
      state.members = data.members || []
      state.lastRecurringGen = data.lastRecurringGen || null
    }
  } catch (err) {
    console.warn('[initData] Load failed, starting fresh:', err.message)
  }

  dataLoaded.value = true
}

// First-run detection
const isFirstRun = computed(() => {
  return state.transactions.length === 0 &&
    state.shifts.length === 0 &&
    state.recurring.length === 0 &&
    !state.settings.userName
})

// ============================================================
// ID GENERATOR
// ============================================================

let _nextId = 1000
function nextId() {
  return _nextId++
}

// ============================================================
// SHIFT → INCOME ENGINE
// ============================================================

function calculateShiftHours(shift) {
  const [startH, startM] = shift.start_time.split(':').map(Number)
  const [endH, endM] = shift.end_time.split(':').map(Number)

  let startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }

  const totalMinutes = endMinutes - startMinutes
  const breakMinutes = (shift.break_hours || 0) * 60

  return Math.max(0, (totalMinutes - breakMinutes) / 60)
}

function calculateShiftIncome(shift) {
  const hours = calculateShiftHours(shift)
  return hours * (shift.hourly_rate || 0)
}

function getPayPeriod(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()
  const p1 = state.settings.payday1 || 10
  const p2 = state.settings.payday2 || 25

  let payDate
  if (day <= p1) {
    payDate = new Date(year, month, p1)
  } else if (day <= p2) {
    payDate = new Date(year, month, p2)
  } else {
    payDate = new Date(year, month + 1, p1)
  }

  const payDateStr = toDateStr(payDate)
  const overrideDate = state.settings.paydayDateOverrides?.[payDateStr]
  return {
    period: payDateStr,
    payDate: overrideDate || payDateStr,
    defaultPayDate: payDateStr,
  }
}

const shiftIncomes = computed(() => {
  return state.shifts.map((shift) => {
    const hours = calculateShiftHours(shift)
    const income = calculateShiftIncome(shift)
    const payPeriod = getPayPeriod(shift.date)
    return {
      ...shift,
      calculated_hours: Math.round(hours * 100) / 100,
      calculated_income: Math.round(income * 100) / 100,
      pay_period: payPeriod.period,
      pay_date: payPeriod.payDate,
    }
  })
})

const futureShiftIncome = computed(() => {
  const todayStr = today()
  return shiftIncomes.value
    .filter((s) => s.date > todayStr)
    .reduce((sum, s) => sum + s.calculated_income, 0)
})

const paydayGroups = computed(() => {
  const todayStr = today()
  const groups = {}

  shiftIncomes.value.forEach((shift) => {
    const key = shift.pay_period
    if (!groups[key]) {
      groups[key] = {
        defaultPayDate: key,
        payDate: shift.pay_date,
        shifts: [],
        totalHours: 0,
        totalIncome: 0,
      }
    }
    groups[key].shifts.push(shift)
    groups[key].totalHours += shift.calculated_hours
    groups[key].totalIncome += shift.calculated_income
  })

  return Object.values(groups)
    .map((g) => ({
      ...g,
      totalHours: Math.round(g.totalHours * 100) / 100,
      totalIncome: Math.round(g.totalIncome * 100) / 100,
      isPast: g.payDate < todayStr,
      shiftCount: g.shifts.length,
    }))
    .sort((a, b) => a.payDate.localeCompare(b.payDate))
})

// ============================================================
// PAYCHECK SUMMARY (respects paycheckMode)
// ============================================================

const paycheckSummary = computed(() => {
  const mode = state.settings.paycheckMode || 'none'
  const periods = state.settings.payPeriods || []
  const all = shiftIncomes.value

  const totalHours = Math.round(all.reduce((s, sh) => s + sh.calculated_hours, 0) * 100) / 100
  const totalAmount = Math.round(all.reduce((s, sh) => s + sh.calculated_income, 0) * 100) / 100

  if (mode === 'none' || !periods.length) {
    return { mode: 'none', totalHours, totalAmount, shifts: all }
  }

  const groups = {}

  all.forEach(shift => {
    const d = new Date(shift.date + 'T00:00:00')
    const day = d.getDate()
    const month = d.getMonth()
    const year = d.getFullYear()
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()

    for (const p of periods) {
      const effectiveEnd = p.endDay >= 28 ? lastDayOfMonth : p.endDay
      if (day >= p.startDay && day <= effectiveEnd) {
        const mm = String(month + 1).padStart(2, '0')
        const key = `${year}-${mm}-p${p.id}`
        if (!groups[key]) {
          // payDay < startDay means it falls in the following month
          let pYear = year, pMonth = month + 1
          if (p.payDay < p.startDay) {
            pMonth++
            if (pMonth > 12) { pMonth = 1; pYear++ }
          }
          groups[key] = {
            key,
            periodId: p.id,
            label: p.label || `Period ${p.id}`,
            start: `${year}-${mm}-${String(p.startDay).padStart(2, '0')}`,
            end: `${year}-${mm}-${String(effectiveEnd).padStart(2, '0')}`,
            payDate: `${pYear}-${String(pMonth).padStart(2, '0')}-${String(p.payDay).padStart(2, '0')}`,
            shifts: [],
            totalHours: 0,
            totalAmount: 0,
          }
        }
        groups[key].shifts.push(shift)
        groups[key].totalHours += shift.calculated_hours
        groups[key].totalAmount += shift.calculated_income
        break
      }
    }
  })

  const groupList = Object.values(groups)
    .map(g => ({
      ...g,
      totalHours: Math.round(g.totalHours * 100) / 100,
      totalAmount: Math.round(g.totalAmount * 100) / 100,
      isPast: g.payDate < today(),
      shiftCount: g.shifts.length,
    }))
    .sort((a, b) => b.payDate.localeCompare(a.payDate))

  return { mode: 'period', groups: groupList, totalHours, totalAmount }
})

// ============================================================
// IOU ENGINE
// ============================================================

const iouSummary = computed(() => {
  const todayStr = today()
  return (state.ious || [])
    .map((iou) => {
      const daysElapsed = Math.max(0, daysBetween(iou.dateLent, todayStr))
      const interest = (iou.interestRate || 0) > 0
        ? iou.amount * (iou.interestRate / 100) * (daysElapsed / 365)
        : 0
      const totalDue = iou.amount + interest
      const isOverdue = iou.dueDate && iou.dueDate < todayStr && !iou.paid
      const daysUntilDue = iou.dueDate ? daysBetween(todayStr, iou.dueDate) : null
      return {
        ...iou,
        daysElapsed,
        interest: Math.round(interest * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        isOverdue,
        daysUntilDue,
      }
    })
    .sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
      return (a.dueDate || '').localeCompare(b.dueDate || '')
    })
})

function addIOU(iou) {
  if (!iou.person || !iou.person.trim()) return { success: false, errors: ['Person name is required'] }
  if (!iou.amount || Number(iou.amount) <= 0) return { success: false, errors: ['Amount must be greater than 0'] }
  if (!state.ious) state.ious = []
  const item = {
    id: nextId(),
    person: iou.person.trim(),
    amount: Number(iou.amount),
    dateLent: iou.dateLent || today(),
    dueDate: iou.dueDate || null,
    interestRate: Number(iou.interestRate || 0),
    notes: iou.notes || '',
    paid: false,
  }
  state.ious.push(item)
  if (_userId) storage.insertIOU(_userId, item).catch(err => trackDbError('Insert IOU', err))
  return { success: true, errors: [] }
}

function updateIOU(id, updates) {
  const item = (state.ious || []).find((i) => i.id === id)
  if (item) {
    Object.assign(item, updates)
    if (_userId) storage.updateIOU(_userId, id, updates).catch(err => trackDbError('Update IOU', err))
  }
}

function deleteIOU(id) {
  if (!state.ious) return
  const idx = state.ious.findIndex((i) => i.id === id)
  if (idx > -1) {
    state.ious.splice(idx, 1)
    if (_userId) storage.deleteIOU(_userId, id).catch(err => trackDbError('Delete IOU', err))
  }
}

function setPaydayOverride(defaultDate, overrideDate) {
  if (!state.settings.paydayDateOverrides) state.settings.paydayDateOverrides = {}
  if (overrideDate) {
    state.settings.paydayDateOverrides[defaultDate] = overrideDate
  } else {
    delete state.settings.paydayDateOverrides[defaultDate]
  }
}

// ============================================================
// RECURRING ENGINE
// ============================================================

function generateRecurringInstances(daysAhead = 60) {
  const instances = []
  const todayDate = new Date()
  const todayStr = today()

  state.recurring
    .filter((r) => r.active)
    .forEach((rec) => {
      for (let i = 1; i <= daysAhead; i++) {
        const futureDate = addDays(todayDate, i)
        const futureStr = toDateStr(futureDate)
        let match = false

        if (rec.frequency === 'monthly' && rec.day) {
          if (futureDate.getDate() === rec.day) match = true
        } else if (rec.frequency === 'weekly' && rec.day_of_week) {
          if (getDayOfWeek(futureStr) === rec.day_of_week) match = true
        } else if (rec.frequency === 'daily') {
          match = true
        }

        if (match) {
          instances.push({
            recurringId: rec.id,
            label: rec.name,
            amount: rec.amount,
            type: rec.type === 'expense' ? 'expense' : 'saving',
            date: futureStr,
            currency: rec.currency || 'USD',
            isRecurring: true,
          })
        }
      }
    })

  return instances.sort((a, b) => a.date.localeCompare(b.date))
}

// ============================================================
// BALANCE SYSTEM
// ============================================================

const totalIncome = computed(() =>
  safeNum(state.transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + safeNum(t.amount), 0))
)

const totalExpenses = computed(() =>
  safeNum(state.transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + safeNum(t.amount), 0))
)

const totalSavings = computed(() =>
  safeNum(state.transactions
    .filter((t) => t.type === 'saving')
    .reduce((sum, t) => sum + safeNum(t.amount), 0))
)

const currentBalance = computed(() =>
  safeNum(totalIncome.value - totalExpenses.value - totalSavings.value)
)

const pendingIncome = computed(() => futureShiftIncome.value)

const balance = computed(() => currentBalance.value)

// ============================================================
// FORECAST ENGINE
// ============================================================

function generateForecast(days = 30) {
  const items = []
  let runningBalance = currentBalance.value
  const todayDate = new Date()

  const futureShifts = shiftIncomes.value
    .filter((s) => s.date > today())
    .map((s) => ({
      date: s.date,
      label: `Shift Income (${s.calculated_hours}h)`,
      amount: s.calculated_income,
      type: 'income',
      isShift: true,
    }))

  const recurringInstances = generateRecurringInstances(days)

  const allEvents = [...futureShifts, ...recurringInstances]
    .sort((a, b) => a.date.localeCompare(b.date))

  const cutoff = toDateStr(addDays(todayDate, days))

  allEvents
    .filter((e) => e.date <= cutoff)
    .forEach((event) => {
      if (event.type === 'income') {
        runningBalance += event.amount
      } else {
        runningBalance -= event.amount
      }
      items.push({
        date: event.date,
        label: event.label,
        amount: event.type === 'income' ? event.amount : -event.amount,
        type: event.type,
        runningBalance: Math.round(runningBalance * 100) / 100,
        isRecurring: event.isRecurring || false,
        isShift: event.isShift || false,
      })
    })

  return items
}

const forecast = computed(() => generateForecast(30))

const lowestBalancePoint = computed(() => {
  if (forecast.value.length === 0) {
    return { day: 0, balance: currentBalance.value }
  }
  let min = { day: 0, balance: currentBalance.value }
  let currentMin = currentBalance.value
  forecast.value.forEach((item, idx) => {
    if (item.runningBalance < currentMin) {
      currentMin = item.runningBalance
      min = { day: idx + 1, balance: item.runningBalance, date: item.date }
    }
  })
  return min
})

const chartData = computed(() => {
  const points = [{ day: 0, balance: currentBalance.value }]
  forecast.value.forEach((item, idx) => {
    points.push({ day: idx + 1, balance: item.runningBalance, date: item.date })
  })
  return points
})

// ============================================================
// PAYDAY
// ============================================================

const daysUntilPayday = computed(() => {
  const now = new Date()
  const paydayDay = state.settings.paydayDay
  let payday = new Date(now.getFullYear(), now.getMonth(), paydayDay)
  if (now.getDate() >= paydayDay) {
    payday = new Date(now.getFullYear(), now.getMonth() + 1, paydayDay)
  }
  return Math.max(0, Math.ceil((payday - now) / (1000 * 60 * 60 * 24)))
})

const nextPayday = computed(() => {
  const now = new Date()
  const paydayDay = state.settings.paydayDay
  let payday = new Date(now.getFullYear(), now.getMonth(), paydayDay)
  if (now.getDate() >= paydayDay) {
    payday = new Date(now.getFullYear(), now.getMonth() + 1, paydayDay)
  }
  return payday
})

// ============================================================
// SMART INSIGHTS ENGINE (currency-aware)
// ============================================================

const avgDailySpend = computed(() => {
  const expenses = state.transactions.filter((t) => t.type === 'expense')
  if (expenses.length === 0) return 0
  const total = expenses.reduce((sum, t) => sum + t.amount, 0)
  const dates = expenses.map((t) => new Date(t.date).getTime())
  const days = Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24)))
  return Math.round((total / days) * 100) / 100
})

const savingsRate = computed(() => {
  if (totalIncome.value === 0) return 0
  return Math.round((totalSavings.value / totalIncome.value) * 100)
})

const cs = () => getCurrencySymbol(state.settings.baseCurrency)
const fmtBal = (n) => `${cs()}${safeNum(n).toFixed(2)}`

const insights = computed(() => {
  const list = []
  const sym = cs()

  // 1. Low balance warning
  if (lowestBalancePoint.value && lowestBalancePoint.value.balance < 500) {
    const daysAway = lowestBalancePoint.value.day
    list.push({
      type: 'warning',
      icon: 'alert',
      text: `You may run low in ${daysAway} days. Balance could drop to ${sym}${lowestBalancePoint.value.balance.toFixed(2)}. Consider reducing spending.`,
    })
  }

  // 2. Savings tracking
  const monthlyRecurringSavings = state.recurring
    .filter((r) => r.active && r.type === 'saving')
    .reduce((sum, r) => sum + (r.frequency === 'weekly' ? r.amount * 4 : r.amount), 0)

  if (monthlyRecurringSavings > 0) {
    list.push({
      type: 'positive',
      icon: 'trend',
      text: `You're on track to save ${sym}${monthlyRecurringSavings.toFixed(0)} this month. Keep it up!`,
    })
  }

  // 3. Overspending detection
  const expectedDailySpend = 40
  if (avgDailySpend.value > expectedDailySpend * 1.5) {
    const pct = Math.round(((avgDailySpend.value - expectedDailySpend) / expectedDailySpend) * 100)
    list.push({
      type: 'warning',
      icon: 'alert',
      text: `Spending is up ${pct}% from your usual pace (${sym}${avgDailySpend.value}/day vs ${sym}${expectedDailySpend}/day). Try to slow down.`,
    })
  }

  // 4. Negative future balance
  if (lowestBalancePoint.value && lowestBalancePoint.value.balance < 0) {
    list.push({
      type: 'warning',
      icon: 'alert',
      text: `⚠️ Your balance may go negative on ${lowestBalancePoint.value.date}. Take action now to avoid fees.`,
    })
  }

  // 5. Positive if no warnings
  if (list.filter((i) => i.type === 'warning').length === 0) {
    list.push({
      type: 'positive',
      icon: 'trend',
      text: `Everything looks good. Balance is healthy and you're saving ${savingsRate.value}% of income.`,
    })
  }

  return list
})

// ============================================================
// ACTIONS
// ============================================================

function addTransaction(transaction) {
  const errors = validateTransaction(transaction)
  if (errors.length > 0) {
    console.warn('Transaction validation failed:', errors)
    return { success: false, errors }
  }

  const item = {
    id: nextId(),
    type: transaction.type || (transaction.amount > 0 ? 'income' : 'expense'),
    amount: Math.abs(transaction.amount || 0),
    currency: transaction.currency || state.settings.baseCurrency,
    category: transaction.category || 'Other',
    label: transaction.label || '',
    date: transaction.date || today(),
    note: transaction.note || '',
    accountId: transaction.accountId || null,
    memberId: transaction.memberId || null,
    isRecurringRef: transaction.isRecurringRef || null,
  }
  state.transactions.unshift(item)
  if (_userId) storage.insertTransaction(_userId, item).catch(err => trackDbError('Insert Transaction', err))
  return { success: true, errors: [] }
}

function deleteTransaction(id) {
  const idx = state.transactions.findIndex((t) => t.id === id)
  if (idx > -1) {
    state.transactions.splice(idx, 1)
    if (_userId) storage.deleteTransaction(_userId, id).catch(err => trackDbError('Delete Transaction', err))
  }
}

function updateTransaction(id, updates) {
  const t = state.transactions.find((t) => t.id === id)
  if (t) {
    const merged = { ...t, ...updates }
    const errors = validateTransaction(merged)
    if (errors.length > 0) return { success: false, errors }
    Object.assign(t, updates)
    if (_userId) storage.updateTransaction(_userId, id, updates).catch(err => trackDbError('Update Transaction', err))
    return { success: true, errors: [] }
  }
  return { success: false, errors: ['Transaction not found'] }
}

function validateTransaction(t) {
  const errors = []
  if (!t.label || !t.label.trim()) errors.push('Description is required')
  if (!t.amount || isNaN(t.amount) || Number(t.amount) <= 0) errors.push('Amount must be greater than 0')
  if (!t.date) errors.push('Date is required')
  if (!t.type || !['income', 'expense', 'saving'].includes(t.type)) errors.push('Invalid type')
  return errors
}

function toggleRecurring(id) {
  const item = state.recurring.find((r) => r.id === id)
  if (item) {
    item.active = !item.active
    if (_userId) storage.updateRecurring(_userId, id, { active: item.active }).catch(err => trackDbError('DB', err))
  }
}

function addShift(shift) {
  const errors = validateShift(shift)
  if (errors.length > 0) return { success: false, errors }

  const item = {
    id: nextId(),
    date: shift.date || today(),
    start_time: shift.start_time || '09:00',
    end_time: shift.end_time || '17:00',
    break_hours: shift.break_hours || 0,
    hourly_rate: shift.hourly_rate || 25,
  }
  state.shifts.push(item)
  if (_userId) storage.insertShift(_userId, item).catch(err => trackDbError('DB', err))
  return { success: true, errors: [] }
}

function deleteShift(id) {
  const idx = state.shifts.findIndex((s) => s.id === id)
  if (idx > -1) {
    state.shifts.splice(idx, 1)
    if (_userId) storage.deleteShift(_userId, id).catch(err => trackDbError('DB', err))
  }
}

function updateShift(id, updates) {
  const s = state.shifts.find((s) => s.id === id)
  if (s) {
    Object.assign(s, updates)
    if (_userId) storage.updateShift(_userId, id, updates).catch(err => trackDbError('DB', err))
  }
}

function validateShift(s) {
  const errors = []
  if (!s.date) errors.push('Date is required')
  if (!s.start_time) errors.push('Start time is required')
  if (!s.end_time) errors.push('End time is required')
  if (s.hourly_rate !== undefined && (isNaN(s.hourly_rate) || Number(s.hourly_rate) < 0)) errors.push('Hourly rate must be 0 or more')
  if (s.break_hours !== undefined && (isNaN(s.break_hours) || Number(s.break_hours) < 0)) errors.push('Break hours must be 0 or more')
  return errors
}

function addRecurring(item) {
  if (!item.name || !item.name.trim()) return { success: false, errors: ['Name is required'] }
  if (!item.amount || Number(item.amount) <= 0) return { success: false, errors: ['Amount must be greater than 0'] }

  const entry = {
    id: nextId(),
    name: item.name,
    type: item.type || 'expense',
    amount: item.amount,
    currency: item.currency || state.settings.baseCurrency,
    frequency: item.frequency || 'monthly',
    day: item.day || null,
    day_of_week: item.day_of_week || null,
    active: true,
  }
  state.recurring.push(entry)
  if (_userId) storage.insertRecurring(_userId, entry).catch(err => trackDbError('DB', err))
  return { success: true, errors: [] }
}

function updateSettings(updates) {
  Object.assign(state.settings, updates)
  if (_userId) storage.upsertProfile(_userId, state.settings).catch(err => trackDbError('DB', err))
}

/**
 * Complete onboarding with initial user data
 */
function completeOnboarding(data) {
  if (data.userName) state.settings.userName = data.userName
  if (data.baseCurrency) state.settings.baseCurrency = data.baseCurrency
  if (data.paydayDay) state.settings.paydayDay = data.paydayDay
  if (_userId) storage.upsertProfile(_userId, state.settings).catch(err => trackDbError('DB', err))
}

// ============================================================
// BUDGET SYSTEM
// ============================================================

function setBudget(category, limit) {
  const existing = state.budgets.find(b => b.category === category)
  if (existing) {
    existing.limit = limit
    if (_userId) storage.updateBudget(_userId, existing.id, { limit }).catch(err => trackDbError('DB', err))
  } else {
    const item = { id: nextId(), category, limit, createdAt: today() }
    state.budgets.push(item)
    if (_userId) storage.insertBudget(_userId, item).catch(err => trackDbError('DB', err))
  }
}

function deleteBudget(id) {
  const idx = state.budgets.findIndex(b => b.id === id)
  if (idx > -1) {
    state.budgets.splice(idx, 1)
    if (_userId) storage.deleteBudget(_userId, id).catch(err => trackDbError('DB', err))
  }
}

const budgetSpending = computed(() => {
  const now = new Date()
  const monthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  const spending = {}
  
  state.transactions
    .filter(t => t.type === 'expense' && t.date >= monthStart)
    .forEach(t => {
      if (!spending[t.category]) spending[t.category] = 0
      spending[t.category] += safeNum(t.amount)
    })
  
  return spending
})

const budgetStatus = computed(() => {
  return state.budgets.map(b => {
    const spent = budgetSpending.value[b.category] || 0
    const pct = b.limit > 0 ? Math.min(100, Math.round((spent / b.limit) * 100)) : 0
    return {
      ...b,
      spent,
      pct,
      remaining: Math.max(0, b.limit - spent),
      overBudget: spent > b.limit,
      icon: getCategoryIcon(b.category),
    }
  })
})

// ============================================================
// SAVINGS GOALS
// ============================================================

function addSavingsGoal(goal) {
  const item = {
    id: nextId(),
    name: goal.name,
    target: goal.target || 0,
    saved: goal.saved || 0,
    icon: goal.icon || '🎯',
    deadline: goal.deadline || null,
    createdAt: today(),
  }
  state.savingsGoals.push(item)
  if (_userId) storage.insertSavingsGoal(_userId, item).catch(err => trackDbError('DB', err))
}

function updateSavingsGoal(id, updates) {
  const g = state.savingsGoals.find(g => g.id === id)
  if (g) {
    Object.assign(g, updates)
    if (_userId) storage.updateSavingsGoal(_userId, id, updates).catch(err => trackDbError('DB', err))
  }
}

function deleteSavingsGoal(id) {
  const idx = state.savingsGoals.findIndex(g => g.id === id)
  if (idx > -1) {
    state.savingsGoals.splice(idx, 1)
    if (_userId) storage.deleteSavingsGoal(_userId, id).catch(err => trackDbError('DB', err))
  }
}

function contributeToGoal(goalId, amount) {
  const g = state.savingsGoals.find(g => g.id === goalId)
  if (g && amount > 0) {
    g.saved = Math.min(g.target, safeNum(g.saved) + amount)
    if (_userId) storage.updateSavingsGoal(_userId, goalId, { saved: g.saved }).catch(err => trackDbError('DB', err))
    // Also record as a saving transaction
    addTransaction({
      type: 'saving',
      label: `→ ${g.name}`,
      amount,
      category: 'Savings',
      date: today(),
    })
  }
}

const savingsGoalStatus = computed(() => {
  return state.savingsGoals.map(g => {
    const pct = g.target > 0 ? Math.min(100, Math.round((safeNum(g.saved) / g.target) * 100)) : 0
    const remaining = Math.max(0, g.target - safeNum(g.saved))
    const daysLeft = g.deadline ? Math.max(0, daysBetween(today(), g.deadline)) : null
    const monthlyNeeded = (daysLeft !== null && daysLeft > 0) ? Math.ceil(remaining / (daysLeft / 30)) : null
    return { ...g, pct, remaining, daysLeft, monthlyNeeded, completed: pct >= 100 }
  })
})

// ============================================================
// AUTO-GENERATE RECURRING TRANSACTIONS
// ============================================================

function autoGenerateRecurring() {
  const todayStr = today()
  const lastGen = state.lastRecurringGen
  
  // Generate any recurring that should have been created since last run
  state.recurring
    .filter(r => r.active && (r.type === 'expense' || r.type === 'saving'))
    .forEach(rec => {
      const startDate = lastGen || todayStr
      const endDate = todayStr
      let d = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T00:00:00')
      
      while (d <= end) {
        const dateStr = toDateStr(d)
        let shouldGenerate = false
        
        if (rec.frequency === 'monthly' && rec.day && d.getDate() === rec.day) shouldGenerate = true
        if (rec.frequency === 'weekly' && rec.day_of_week && getDayOfWeek(dateStr) === rec.day_of_week) shouldGenerate = true
        if (rec.frequency === 'daily') shouldGenerate = true
        
        if (shouldGenerate && dateStr <= todayStr) {
          // Check if transaction already exists for this recurring on this date
          const exists = state.transactions.some(t => 
            t.label === rec.name && t.date === dateStr && t.isRecurringRef === rec.id
          )
          if (!exists) {
            const item = {
              id: nextId(),
              type: rec.type === 'expense' ? 'expense' : 'saving',
              amount: rec.amount,
              currency: rec.currency || state.settings.baseCurrency,
              category: rec.type === 'expense' ? 'Subscription' : 'Savings',
              label: rec.name,
              date: dateStr,
              note: 'Auto-generated',
              isRecurringRef: rec.id,
            }
            state.transactions.push(item)
            if (_userId) storage.insertTransaction(_userId, item).catch(err => trackDbError('DB', err))
          }
        }
        d.setDate(d.getDate() + 1)
      }
    })
  
  state.lastRecurringGen = todayStr
  if (_userId) storage.upsertProfile(_userId, state.settings).catch(err => trackDbError('DB', err))
}

// ============================================================
// SPENDING REPORT (weekly / monthly)
// ============================================================

function getSpendingReport(period = 'monthly') {
  const now = new Date()
  let startDate
  if (period === 'weekly') {
    const day = now.getDay()
    startDate = new Date(now)
    startDate.setDate(now.getDate() - day)
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  const startStr = toDateStr(startDate)
  
  const txns = state.transactions.filter(t => t.date >= startStr)
  
  const byCategory = {}
  txns.forEach(t => {
    if (t.type === 'expense') {
      if (!byCategory[t.category]) byCategory[t.category] = { total: 0, count: 0, icon: getCategoryIcon(t.category) }
      byCategory[t.category].total += safeNum(t.amount)
      byCategory[t.category].count++
    }
  })
  
  const totalExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + safeNum(t.amount), 0)
  const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + safeNum(t.amount), 0)
  
  // Daily spending for chart
  const daily = {}
  txns.filter(t => t.type === 'expense').forEach(t => {
    if (!daily[t.date]) daily[t.date] = 0
    daily[t.date] += safeNum(t.amount)
  })
  
  return {
    period,
    startDate: startStr,
    endDate: todayStr,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    byCategory: Object.entries(byCategory)
      .map(([cat, data]) => ({ category: cat, ...data, pct: totalExpense > 0 ? Math.round((data.total / totalExpense) * 100) : 0 }))
      .sort((a, b) => b.total - a.total),
    daily: Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })),
    transactionCount: txns.length,
  }
}

// ============================================================
// BILL REMINDERS / UPCOMING BILLS
// ============================================================

const upcomingBills = computed(() => {
  const todayStr = today()
  const in7Days = toDateStr(addDays(new Date(), 7))
  
  return generateRecurringInstances(7)
    .filter(r => r.type === 'expense' && r.date >= todayStr && r.date <= in7Days)
    .map(r => ({
      ...r,
      daysAway: daysBetween(todayStr, r.date),
      isOverdue: false,
      isUrgent: daysBetween(todayStr, r.date) <= 2,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
})

// ============================================================
// SPENDING STREAKS & ACHIEVEMENTS
// ============================================================

const spendingStreak = computed(() => {
  // Calculate consecutive days under budget (or no spending)
  const expenses = state.transactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.date.localeCompare(a.date))
  
  if (expenses.length === 0) return { days: 0, label: 'No spending yet' }
  
  const todayStr = today()
  const dailyTotals = {}
  expenses.forEach(t => {
    if (!dailyTotals[t.date]) dailyTotals[t.date] = 0
    dailyTotals[t.date] += safeNum(t.amount)
  })
  
  // Get last 30 days of spending
  let streak = 0
  const dailyLimit = avgDailySpend.value > 0 ? avgDailySpend.value * 1.2 : 100
  
  for (let i = 0; i < 30; i++) {
    const dateStr = toDateStr(addDays(new Date(), -i))
    const spent = dailyTotals[dateStr] || 0
    if (spent <= dailyLimit) {
      streak++
    } else {
      break
    }
  }
  
  return {
    days: streak,
    label: streak === 0 ? 'Start your streak!' : streak < 7 ? `${streak} day streak 🔥` : streak < 14 ? `${streak} days! Keep going! 💪` : `${streak} days! Amazing! 🏆`,
    isHot: streak >= 7,
  }
})

const achievements = computed(() => {
  const txns = state.transactions
  const earned = []
  
  // First transaction
  if (txns.length >= 1) earned.push({ id: 'first', icon: '🌟', title: 'First Step', desc: 'Add your first transaction' })
  
  // 10 transactions
  if (txns.length >= 10) earned.push({ id: 'ten', icon: '📝', title: 'Getting Serious', desc: 'Log 10 transactions' })
  
  // 50 transactions
  if (txns.length >= 50) earned.push({ id: 'fifty', icon: '📊', title: 'Data Master', desc: 'Log 50 transactions' })
  
  // First savings
  if (totalSavings.value > 0) earned.push({ id: 'save1', icon: '🏦', title: 'Saver', desc: 'Make your first saving' })
  
  // Savings rate > 20%
  if (savingsRate.value >= 20) earned.push({ id: 'rate20', icon: '💎', title: 'Diamond Saver', desc: 'Save 20%+ of income' })
  
  // Budget set
  if (state.budgets.length > 0) earned.push({ id: 'budget', icon: '🎯', title: 'Budget Boss', desc: 'Set your first budget' })
  
  // All budgets under control
  if (budgetStatus.value.length > 0 && budgetStatus.value.every(b => !b.overBudget)) {
    earned.push({ id: 'ontrack', icon: '✅', title: 'On Track', desc: 'All budgets on target' })
  }
  
  // Streak 7
  if (spendingStreak.value.days >= 7) earned.push({ id: 'streak7', icon: '🔥', title: '7-Day Streak', desc: '7 days under spending target' })
  
  // Streak 30
  if (spendingStreak.value.days >= 30) earned.push({ id: 'streak30', icon: '🏆', title: 'Monthly Champion', desc: '30-day spending streak' })
  
  // Goal completed
  if (savingsGoalStatus.value.some(g => g.completed)) earned.push({ id: 'goal', icon: '🎉', title: 'Goal Crusher', desc: 'Complete a savings goal' })
  
  return earned
})

const allPossibleAchievements = [
  { id: 'first', icon: '🌟', title: 'First Step', desc: 'Add your first transaction' },
  { id: 'ten', icon: '📝', title: 'Getting Serious', desc: 'Log 10 transactions' },
  { id: 'fifty', icon: '📊', title: 'Data Master', desc: 'Log 50 transactions' },
  { id: 'save1', icon: '🏦', title: 'Saver', desc: 'Make your first saving' },
  { id: 'rate20', icon: '💎', title: 'Diamond Saver', desc: 'Save 20%+ of income' },
  { id: 'budget', icon: '🎯', title: 'Budget Boss', desc: 'Set your first budget' },
  { id: 'ontrack', icon: '✅', title: 'On Track', desc: 'All budgets on target' },
  { id: 'streak7', icon: '🔥', title: '7-Day Streak', desc: '7 days under spending target' },
  { id: 'streak30', icon: '🏆', title: 'Monthly Champion', desc: '30-day spending streak' },
  { id: 'goal', icon: '🎉', title: 'Goal Crusher', desc: 'Complete a savings goal' },
]

// ============================================================
// "CAN I AFFORD THIS?" WIDGET
// ============================================================

function canIAfford(amount) {
  const bal = currentBalance.value
  const projected = generateForecast(7)
  const lowestIn7Days = projected.length > 0 
    ? Math.min(bal, ...projected.map(p => p.runningBalance))
    : bal
  
  const afterPurchase = bal - amount
  const canAfford = afterPurchase > 0
  const wouldBeTight = afterPurchase > 0 && afterPurchase < avgDailySpend.value * 3
  const daysUntilBroke = projected.length > 0
    ? (() => {
        for (let i = 0; i < projected.length; i++) {
          if (projected[i].runningBalance - amount < 0) return i + 1
        }
        return 30
      })()
    : (bal - amount > 0 ? 30 : 0)
  
  return {
    canAfford,
    wouldBeTight,
    afterPurchase,
    daysUntilBroke,
    recommendation: canAfford
      ? wouldBeTight
        ? 'You can, but it\'ll be tight. Consider waiting.'
        : 'Yes, you can afford this! ✅'
      : 'Not right now. This would overdraw your account. ❌',
    emoji: canAfford ? (wouldBeTight ? '🤔' : '✅') : '❌',
  }
}

// ============================================================
// MULTI-ACCOUNT SUPPORT
// ============================================================

function addAccount(account) {
  const acc = {
    id: nextId(),
    name: account.name || 'Untitled Account',
    type: account.type || 'checking', // checking, savings, cash, credit, investment
    icon: account.icon || '🏦',
    color: account.color || '#22C55E',
    currency: account.currency || state.settings.baseCurrency,
    initialBalance: account.initialBalance || 0,
    createdAt: today(),
  }
  state.accounts.push(acc)
  if (!state.settings.activeAccountId) {
    state.settings.activeAccountId = acc.id
  }
  if (_userId) storage.insertAccount(_userId, acc).catch(err => trackDbError("Insert Account", err))
  return acc
}

function deleteAccount(id) {
  const idx = state.accounts.findIndex(a => a.id === id)
  if (idx > -1) {
    state.accounts.splice(idx, 1)
    if (state.settings.activeAccountId === id) {
      state.settings.activeAccountId = state.accounts[0]?.id || null
    }
    if (_userId) storage.deleteAccount(_userId, id).catch(err => trackDbError('DB', err))
  }
}

function updateAccount(id, updates) {
  const acc = state.accounts.find(a => a.id === id)
  if (acc) {
    Object.assign(acc, updates)
    if (_userId) storage.updateAccount(_userId, id, updates).catch(err => trackDbError('DB', err))
  }
}

function setActiveAccount(id) {
  state.settings.activeAccountId = id
  if (_userId) storage.upsertProfile(_userId, state.settings).catch(err => trackDbError('DB', err))
}

// Filter transactions by active account
const activeAccountTransactions = computed(() => {
  const accId = state.settings.activeAccountId
  if (!accId) return state.transactions
  return state.transactions.filter(t => !t.accountId || t.accountId === accId)
})

// Per-account balances
const accountBalances = computed(() => {
  return state.accounts.map(acc => {
    const txns = state.transactions.filter(t => t.accountId === acc.id || (!t.accountId && acc.id === state.settings.activeAccountId))
    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + safeNum(t.amount), 0)
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + safeNum(t.amount), 0)
    const savings = txns.filter(t => t.type === 'saving').reduce((s, t) => s + safeNum(t.amount), 0)
    return {
      ...acc,
      balance: acc.initialBalance + income - expenses - savings,
      transactionCount: txns.length,
    }
  })
})

// ============================================================
// SHARED FINANCES (Members / Couples / Roommates)
// ============================================================

function addMember(member) {
  const item = {
    id: nextId(),
    name: member.name || 'Unknown',
    avatar: member.avatar || '👤',
    color: member.color || '#6366F1',
    role: member.role || 'member', // owner, member
    joinedAt: today(),
  }
  state.members.push(item)
  if (_userId) storage.insertMember(_userId, item).catch(err => trackDbError('DB', err))
}

function removeMember(id) {
  const idx = state.members.findIndex(m => m.id === id)
  if (idx > -1) {
    state.members.splice(idx, 1)
    if (_userId) storage.deleteMember(_userId, id).catch(err => trackDbError('DB', err))
  }
}

function updateMember(id, updates) {
  const m = state.members.find(m => m.id === id)
  if (m) {
    Object.assign(m, updates)
    if (_userId) storage.updateMember(_userId, id, updates).catch(err => trackDbError('DB', err))
  }
}

// Tag a transaction with a member
function tagTransactionMember(txnId, memberId) {
  const t = state.transactions.find(t => t.id === txnId)
  if (t) {
    t.memberId = memberId
    if (_userId) storage.updateTransaction(_userId, txnId, { memberId }).catch(err => trackDbError('DB', err))
  }
}

// Per-member spending breakdown
const memberSpending = computed(() => {
  return state.members.map(member => {
    const txns = state.transactions.filter(t => t.memberId === member.id)
    const spent = txns.filter(t => t.type === 'expense').reduce((s, t) => s + safeNum(t.amount), 0)
    const earned = txns.filter(t => t.type === 'income').reduce((s, t) => s + safeNum(t.amount), 0)
    return {
      ...member,
      totalSpent: spent,
      totalEarned: earned,
      net: earned - spent,
      transactionCount: txns.length,
    }
  })
})

// ============================================================
// RECEIPT PHOTO SCANNING
// ============================================================

const receiptQueue = []

function addReceiptPhoto(photoDataUrl) {
  const receipt = {
    id: nextId(),
    photoDataUrl,
    status: 'pending', // pending, processing, done, failed
    extractedData: null,
    createdAt: today(),
  }
  receiptQueue.push(receipt)
  return receipt
}

function updateReceiptStatus(id, status, extractedData = null) {
  const r = receiptQueue.find(r => r.id === id)
  if (r) {
    r.status = status
    if (extractedData) r.extractedData = extractedData
  }
}

function processReceiptWithAI(receiptId) {
  const receipt = receiptQueue.find(r => r.id === receiptId)
  if (!receipt) return

  updateReceiptStatus(receiptId, 'processing')

  // Simulated AI extraction — in production, send to OpenAI Vision API
  return new Promise((resolve) => {
    setTimeout(() => {
      const simulated = {
        label: 'Scanned Receipt',
        amount: 0,
        category: 'Other',
        date: today(),
        note: 'Auto-extracted from receipt photo',
      }
      updateReceiptStatus(receiptId, 'done', simulated)
      resolve(simulated)
    }, 1500)
  })
}

// ============================================================
// IMPROVED AI INSIGHTS ENGINE
// ============================================================

const advancedInsights = computed(() => {
  const list = []
  const sym = cs()
  const txns = state.transactions
  const now = new Date()
  const thisMonth = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  const lastMonth = toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const monthEnd = toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0))

  // This month vs last month comparison
  const thisMonthExpenses = txns.filter(t => t.type === 'expense' && t.date >= thisMonth).reduce((s, t) => s + safeNum(t.amount), 0)
  const lastMonthExpenses = txns.filter(t => t.type === 'expense' && t.date >= lastMonth && t.date < thisMonth).reduce((s, t) => s + safeNum(t.amount), 0)

  if (lastMonthExpenses > 0 && thisMonthExpenses > 0) {
    const change = Math.round(((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
    if (change > 10) {
      list.push({ type: 'warning', icon: 'chart', text: `Spending is up ${change}% compared to last month (${sym}${thisMonthExpenses.toFixed(0)} vs ${sym}${lastMonthExpenses.toFixed(0)}). Review your recent purchases.` })
    } else if (change < -10) {
      list.push({ type: 'positive', icon: 'chart', text: `Great job! Spending is down ${Math.abs(change)}% from last month. You saved ${sym}${(lastMonthExpenses - thisMonthExpenses).toFixed(0)}.` })
    }
  }

  // Top spending category
  const catTotals = {}
  txns.filter(t => t.type === 'expense' && t.date >= thisMonth).forEach(t => {
    if (!catTotals[t.category]) catTotals[t.category] = 0
    catTotals[t.category] += safeNum(t.amount)
  })
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]
  if (topCat && topCat[1] > 0) {
    const pct = thisMonthExpenses > 0 ? Math.round((topCat[1] / thisMonthExpenses) * 100) : 0
    list.push({ type: 'info', icon: 'pie', text: `${getCategoryIcon(topCat[0])} ${topCat[0]} is your biggest expense this month at ${sym}${topCat[1].toFixed(0)} (${pct}% of total).` })
  }

  // Weekend vs weekday spending
  const weekdaySpend = txns.filter(t => t.type === 'expense' && t.date >= thisMonth && [1,2,3,4,5].includes(new Date(t.date + 'T00:00:00').getDay())).reduce((s, t) => s + safeNum(t.amount), 0)
  const weekendSpend = txns.filter(t => t.type === 'expense' && t.date >= thisMonth && [0,6].includes(new Date(t.date + 'T00:00:00').getDay())).reduce((s, t) => s + safeNum(t.amount), 0)
  if (weekendSpend > weekdaySpend * 0.6) {
    list.push({ type: 'info', icon: 'calendar', text: `You tend to spend more on weekends (${sym}${weekendSpend.toFixed(0)} vs ${sym}${weekdaySpend.toFixed(0)} on weekdays). Plan weekend activities in advance.` })
  }

  // Income diversification
  const incomeSources = new Set(txns.filter(t => t.type === 'income' && t.date >= thisMonth).map(t => t.label))
  if (incomeSources.size > 1) {
    list.push({ type: 'positive', icon: 'trend', text: `You have ${incomeSources.size} income sources this month. Diversified income is a smart financial strategy! 📊` })
  }

  // Subscription creep detection
  const subs = state.recurring.filter(r => r.active && r.type === 'expense')
  const monthlySubTotal = subs.reduce((s, r) => s + (r.frequency === 'weekly' ? r.amount * 4 : r.frequency === 'daily' ? r.amount * 30 : r.amount), 0)
  if (subs.length >= 3) {
    list.push({ type: 'info', icon: 'lightbulb', text: `You have ${subs.length} active subscriptions totaling ~${sym}${monthlySubTotal.toFixed(0)}/month. Review them to cut unused services.` })
  }

  // Emergency fund check
  const threeMonthsExpenses = avgDailySpend.value * 90
  if (totalSavings.value > 0 && totalSavings.value < threeMonthsExpenses) {
    const pct = Math.round((totalSavings.value / threeMonthsExpenses) * 100)
    list.push({ type: 'warning', icon: 'shield', text: `Emergency fund covers ~${pct}% of 3 months' expenses. Aim for 100% (${sym}${threeMonthsExpenses.toFixed(0)}).` })
  }

  return list
})

// ============================================================
// THEME MANAGEMENT
// ============================================================

function applyTheme(theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

// Apply theme on load
applyTheme(state.settings.theme)

// ============================================================
// EXPORT
// ============================================================

export function useFinance() {
  return {
    // State
    state,
    isFirstRun,
    dataLoaded,
    initData,
    lastDbError,

    // Computed - Balance
    balance,
    currentBalance,
    pendingIncome,
    totalIncome,
    totalExpenses,
    totalSavings,

    // Computed - Time
    daysUntilPayday,
    nextPayday,

    // Computed - Shifts
    shiftIncomes,
    futureShiftIncome,
    paydayGroups,
    paycheckSummary,

    // Computed - IOUs
    iouSummary,

    // Computed - Forecast
    forecast,
    lowestBalancePoint,
    chartData,

    // Computed - Smart
    insights,
    avgDailySpend,
    savingsRate,

    // Computed - Budgets
    budgetStatus,
    budgetSpending,

    // Computed - Savings Goals
    savingsGoalStatus,

    // Computed - Bills
    upcomingBills,

    // Actions - Transactions
    addTransaction,
    deleteTransaction,
    updateTransaction,

    // Actions - Shifts
    addShift,
    deleteShift,
    updateShift,

    // Actions - IOUs
    addIOU,
    updateIOU,
    deleteIOU,
    setPaydayOverride,

    // Actions - Recurring
    addRecurring,
    toggleRecurring,
    autoGenerateRecurring,

    // Actions - Budgets
    setBudget,
    deleteBudget,

    // Actions - Savings Goals
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    contributeToGoal,

    // Actions - Settings
    updateSettings,
    completeOnboarding,

    // Computed - Streaks & Achievements
    spendingStreak,
    achievements,
    allPossibleAchievements,

    // Can I Afford
    canIAfford,

    // Multi-Account
    addAccount,
    deleteAccount,
    updateAccount,
    setActiveAccount,
    accountBalances,
    activeAccountTransactions,

    // Shared Finances
    addMember,
    removeMember,
    updateMember,
    tagTransactionMember,
    memberSpending,

    // Receipt Scanning
    addReceiptPhoto,
    processReceiptWithAI,
    receiptQueue,

    // Advanced Insights
    advancedInsights,

    // Theme
    applyTheme,

    // Reports
    getSpendingReport,

    // Utilities
    generateRecurringInstances,
    getCurrencySymbol,
    fmtCurrency,
    getCategoryIcon,
    CATEGORY_ICONS,
  }
}
