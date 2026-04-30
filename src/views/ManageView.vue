<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../composables/useFinance'
import RecurringItem from '../components/RecurringItem.vue'

const {
  state, getCurrencySymbol,
  addShift, deleteShift,
  paycheckSummary,
  toggleRecurring, addRecurring,
  setBudget, deleteBudget, budgetStatus,
  addSavingsGoal, deleteSavingsGoal, savingsGoalStatus,
  addAccount, deleteAccount, accountBalances,
  addMember, removeMember, memberSpending,
  iouSummary, addIOU, updateIOU, deleteIOU,
  CATEGORY_ICONS,
} = useFinance()

const sym = computed(() => getCurrencySymbol(state.settings.baseCurrency))

const tabs = [
  { id: 'shifts',    label: 'Shifts',    icon: '🕐' },
  { id: 'recurring', label: 'Recurring', icon: '↻'  },
  { id: 'budgets',   label: 'Budgets',   icon: '🎯' },
  { id: 'goals',     label: 'Goals',     icon: '🏆' },
  { id: 'accounts',  label: 'Accounts',  icon: '🏦' },
  { id: 'members',   label: 'Members',   icon: '👥' },
  { id: 'debts',     label: 'Debts',     icon: '💸' },
]
const activeTab = ref('shifts')

// ── Shifts ──────────────────────────────────────────
const showShiftForm = ref(false)
const shiftForm = ref({ date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '17:00', break_hours: 1, hourly_rate: 25 })
const shiftFilter = ref('all') // 'all' | 'month' | 'week'
const expandedGroups = ref(new Set())

function handleAddShift() {
  addShift(shiftForm.value)
  showShiftForm.value = false
  shiftForm.value = { date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '17:00', break_hours: 1, hourly_rate: 25 }
}

function toggleGroup(key) {
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key)
  } else {
    expandedGroups.value.add(key)
  }
  expandedGroups.value = new Set(expandedGroups.value)
}

const filteredShifts = computed(() => {
  const shifts = paycheckSummary.value.shifts || []
  if (shiftFilter.value === 'all') return shifts
  const now = new Date()
  if (shiftFilter.value === 'month') {
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    return shifts.filter(s => s.date >= start)
  }
  if (shiftFilter.value === 'week') {
    const day = now.getDay()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - day)
    const start = weekStart.toISOString().split('T')[0]
    return shifts.filter(s => s.date >= start)
  }
  return shifts
})

function fmtPayDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtPeriodRange(start, end) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const opts = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`
}

function calcShiftHours(s) {
  const [sh, sm] = s.start_time.split(':').map(Number)
  const [eh, em] = s.end_time.split(':').map(Number)
  let start = sh * 60 + sm, end = eh * 60 + em
  if (end <= start) end += 24 * 60
  return Math.max(0, (end - start - (s.break_hours || 0) * 60) / 60)
}

// ── Recurring ────────────────────────────────────────
const showRecurringForm = ref(false)
const recurringForm = ref({ name: '', amount: 0, type: 'expense', frequency: 'monthly', day: 1, day_of_week: 'Thursday' })

function handleAddRecurring() {
  if (!recurringForm.value.name || !recurringForm.value.amount) return
  const form = { ...recurringForm.value }
  if (form.frequency === 'weekly') form.day = null
  else form.day_of_week = null
  addRecurring(form)
  showRecurringForm.value = false
  recurringForm.value = { name: '', amount: 0, type: 'expense', frequency: 'monthly', day: 1, day_of_week: 'Thursday' }
}

// ── Budgets ──────────────────────────────────────────
const showBudgetForm = ref(false)
const budgetForm = ref({ category: 'Food & Drink', limit: 200 })
const expenseCats = ['Food & Drink', 'Subscription', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Other']

function handleAddBudget() {
  if (!budgetForm.value.limit || budgetForm.value.limit <= 0) return
  setBudget(budgetForm.value.category, budgetForm.value.limit)
  showBudgetForm.value = false
  budgetForm.value = { category: 'Food & Drink', limit: 200 }
}

// ── Goals ────────────────────────────────────────────
const showGoalForm = ref(false)
const goalForm = ref({ name: '', target: 1000, saved: 0, icon: '🎯', deadline: '' })
const goalIcons = ['🎯', '🏠', '🚗', '✈️', '💍', '💻', '📱', '🎓', '🏖️', '💰']

function handleAddGoal() {
  if (!goalForm.value.name || !goalForm.value.target) return
  addSavingsGoal({ ...goalForm.value, deadline: goalForm.value.deadline || null })
  showGoalForm.value = false
  goalForm.value = { name: '', target: 1000, saved: 0, icon: '🎯', deadline: '' }
}

// ── Accounts ─────────────────────────────────────────
const showAccountForm = ref(false)
const accountForm = ref({ name: '', type: 'checking', icon: '🏦', initialBalance: 0 })
const accountTypes = [
  { value: 'checking', label: 'Checking', icon: '🏦' },
  { value: 'savings',  label: 'Savings',  icon: '💰' },
  { value: 'cash',     label: 'Cash',     icon: '💵' },
  { value: 'credit',   label: 'Credit',   icon: '💳' },
  { value: 'investment',label:'Invest',   icon: '📈' },
]

function handleAddAccount() {
  if (!accountForm.value.name) return
  addAccount(accountForm.value)
  showAccountForm.value = false
  accountForm.value = { name: '', type: 'checking', icon: '🏦', initialBalance: 0 }
}

// ── Members ──────────────────────────────────────────
const showMemberForm = ref(false)
const memberForm = ref({ name: '', avatar: '👤', color: '#6366F1' })
const avatarOpts = ['👤', '👩', '👨', '👧', '👦', '🧑', '👫', '🏠']

function handleAddMember() {
  if (!memberForm.value.name) return
  addMember(memberForm.value)
  showMemberForm.value = false
  memberForm.value = { name: '', avatar: '👤', color: '#6366F1' }
}

// ── Debts (IOUs) ─────────────────────────────────────
const showDebtModal = ref(false)
const editingDebtId = ref(null)
const confirmDeleteDebtId = ref(null)
const debtForm = ref({ person: '', amount: '', dateLent: new Date().toISOString().split('T')[0], dueDate: '', interestRate: '', notes: '' })
const debtFormErrors = ref([])

const totalOwed = computed(() => iouSummary.value.filter((i) => !i.paid).reduce((s, i) => s + i.totalDue, 0))
const overdueCount = computed(() => iouSummary.value.filter((i) => i.isOverdue).length)

function openAddDebt() {
  editingDebtId.value = null
  debtForm.value = { person: '', amount: '', dateLent: new Date().toISOString().split('T')[0], dueDate: '', interestRate: '', notes: '' }
  debtFormErrors.value = []
  showDebtModal.value = true
}

function openEditDebt(iou) {
  editingDebtId.value = iou.id
  debtForm.value = { person: iou.person, amount: String(iou.amount), dateLent: iou.dateLent, dueDate: iou.dueDate || '', interestRate: iou.interestRate > 0 ? String(iou.interestRate) : '', notes: iou.notes || '' }
  debtFormErrors.value = []
  showDebtModal.value = true
}

function saveDebt() {
  const data = { person: debtForm.value.person, amount: Number(debtForm.value.amount), dateLent: debtForm.value.dateLent, dueDate: debtForm.value.dueDate || null, interestRate: Number(debtForm.value.interestRate || 0), notes: debtForm.value.notes }
  if (editingDebtId.value) {
    updateIOU(editingDebtId.value, data)
    showDebtModal.value = false
  } else {
    const result = addIOU(data)
    if (result.success) showDebtModal.value = false
    else debtFormErrors.value = result.errors
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dueBadge(iou) {
  if (iou.paid) return { label: 'Paid', cls: 'bg-primary/10 text-primary' }
  if (iou.isOverdue) return { label: `${Math.abs(iou.daysUntilDue)}d overdue`, cls: 'bg-danger/10 text-danger' }
  if (iou.daysUntilDue !== null && iou.daysUntilDue <= 7) return { label: `Due in ${iou.daysUntilDue}d`, cls: 'bg-warning/10 text-warning' }
  if (iou.dueDate) return { label: formatDate(iou.dueDate), cls: 'bg-surface text-text-secondary' }
  return { label: 'No due date', cls: 'bg-surface text-text-secondary' }
}
</script>

<template>
  <div class="max-w-lg mx-auto pb-28">
    <!-- Header -->
    <div class="px-5 pt-8 pb-4">
      <h1 class="text-2xl font-bold text-text-primary">Manage</h1>
      <p class="text-sm text-text-secondary mt-1">Your financial accounts & records</p>
    </div>

    <!-- Tab Bar (scrollable) -->
    <div class="px-5 mb-5">
      <div class="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0"
          :class="activeTab === tab.id
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-text-secondary hover:text-text-primary'"
        >
          <span>{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- ── SHIFTS ── -->
    <div v-if="activeTab === 'shifts'" class="px-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-text-secondary">Work Shifts</h2>
        <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20" @click="showShiftForm = !showShiftForm">+ Add Shift</button>
      </div>

      <!-- Add shift form -->
      <div v-if="showShiftForm" class="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
        <input v-model="shiftForm.date" type="date" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] text-text-secondary block mb-1">Start</label>
            <input v-model="shiftForm.start_time" type="time" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label class="text-[10px] text-text-secondary block mb-1">End</label>
            <input v-model="shiftForm.end_time" type="time" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] text-text-secondary block mb-1">Break (hrs)</label>
            <input v-model.number="shiftForm.break_hours" type="number" step="0.5" min="0" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label class="text-[10px] text-text-secondary block mb-1">Rate ({{ sym }}/hr)</label>
            <input v-model.number="shiftForm.hourly_rate" type="number" step="1" min="0" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
          </div>
        </div>
        <button class="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm" @click="handleAddShift">Add Shift</button>
      </div>

      <!-- ── MODE: none — simple totals + date filter ── -->
      <template v-if="paycheckSummary.mode === 'none'">
        <!-- Summary bar -->
        <div v-if="state.shifts.length" class="bg-card border border-border rounded-2xl px-4 py-3 mb-3 flex items-center justify-between">
          <div>
            <p class="text-xs text-text-secondary">Total earnings</p>
            <p class="text-lg font-bold text-primary">{{ sym }}{{ paycheckSummary.totalAmount.toFixed(2) }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-text-secondary">Total hours</p>
            <p class="text-lg font-bold text-text-primary">{{ paycheckSummary.totalHours }}h</p>
          </div>
        </div>

        <!-- Date filter pills -->
        <div v-if="state.shifts.length" class="flex gap-2 mb-3">
          <button
            v-for="f in [['all','All'],['month','This Month'],['week','This Week']]"
            :key="f[0]"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="shiftFilter === f[0] ? 'bg-primary text-white' : 'bg-surface text-text-secondary'"
            @click="shiftFilter = f[0]"
          >{{ f[1] }}</button>
        </div>

        <!-- Flat shift list -->
        <div class="space-y-2">
          <div
            v-for="shift in [...filteredShifts].sort((a,b) => b.date.localeCompare(a.date))"
            :key="shift.id"
            class="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary">{{ shift.date }}</p>
              <p class="text-xs text-text-secondary">{{ shift.start_time }}–{{ shift.end_time }} · {{ shift.calculated_hours }}h · {{ sym }}{{ shift.hourly_rate }}/hr</p>
            </div>
            <p class="text-sm font-semibold text-primary shrink-0">{{ sym }}{{ shift.calculated_income.toFixed(2) }}</p>
            <button class="w-8 h-8 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center shrink-0" @click="deleteShift(shift.id)">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div v-if="!filteredShifts.length" class="text-center py-12 text-text-secondary text-sm">
          {{ state.shifts.length ? 'No shifts in this period' : 'No shifts added yet' }}
        </div>
      </template>

      <!-- ── MODE: period — paycheck cards ── -->
      <template v-else>
        <!-- Overall summary -->
        <div v-if="paycheckSummary.groups.length" class="bg-card border border-border rounded-2xl px-4 py-3 mb-3 flex items-center justify-between">
          <div>
            <p class="text-xs text-text-secondary">All-time earnings</p>
            <p class="text-lg font-bold text-primary">{{ sym }}{{ paycheckSummary.totalAmount.toFixed(2) }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-text-secondary">Total hours</p>
            <p class="text-lg font-bold text-text-primary">{{ paycheckSummary.totalHours }}h</p>
          </div>
        </div>

        <!-- Paycheck cards -->
        <div class="space-y-3">
          <div
            v-for="group in paycheckSummary.groups"
            :key="group.key"
            class="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <!-- Card header -->
            <button
              class="w-full px-4 py-4 flex items-start gap-3 text-left hover:bg-surface/50 transition-colors"
              @click="toggleGroup(group.key)"
            >
              <!-- Pay status dot -->
              <div class="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0" :class="group.isPast ? 'bg-primary' : 'bg-warning'" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="text-sm font-semibold text-text-primary">{{ group.label }}</p>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-md" :class="group.isPast ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'">
                    {{ group.isPast ? 'Paid' : 'Upcoming' }}
                  </span>
                </div>
                <p class="text-xs text-text-secondary">{{ fmtPeriodRange(group.start, group.end) }}</p>
                <p class="text-xs text-text-secondary">Pay date: {{ fmtPayDate(group.payDate) }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-base font-bold text-primary">{{ sym }}{{ group.totalAmount.toFixed(2) }}</p>
                <p class="text-xs text-text-secondary">{{ group.totalHours }}h · {{ group.shiftCount }} shift{{ group.shiftCount !== 1 ? 's' : '' }}</p>
              </div>
            </button>

            <!-- Expanded shifts -->
            <div v-if="expandedGroups.has(group.key)" class="border-t border-border divide-y divide-border/50">
              <div
                v-for="shift in group.shifts"
                :key="shift.id"
                class="px-4 py-3 flex items-center gap-3"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-text-primary">{{ shift.date }}</p>
                  <p class="text-[11px] text-text-secondary">{{ shift.start_time }}–{{ shift.end_time }} · {{ shift.calculated_hours }}h</p>
                </div>
                <p class="text-xs font-semibold text-primary shrink-0">{{ sym }}{{ shift.calculated_income.toFixed(2) }}</p>
                <button class="w-7 h-7 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center shrink-0" @click="deleteShift(shift.id)">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!paycheckSummary.groups.length" class="text-center py-12 text-text-secondary text-sm">No shifts added yet</div>
      </template>
    </div>

    <!-- ── RECURRING ── -->
    <div v-if="activeTab === 'recurring'" class="px-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-text-secondary">Recurring Items</h2>
        <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20" @click="showRecurringForm = !showRecurringForm">+ Add</button>
      </div>

      <div v-if="showRecurringForm" class="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
        <input v-model="recurringForm.name" type="text" placeholder="Name (e.g. Netflix)" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50" />
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] text-text-secondary block mb-1">Amount</label>
            <input v-model.number="recurringForm.amount" type="number" step="1" min="0" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label class="text-[10px] text-text-secondary block mb-1">Type</label>
            <select v-model="recurringForm.type" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50">
              <option value="expense">Expense</option>
              <option value="saving">Saving</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Frequency</label>
          <select v-model="recurringForm.frequency" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50">
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
        <div v-if="recurringForm.frequency === 'monthly'">
          <label class="text-[10px] text-text-secondary block mb-1">Day of month</label>
          <input v-model.number="recurringForm.day" type="number" min="1" max="31" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
        </div>
        <div v-if="recurringForm.frequency === 'weekly'">
          <label class="text-[10px] text-text-secondary block mb-1">Day of week</label>
          <select v-model="recurringForm.day_of_week" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50">
            <option v-for="d in ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <button class="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm" @click="handleAddRecurring">Add Recurring</button>
      </div>

      <div class="space-y-2">
        <RecurringItem
          v-for="item in state.recurring"
          :key="item.id"
          :name="item.name"
          :amount="item.amount"
          :frequency="item.frequency"
          :day="item.day"
          :day-of-week="item.day_of_week"
          :type="item.type"
          :active="item.active"
          @toggle="toggleRecurring(item.id)"
        />
      </div>
      <div v-if="state.recurring.length === 0" class="text-center py-12 text-text-secondary text-sm">No recurring items yet</div>
    </div>

    <!-- ── BUDGETS ── -->
    <div v-if="activeTab === 'budgets'" class="px-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-text-secondary">Monthly Budgets</h2>
        <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20" @click="showBudgetForm = !showBudgetForm">+ Add</button>
      </div>

      <div v-if="showBudgetForm" class="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Category</label>
          <select v-model="budgetForm.category" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary">
            <option v-for="cat in expenseCats" :key="cat" :value="cat">{{ CATEGORY_ICONS[cat] || '📦' }} {{ cat }}</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Monthly limit ({{ sym }})</label>
          <input v-model.number="budgetForm.limit" type="number" min="0" step="10" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
        </div>
        <button class="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm" @click="handleAddBudget">Set Budget</button>
      </div>

      <div class="space-y-2">
        <div v-for="b in budgetStatus" :key="b.id" class="bg-card border border-border rounded-xl px-4 py-3">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-lg">{{ b.icon }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary">{{ b.category }}</p>
              <p class="text-xs text-text-secondary">{{ sym }}{{ b.spent.toFixed(0) }} / {{ sym }}{{ b.limit.toFixed(0) }}</p>
            </div>
            <span class="text-xs font-semibold" :class="b.overBudget ? 'text-danger' : b.pct > 75 ? 'text-warning' : 'text-primary'">{{ b.pct }}%</span>
            <button class="w-7 h-7 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center" @click="deleteBudget(b.id)">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="h-1.5 bg-surface rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" :style="{ width: Math.min(100, b.pct) + '%', background: b.overBudget ? '#EF4444' : b.pct > 75 ? '#F59E0B' : '#22C55E' }" />
          </div>
        </div>
      </div>
      <div v-if="budgetStatus.length === 0" class="text-center py-12 text-text-secondary text-sm">No budgets set yet</div>
    </div>

    <!-- ── GOALS ── -->
    <div v-if="activeTab === 'goals'" class="px-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-text-secondary">Savings Goals</h2>
        <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20" @click="showGoalForm = !showGoalForm">+ Add</button>
      </div>

      <div v-if="showGoalForm" class="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Icon</label>
          <div class="flex gap-2 flex-wrap">
            <button v-for="ic in goalIcons" :key="ic" class="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all" :class="goalForm.icon === ic ? 'bg-primary/20 border border-primary/40' : 'bg-surface border border-border'" @click="goalForm.icon = ic">{{ ic }}</button>
          </div>
        </div>
        <input v-model="goalForm.name" type="text" placeholder="Goal name (e.g. New Laptop)" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50" />
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] text-text-secondary block mb-1">Target ({{ sym }})</label>
            <input v-model.number="goalForm.target" type="number" min="0" step="100" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label class="text-[10px] text-text-secondary block mb-1">Already saved</label>
            <input v-model.number="goalForm.saved" type="number" min="0" step="50" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
          </div>
        </div>
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Deadline (optional)</label>
          <input v-model="goalForm.deadline" type="date" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
        </div>
        <button class="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm" @click="handleAddGoal">Create Goal</button>
      </div>

      <div class="space-y-2">
        <div v-for="g in savingsGoalStatus" :key="g.id" class="bg-card border border-border rounded-xl px-4 py-3">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-lg">{{ g.icon }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary truncate">{{ g.name }}</p>
              <p class="text-xs text-text-secondary">{{ sym }}{{ g.saved.toFixed(0) }} of {{ sym }}{{ g.target.toFixed(0) }}</p>
            </div>
            <span class="text-xs font-semibold" :class="g.completed ? 'text-primary' : 'text-blue-400'">{{ g.pct }}%</span>
            <button class="w-7 h-7 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center" @click="deleteSavingsGoal(g.id)">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="h-1.5 bg-surface rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-blue-400 transition-all" :style="{ width: Math.min(100, g.pct) + '%' }" />
          </div>
          <p v-if="g.deadline" class="text-[10px] text-text-secondary mt-1.5">Deadline: {{ formatDate(g.deadline) }}</p>
        </div>
      </div>
      <div v-if="savingsGoalStatus.length === 0" class="text-center py-12 text-text-secondary text-sm">No savings goals yet</div>
    </div>

    <!-- ── ACCOUNTS ── -->
    <div v-if="activeTab === 'accounts'" class="px-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-text-secondary">Accounts</h2>
        <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20" @click="showAccountForm = !showAccountForm">+ Add</button>
      </div>

      <div v-if="showAccountForm" class="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
        <input v-model="accountForm.name" type="text" placeholder="Account name (e.g. Tinkoff)" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50" />
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Type</label>
          <div class="flex gap-2 flex-wrap">
            <button v-for="t in accountTypes" :key="t.value" class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all border" :class="accountForm.type === t.value ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface text-text-secondary border-border'" @click="accountForm.type = t.value; accountForm.icon = t.icon">
              <span>{{ t.icon }}</span><span>{{ t.label }}</span>
            </button>
          </div>
        </div>
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Initial Balance ({{ sym }})</label>
          <input v-model.number="accountForm.initialBalance" type="number" step="100" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
        </div>
        <button class="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm" @click="handleAddAccount">Create Account</button>
      </div>

      <div class="space-y-2">
        <div v-for="acc in accountBalances" :key="acc.id" class="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
          <span class="text-lg">{{ acc.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ acc.name }}</p>
            <p class="text-[10px] text-text-secondary capitalize">{{ acc.type }} · {{ acc.transactionCount }} txns</p>
          </div>
          <p class="text-sm font-semibold" :class="acc.balance >= 0 ? 'text-primary' : 'text-danger'">{{ sym }}{{ acc.balance.toLocaleString('en-US', { minimumFractionDigits: 0 }) }}</p>
          <button class="w-7 h-7 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center" @click="deleteAccount(acc.id)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div v-if="accountBalances.length === 0" class="text-center py-12 text-text-secondary text-sm">No accounts yet</div>
    </div>

    <!-- ── MEMBERS ── -->
    <div v-if="activeTab === 'members'" class="px-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-text-secondary">Shared Members</h2>
        <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20" @click="showMemberForm = !showMemberForm">+ Add</button>
      </div>

      <div v-if="showMemberForm" class="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
        <input v-model="memberForm.name" type="text" placeholder="Name (e.g. Partner)" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50" />
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Avatar</label>
          <div class="flex gap-2 flex-wrap">
            <button v-for="av in avatarOpts" :key="av" class="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all border" :class="memberForm.avatar === av ? 'bg-primary/20 border-primary/40' : 'bg-surface border-border'" @click="memberForm.avatar = av">{{ av }}</button>
          </div>
        </div>
        <button class="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm" @click="handleAddMember">Add Member</button>
      </div>

      <div class="space-y-2">
        <div v-for="m in memberSpending" :key="m.id" class="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
          <span class="text-lg">{{ m.avatar }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ m.name }}</p>
            <p class="text-[10px] text-text-secondary">Spent: {{ sym }}{{ m.totalSpent.toFixed(0) }} · Earned: {{ sym }}{{ m.totalEarned.toFixed(0) }}</p>
          </div>
          <span class="text-xs font-semibold" :class="m.net >= 0 ? 'text-primary' : 'text-danger'">{{ m.net >= 0 ? '+' : '' }}{{ sym }}{{ m.net.toFixed(0) }}</span>
          <button class="w-7 h-7 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center" @click="removeMember(m.id)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div v-if="memberSpending.length === 0" class="text-center py-12 text-text-secondary text-sm">No members added yet</div>
    </div>

    <!-- ── DEBTS ── -->
    <div v-if="activeTab === 'debts'" class="px-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-text-secondary">Money Owed to You</h2>
        <button @click="openAddDebt" class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">+ Add</button>
      </div>

      <!-- Summary -->
      <div v-if="iouSummary.length > 0" class="flex gap-3 mb-4">
        <div class="flex-1 bg-card border border-border rounded-2xl p-3">
          <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Total Owed</p>
          <p class="text-lg font-bold text-primary">{{ sym }}{{ totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</p>
        </div>
        <div v-if="overdueCount > 0" class="flex-1 bg-danger/5 border border-danger/20 rounded-2xl p-3">
          <p class="text-[10px] text-danger uppercase tracking-wider mb-0.5">Overdue</p>
          <p class="text-lg font-bold text-danger">{{ overdueCount }} debt{{ overdueCount > 1 ? 's' : '' }}</p>
        </div>
      </div>

      <div class="space-y-3">
        <div v-for="iou in iouSummary" :key="iou.id" class="bg-card border rounded-2xl p-4" :class="iou.isOverdue ? 'border-danger/30' : 'border-border'">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold" :class="iou.paid ? 'bg-primary/10 text-primary' : iou.isOverdue ? 'bg-danger/10 text-danger' : 'bg-surface text-text-primary'">
                {{ iou.person.charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="font-semibold text-text-primary" :class="{ 'line-through opacity-50': iou.paid }">{{ iou.person }}</p>
                <p class="text-xs text-text-secondary">Lent {{ formatDate(iou.dateLent) }}</p>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="dueBadge(iou).cls">{{ dueBadge(iou).label }}</span>
          </div>

          <div class="flex gap-2 mb-3">
            <div class="flex-1 bg-surface rounded-xl p-2.5">
              <p class="text-[10px] text-text-secondary mb-0.5">Principal</p>
              <p class="text-sm font-semibold text-text-primary">{{ sym }}{{ iou.amount.toFixed(2) }}</p>
            </div>
            <div v-if="iou.interestRate > 0" class="flex-1 bg-surface rounded-xl p-2.5">
              <p class="text-[10px] text-text-secondary mb-0.5">Interest ({{ iou.interestRate }}%)</p>
              <p class="text-sm font-semibold text-warning">+{{ sym }}{{ iou.interest.toFixed(2) }}</p>
            </div>
            <div class="flex-1 bg-primary/5 border border-primary/10 rounded-xl p-2.5">
              <p class="text-[10px] text-primary mb-0.5">Total Due</p>
              <p class="text-sm font-bold text-primary">{{ sym }}{{ iou.totalDue.toFixed(2) }}</p>
            </div>
          </div>

          <p v-if="iou.notes" class="text-xs text-text-secondary italic mb-3">{{ iou.notes }}</p>

          <div class="flex gap-2">
            <button @click="updateIOU(iou.id, { paid: !iou.paid })" class="flex-1 text-xs py-2 rounded-xl font-medium border transition-colors" :class="iou.paid ? 'border-border text-text-secondary hover:border-primary/30 hover:text-primary' : 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10'">
              {{ iou.paid ? 'Mark Unpaid' : 'Mark Paid' }}
            </button>
            <button @click="openEditDebt(iou)" class="px-3 py-2 rounded-xl text-xs text-text-secondary border border-border hover:border-primary/30 hover:text-primary transition-colors">Edit</button>
            <button @click="confirmDeleteDebtId = iou.id" class="px-3 py-2 rounded-xl text-xs text-text-secondary border border-border hover:border-danger/30 hover:text-danger transition-colors">Delete</button>
          </div>
        </div>
      </div>
      <div v-if="iouSummary.length === 0" class="text-center py-12 text-text-secondary text-sm">No debts tracked yet</div>
    </div>

    <!-- ── DEBT MODAL ── -->
    <Teleport to="body">
      <div v-if="showDebtModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" @click.self="showDebtModal = false">
        <div class="bg-card rounded-3xl w-full max-w-md p-6 shadow-2xl">
          <h2 class="text-lg font-bold text-text-primary mb-5">{{ editingDebtId ? 'Edit Debt' : 'Add Debt' }}</h2>
          <div v-if="debtFormErrors.length" class="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger">{{ debtFormErrors.join(', ') }}</div>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary font-medium mb-1.5 block">Person's Name</label>
              <input v-model="debtForm.person" type="text" placeholder="e.g. John" class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-primary/50" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-text-secondary font-medium mb-1.5 block">Amount ({{ sym }})</label>
                <input v-model="debtForm.amount" type="number" min="0" step="0.01" placeholder="0.00" class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label class="text-xs text-text-secondary font-medium mb-1.5 block">Interest Rate (% / year)</label>
                <input v-model="debtForm.interestRate" type="number" min="0" step="0.1" placeholder="0 = none" class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-text-secondary font-medium mb-1.5 block">Date Lent</label>
                <input v-model="debtForm.dateLent" type="date" class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label class="text-xs text-text-secondary font-medium mb-1.5 block">Expected Repayment</label>
                <input v-model="debtForm.dueDate" type="date" class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div>
              <label class="text-xs text-text-secondary font-medium mb-1.5 block">Notes (optional)</label>
              <input v-model="debtForm.notes" type="text" placeholder="e.g. borrowed for rent" class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <button @click="showDebtModal = false" class="flex-1 py-3 rounded-xl border border-border text-sm text-text-secondary">Cancel</button>
            <button @click="saveDebt" class="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold">{{ editingDebtId ? 'Save Changes' : 'Add Debt' }}</button>
          </div>
        </div>
      </div>

      <div v-if="confirmDeleteDebtId" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="confirmDeleteDebtId = null">
        <div class="bg-card rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
          <p class="text-text-primary font-semibold mb-2">Delete this debt?</p>
          <p class="text-text-secondary text-sm mb-6">This cannot be undone.</p>
          <div class="flex gap-3">
            <button @click="confirmDeleteDebtId = null" class="flex-1 py-3 rounded-xl border border-border text-sm text-text-secondary">Cancel</button>
            <button @click="() => { deleteIOU(confirmDeleteDebtId); confirmDeleteDebtId = null }" class="flex-1 py-3 rounded-xl bg-danger text-white text-sm font-semibold">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
