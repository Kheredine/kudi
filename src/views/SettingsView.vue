<script setup>
import { ref } from 'vue'
import { useFinance } from '../composables/useFinance'
import { LANGUAGES } from '../composables/useI18n'
import RecurringItem from '../components/RecurringItem.vue'
import ExportModal from '../components/ExportModal.vue'

const { state, toggleRecurring, addShift, deleteShift, updateSettings, getCurrencySymbol,
  setBudget, deleteBudget, budgetStatus, addSavingsGoal, deleteSavingsGoal, savingsGoalStatus,
  CATEGORY_ICONS, applyTheme,
  addAccount, deleteAccount, accountBalances,
  addMember, removeMember, memberSpending } = useFinance()

const showExport = ref(false)

const activeTab = ref('shifts')

// Add shift form
const showShiftForm = ref(false)
const shiftForm = ref({
  date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  end_time: '17:00',
  break_hours: 1,
  hourly_rate: 25,
})

function handleAddShift() {
  addShift(shiftForm.value)
  showShiftForm.value = false
  shiftForm.value = {
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    break_hours: 1,
    hourly_rate: 25,
  }
}

// Add recurring form
const showRecurringForm = ref(false)
const recurringForm = ref({
  name: '',
  amount: 0,
  type: 'expense',
  frequency: 'monthly',
  day: 1,
  day_of_week: 'Thursday',
})

function handleAddRecurring() {
  if (!recurringForm.value.name || !recurringForm.value.amount) return
  const form = { ...recurringForm.value }
  if (form.frequency === 'weekly') {
    form.day = null
  } else {
    form.day_of_week = null
  }
  state.recurring.push({
    id: Date.now(),
    ...form,
    currency: state.settings.baseCurrency,
    active: true,
  })
  showRecurringForm.value = false
  recurringForm.value = { name: '', amount: 0, type: 'expense', frequency: 'monthly', day: 1, day_of_week: 'Thursday' }
}

function calculateShiftHours(shift) {
  const [startH, startM] = shift.start_time.split(':').map(Number)
  const [endH, endM] = shift.end_time.split(':').map(Number)
  let startMin = startH * 60 + startM
  let endMin = endH * 60 + endM
  if (endMin <= startMin) endMin += 24 * 60
  return Math.max(0, (endMin - startMin - (shift.break_hours || 0) * 60) / 60)
}

// Account form
const showAccountForm = ref(false)
const accountForm = ref({ name: '', type: 'checking', icon: '🏦', initialBalance: 0 })
const accountTypeOptions = [
  { value: 'checking', label: 'Checking', icon: '🏦' },
  { value: 'savings', label: 'Savings', icon: '💰' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'credit', label: 'Credit Card', icon: '💳' },
  { value: 'investment', label: 'Investment', icon: '📈' },
]

function handleAddAccount() {
  if (!accountForm.value.name) return
  addAccount(accountForm.value)
  showAccountForm.value = false
  accountForm.value = { name: '', type: 'checking', icon: '🏦', initialBalance: 0 }
}

// Member form
const showMemberForm = ref(false)
const memberForm = ref({ name: '', avatar: '👤', color: '#6366F1' })
const avatarOptions = ['👤', '👩', '👨', '👧', '👦', '🧑', '👫', '🏠']

function handleAddMember() {
  if (!memberForm.value.name) return
  addMember(memberForm.value)
  showMemberForm.value = false
  memberForm.value = { name: '', avatar: '👤', color: '#6366F1' }
}

// Budget form
const showBudgetForm = ref(false)
const budgetForm = ref({ category: 'Food & Drink', limit: 200 })
const expenseCategories = ['Food & Drink', 'Subscription', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Other']

function handleAddBudget() {
  if (!budgetForm.value.limit || budgetForm.value.limit <= 0) return
  setBudget(budgetForm.value.category, budgetForm.value.limit)
  showBudgetForm.value = false
  budgetForm.value = { category: 'Food & Drink', limit: 200 }
}

// Savings goal form
const showGoalForm = ref(false)
const goalForm = ref({ name: '', target: 1000, saved: 0, icon: '🎯', deadline: '' })
const goalIcons = ['🎯', '🏠', '🚗', '✈️', '💍', '💻', '📱', '🎓', '🏖️', '💰']

function handleAddGoal() {
  if (!goalForm.value.name || !goalForm.value.target) return
  addSavingsGoal({
    ...goalForm.value,
    deadline: goalForm.value.deadline || null,
  })
  showGoalForm.value = false
  goalForm.value = { name: '', target: 1000, saved: 0, icon: '🎯', deadline: '' }
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Header -->
    <div class="px-5 pt-8 pb-4">
      <h1 class="text-2xl font-bold text-text-primary">Settings</h1>
      <p class="text-sm text-text-secondary mt-1">{{ state.settings.userName }}</p>
    </div>

    <!-- Tabs -->
    <div class="px-5 mb-4">
      <div class="flex gap-2 bg-surface rounded-xl p-1">
        <button
          v-for="tab in ['accounts', 'members', 'shifts', 'recurring', 'budgets', 'goals', 'general']"
          :key="tab"
          class="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 capitalize"
          :class="activeTab === tab
            ? 'bg-card text-text-primary shadow-sm'
            : 'text-text-secondary hover:text-text-primary'"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </div>

    <!-- Accounts Tab -->
    <div v-if="activeTab === 'accounts'" class="px-5 pb-8">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Accounts</h3>
        <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors" @click="showAccountForm = !showAccountForm">+ Add</button>
      </div>

      <div v-if="showAccountForm" class="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
        <input v-model="accountForm.name" type="text" placeholder="Account name (e.g. Tinkoff)" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50" />
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Type</label>
          <div class="flex gap-2 flex-wrap">
            <button v-for="t in accountTypeOptions" :key="t.value" class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all" :class="accountForm.type === t.value ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface text-text-secondary border border-border'" @click="accountForm.type = t.value; accountForm.icon = t.icon">
              <span>{{ t.icon }}</span><span>{{ t.label }}</span>
            </button>
          </div>
        </div>
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Initial Balance</label>
          <input v-model.number="accountForm.initialBalance" type="number" step="100" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
        </div>
        <button class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-2.5 rounded-xl text-sm transition-colors" @click="handleAddAccount">Create Account</button>
      </div>

      <div class="space-y-2">
        <div v-for="acc in accountBalances" :key="acc.id" class="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
          <span class="text-lg">{{ acc.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ acc.name }}</p>
            <p class="text-[10px] text-text-secondary capitalize">{{ acc.type }} · {{ acc.transactionCount }} txns</p>
          </div>
          <p class="text-sm font-semibold" :class="acc.balance >= 0 ? 'text-primary' : 'text-danger'">{{ getCurrencySymbol(state.settings.baseCurrency) }}{{ acc.balance.toLocaleString('en-US', { minimumFractionDigits: 0 }) }}</p>
          <button class="w-7 h-7 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center" @click="deleteAccount(acc.id)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div v-if="accountBalances.length === 0" class="text-center py-8">
        <p class="text-text-secondary text-sm">No accounts yet</p>
        <p class="text-xs text-text-secondary/60 mt-1">Add accounts to track balances separately</p>
      </div>
    </div>

    <!-- Members Tab (Shared Finances) -->
    <div v-if="activeTab === 'members'" class="px-5 pb-8">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Shared Members</h3>
        <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors" @click="showMemberForm = !showMemberForm">+ Add</button>
      </div>

      <div v-if="showMemberForm" class="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
        <input v-model="memberForm.name" type="text" placeholder="Name (e.g. Partner)" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50" />
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Avatar</label>
          <div class="flex gap-2 flex-wrap">
            <button v-for="av in avatarOptions" :key="av" class="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all" :class="memberForm.avatar === av ? 'bg-primary/20 border border-primary/40' : 'bg-surface border border-border'" @click="memberForm.avatar = av">{{ av }}</button>
          </div>
        </div>
        <button class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-2.5 rounded-xl text-sm transition-colors" @click="handleAddMember">Add Member</button>
      </div>

      <div class="space-y-2">
        <div v-for="m in memberSpending" :key="m.id" class="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
          <span class="text-lg">{{ m.avatar }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ m.name }}</p>
            <p class="text-[10px] text-text-secondary">Spent: {{ getCurrencySymbol(state.settings.baseCurrency) }}{{ m.totalSpent.toFixed(0) }} · Earned: {{ getCurrencySymbol(state.settings.baseCurrency) }}{{ m.totalEarned.toFixed(0) }}</p>
          </div>
          <span class="text-xs font-semibold" :class="m.net >= 0 ? 'text-primary' : 'text-danger'">
            {{ m.net >= 0 ? '+' : '' }}{{ getCurrencySymbol(state.settings.baseCurrency) }}{{ m.net.toFixed(0) }}
          </span>
          <button class="w-7 h-7 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center" @click="removeMember(m.id)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div v-if="memberSpending.length === 0" class="text-center py-8">
        <p class="text-text-secondary text-sm">No members added</p>
        <p class="text-xs text-text-secondary/60 mt-1">Add your partner, roommate, or family member to track shared finances</p>
      </div>
    </div>

    <!-- Shifts Tab -->
    <div v-if="activeTab === 'shifts'" class="px-5 pb-8">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Your Shifts</h3>
        <button
          class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          @click="showShiftForm = !showShiftForm"
        >
          + Add Shift
        </button>
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
            <label class="text-[10px] text-text-secondary block mb-1">Rate ({{ getCurrencySymbol(state.settings.baseCurrency) }}/hr)</label>
            <input v-model.number="shiftForm.hourly_rate" type="number" step="1" min="0" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
          </div>
        </div>
        <button
          class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          @click="handleAddShift"
        >
          Add Shift
        </button>
      </div>

      <!-- Shift list -->
      <div class="space-y-2">
        <div
          v-for="shift in state.shifts"
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
            <p class="text-xs text-text-secondary">{{ shift.start_time }}–{{ shift.end_time }} · {{ calculateShiftHours(shift).toFixed(1) }}h · {{ getCurrencySymbol(state.settings.baseCurrency) }}{{ shift.hourly_rate }}/hr</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-sm font-semibold text-primary">{{ getCurrencySymbol(state.settings.baseCurrency) }}{{ (calculateShiftHours(shift) * shift.hourly_rate).toFixed(2) }}</p>
          </div>
          <button
            class="w-8 h-8 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center transition-colors shrink-0"
            @click="deleteShift(shift.id)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="state.shifts.length === 0" class="text-center py-8">
        <p class="text-text-secondary text-sm">No shifts added yet</p>
      </div>
    </div>

    <!-- Recurring Tab -->
    <div v-if="activeTab === 'recurring'" class="px-5 pb-8">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Recurring Items</h3>
        <button
          class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          @click="showRecurringForm = !showRecurringForm"
        >
          + Add
        </button>
      </div>

      <!-- Add recurring form -->
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
        <button
          class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          @click="handleAddRecurring"
        >
          Add Recurring
        </button>
      </div>

      <!-- Recurring list -->
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
    </div>

    <!-- Budgets Tab -->
    <div v-if="activeTab === 'budgets'" class="px-5 pb-8">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Budgets</h3>
        <button
          class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          @click="showBudgetForm = !showBudgetForm"
        >+ Add</button>
      </div>

      <!-- Budget form -->
      <div v-if="showBudgetForm" class="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Category</label>
          <select v-model="budgetForm.category" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary">
            <option v-for="cat in expenseCategories" :key="cat" :value="cat">{{ CATEGORY_ICONS[cat] || '📦' }} {{ cat }}</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] text-text-secondary block mb-1">Monthly limit</label>
          <input v-model.number="budgetForm.limit" type="number" min="0" step="10" class="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50" />
        </div>
        <button class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-2.5 rounded-xl text-sm transition-colors" @click="handleAddBudget">Set Budget</button>
      </div>

      <!-- Budget list -->
      <div class="space-y-2">
        <div v-for="b in budgetStatus" :key="b.id" class="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
          <span class="text-lg">{{ b.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary">{{ b.category }}</p>
            <div class="flex items-center gap-2 mt-1">
              <div class="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all" :style="{ width: Math.min(100, b.pct) + '%', background: b.overBudget ? '#EF4444' : b.pct > 75 ? '#F59E0B' : '#22C55E' }" />
              </div>
              <span class="text-[10px] text-text-secondary">{{ b.pct }}%</span>
            </div>
          </div>
          <button class="w-7 h-7 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center" @click="deleteBudget(b.id)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div v-if="budgetStatus.length === 0" class="text-center py-8">
        <p class="text-text-secondary text-sm">No budgets set yet</p>
        <p class="text-xs text-text-secondary/60 mt-1">Set monthly spending limits by category</p>
      </div>
    </div>

    <!-- Goals Tab -->
    <div v-if="activeTab === 'goals'" class="px-5 pb-8">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Savings Goals</h3>
        <button
          class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          @click="showGoalForm = !showGoalForm"
        >+ Add</button>
      </div>

      <!-- Goal form -->
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
            <label class="text-[10px] text-text-secondary block mb-1">Target amount</label>
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
        <button class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-2.5 rounded-xl text-sm transition-colors" @click="handleAddGoal">Create Goal</button>
      </div>

      <!-- Goals list -->
      <div class="space-y-2">
        <div v-for="g in savingsGoalStatus" :key="g.id" class="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
          <span class="text-lg">{{ g.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ g.name }}</p>
            <p class="text-xs text-text-secondary">{{ getCurrencySymbol(state.settings.baseCurrency) }}{{ g.saved.toFixed(0) }} / {{ getCurrencySymbol(state.settings.baseCurrency) }}{{ g.target.toFixed(0) }}</p>
          </div>
          <span class="text-xs font-semibold" :class="g.completed ? 'text-green-400' : 'text-blue-400'">{{ g.pct }}%</span>
          <button class="w-7 h-7 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger flex items-center justify-center" @click="deleteSavingsGoal(g.id)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div v-if="savingsGoalStatus.length === 0" class="text-center py-8">
        <p class="text-text-secondary text-sm">No savings goals yet</p>
        <p class="text-xs text-text-secondary/60 mt-1">Create goals to track what you're saving for</p>
      </div>
    </div>

    <!-- General Tab -->
    <div v-if="activeTab === 'general'" class="px-5 pb-8 space-y-4">
      <div class="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div>
          <label class="text-xs font-medium text-text-secondary mb-1.5 block">Name</label>
          <input
            :value="state.settings.userName"
            type="text"
            class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50"
            @input="updateSettings({ userName: $event.target.value })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-text-secondary mb-1.5 block">Payday (day of month)</label>
          <input
            :value="state.settings.paydayDay"
            type="number"
            min="1"
            max="31"
            class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50"
            @input="updateSettings({ paydayDay: parseInt($event.target.value) || 25 })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-text-secondary mb-1.5 block">Base Currency</label>
          <select
            :value="state.settings.baseCurrency"
            class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50"
            @change="updateSettings({ baseCurrency: $event.target.value })"
          >
            <option value="USD">🇺🇸 USD</option>
            <option value="EUR">🇪🇺 EUR</option>
            <option value="XOF">🇸🇳 XOF (FCFA)</option>
            <option value="RUB">🇷🇺 RUB</option>
            <option value="GBP">🇬🇧 GBP</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-text-secondary mb-1.5 block">Theme</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
              :class="state.settings.theme === 'dark'
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-surface text-text-secondary border border-border hover:border-primary/20'"
              @click="updateSettings({ theme: 'dark' }); applyTheme('dark')"
            >
              <span>🌙</span>
              <span class="font-medium">Dark</span>
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
              :class="state.settings.theme === 'light'
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-surface text-text-secondary border border-border hover:border-primary/20'"
              @click="updateSettings({ theme: 'light' }); applyTheme('light')"
            >
              <span>☀️</span>
              <span class="font-medium">Light</span>
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-text-secondary mb-1.5 block">Language</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="lang in LANGUAGES"
              :key="lang.code"
              class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
              :class="state.settings.language === lang.code
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-surface text-text-secondary border border-border hover:border-primary/20'"
              @click="updateSettings({ language: lang.code })"
            >
              <span>{{ lang.flag }}</span>
              <span class="font-medium">{{ lang.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Export -->
      <button
        class="w-full bg-card border border-border hover:border-primary/30 rounded-2xl p-4 flex items-center gap-3 transition-all group"
        @click="showExport = true"
      >
        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </div>
        <div class="text-left">
          <p class="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">Export All Data as PDF</p>
          <p class="text-xs text-text-secondary">Transactions, recurring, forecast</p>
        </div>
      </button>

      <!-- Data -->
      <div class="bg-card border border-border rounded-2xl p-4">
        <h4 class="text-sm font-semibold text-text-secondary mb-3">Data</h4>
        <div class="space-y-2 text-xs text-text-secondary">
          <div class="flex justify-between">
            <span>Transactions</span>
            <span class="text-text-primary">{{ state.transactions.length }}</span>
          </div>
          <div class="flex justify-between">
            <span>Shifts</span>
            <span class="text-text-primary">{{ state.shifts.length }}</span>
          </div>
          <div class="flex justify-between">
            <span>Recurring items</span>
            <span class="text-text-primary">{{ state.recurring.length }}</span>
          </div>
        </div>
      </div>

      <!-- Reset -->
      <button
        class="w-full bg-danger/10 hover:bg-danger/20 text-danger font-semibold py-3 rounded-xl text-sm transition-colors"
        @click="if (confirm('Reset all data?')) { localStorage.clear(); location.reload() }"
      >
        Reset All Data
      </button>
    </div>

    <!-- Export Modal -->
    <ExportModal
      v-if="showExport"
      initialDataSet="all"
      @close="showExport = false"
    />
  </div>
</template>
