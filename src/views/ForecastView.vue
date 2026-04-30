<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFinance } from '../composables/useFinance'
import ExportModal from '../components/ExportModal.vue'

const router = useRouter()
const {
  forecast, lowestBalancePoint, currentBalance, getCurrencySymbol, state,
  upcomingIncomes, INCOME_TYPE_META,
  addFutureIncome, deleteFutureIncome,
} = useFinance()

const showExport = ref(false)
const showAddForm = ref(false)
const sym = () => getCurrencySymbol(state.settings.baseCurrency)

// ── Add Form ──────────────────────────────────────────────────
const form = ref({
  type: 'custom',
  title: '',
  amount: '',
  dueDate: '',
  source: '',
})
const formError = ref('')

const incomeTypes = [
  { id: 'custom',      label: 'Other',       icon: '💰' },
  { id: 'salary',      label: 'Salary',      icon: '💼' },
  { id: 'debt',        label: 'Debt Repay',  icon: '🤝' },
  { id: 'gift',        label: 'Gift',        icon: '🎁' },
  { id: 'scholarship', label: 'Scholarship', icon: '🎓' },
]

function openAddForm() {
  form.value = { type: 'custom', title: '', amount: '', dueDate: '', source: '' }
  formError.value = ''
  showAddForm.value = true
}

function submitAdd() {
  if (!form.value.title.trim()) { formError.value = 'Title is required'; return }
  if (!form.value.amount || isNaN(form.value.amount) || Number(form.value.amount) <= 0) {
    formError.value = 'Enter a valid amount'; return
  }
  if (!form.value.dueDate) { formError.value = 'Due date is required'; return }

  addFutureIncome({
    type: form.value.type,
    title: form.value.title.trim(),
    amount: Number(form.value.amount),
    dueDate: form.value.dueDate,
    source: form.value.source.trim(),
  })
  showAddForm.value = false
}

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function daysAway(dateStr) {
  const today = new Date().toISOString().split('T')[0]
  const diff = Math.ceil((new Date(dateStr + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
  if (diff === 0) return 'Today at 16:00'
  if (diff === 1) return 'Tomorrow at 16:00'
  return `In ${diff} days`
}

function daysAwaySeverity(dateStr) {
  const today = new Date().toISOString().split('T')[0]
  const diff = Math.ceil((new Date(dateStr + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
  if (diff <= 1) return 'text-primary font-semibold'
  if (diff <= 7) return 'text-amber-400'
  return 'text-text-secondary'
}

function typeMeta(type) {
  return INCOME_TYPE_META[type] || INCOME_TYPE_META.custom
}
</script>

<template>
  <div class="max-w-lg mx-auto">

    <!-- Header -->
    <div class="px-5 pt-8 pb-4 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Income Forecast</h1>
        <p class="text-sm text-text-secondary mt-1">
          Balance:
          <span class="font-semibold" :class="currentBalance >= 0 ? 'text-primary' : 'text-danger'">
            {{ sym() }}{{ currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </span>
        </p>
      </div>
      <button
        class="mt-1 p-2 rounded-xl bg-surface border border-border hover:border-primary/30 text-text-secondary hover:text-primary transition-all"
        @click="showExport = true"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </button>
    </div>

    <!-- Upcoming Income -->
    <div class="px-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Upcoming Income</h2>
        <button
          @click="openAddForm"
          class="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="upcomingIncomes.length === 0" class="bg-surface border border-border rounded-2xl p-5 text-center">
        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <svg class="w-5 h-5 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-text-primary mb-1">No upcoming payments</p>
        <p class="text-xs text-text-secondary">Add shifts or tap "Add" to track expected income.</p>
      </div>

      <!-- Cards -->
      <div v-else class="space-y-3">
        <div
          v-for="fi in upcomingIncomes"
          :key="fi.id"
          class="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-colors"
        >
          <div class="flex items-start gap-3">
            <!-- Type icon -->
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 :class="typeMeta(fi.type).bg">
              <span class="text-xl">{{ typeMeta(fi.type).icon }}</span>
            </div>

            <!-- Main content -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-text-primary leading-tight">{{ fi.title }}</p>
              <p v-if="fi.source" class="text-xs text-text-secondary mt-0.5">{{ fi.source }}</p>
              <p v-if="fi.type === 'salary' && fi.meta?.shiftCount" class="text-xs text-text-secondary mt-0.5">
                {{ fi.meta.shiftCount }} shift{{ fi.meta.shiftCount !== 1 ? 's' : '' }}
                <template v-if="fi.meta.totalHours"> · {{ fi.meta.totalHours }}h</template>
              </p>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="text-xs text-text-secondary">{{ fmtDate(fi.dueDate) }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border"
                      :class="daysAwaySeverity(fi.dueDate)">
                  {{ daysAway(fi.dueDate) }}
                </span>
              </div>
            </div>

            <!-- Amount + delete -->
            <div class="flex flex-col items-end gap-2 shrink-0">
              <p class="text-base font-bold text-primary">
                +{{ sym() }}{{ fi.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </p>
              <button
                @click="deleteFutureIncome(fi.id)"
                class="p-1 rounded-lg text-text-secondary/40 hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Past Payments link -->
      <button
        @click="router.push('/income-history')"
        class="mt-4 w-full flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-xl hover:border-primary/20 transition-colors group"
      >
        <span class="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Past Payments</span>
        <svg class="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>

    <!-- Lowest Balance Warning -->
    <div v-if="lowestBalancePoint?.balance < currentBalance" class="px-5 mb-4">
      <div class="bg-danger/5 border border-danger/20 rounded-2xl px-4 py-3">
        <div class="flex items-center gap-2 mb-1">
          <svg class="w-4 h-4 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span class="text-xs font-semibold text-danger">Projected Low Balance</span>
        </div>
        <p class="text-sm font-medium text-text-primary">{{ sym() }}{{ lowestBalancePoint.balance.toFixed(2) }}</p>
        <p class="text-xs text-text-secondary mt-0.5">{{ lowestBalancePoint.date }}</p>
      </div>
    </div>

    <!-- 30-Day Timeline -->
    <div class="px-5 pb-24">
      <h2 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">30-Day Balance Timeline</h2>

      <div v-if="forecast.length === 0" class="py-8 text-center">
        <p class="text-text-secondary text-sm">No upcoming events</p>
      </div>

      <div v-else class="space-y-1">
        <div
          v-for="(item, idx) in forecast"
          :key="idx"
          class="flex items-center gap-3 py-2.5 px-3 rounded-xl"
          :class="item.runningBalance < 0 ? 'bg-danger/5' : ''"
        >
          <div class="w-14 shrink-0">
            <p class="text-xs text-text-secondary">{{ item.date.slice(5) }}</p>
          </div>
          <div class="w-2.5 h-2.5 rounded-full shrink-0"
               :class="item.type === 'income' ? 'bg-primary' : item.type === 'saving' ? 'bg-blue-400' : 'bg-danger'" />
          <div class="flex-1 min-w-0">
            <p class="text-sm text-text-primary truncate">
              {{ item.label }}
              <span v-if="item.isRecurring" class="text-[10px] text-text-secondary ml-1">↻</span>
            </p>
          </div>
          <p class="text-sm font-medium shrink-0 w-20 text-right"
             :class="item.amount > 0 ? 'text-primary' : item.type === 'saving' ? 'text-blue-400' : 'text-danger'">
            {{ item.amount > 0 ? '+' : '' }}{{ sym() }}{{ Math.abs(item.amount).toFixed(2) }}
          </p>
          <p class="text-xs font-medium shrink-0 w-20 text-right"
             :class="item.runningBalance < 0 ? 'text-danger' : 'text-text-secondary'">
            {{ sym() }}{{ item.runningBalance.toFixed(2) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Add Income Sheet -->
    <transition name="sheet">
      <div v-if="showAddForm" class="fixed inset-0 z-50 flex flex-col justify-end">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="showAddForm = false" />

        <!-- Sheet -->
        <div class="relative bg-card rounded-t-3xl px-5 pt-5 pb-10 space-y-4 max-w-lg mx-auto w-full">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-base font-semibold text-text-primary">Add Expected Income</h3>
            <button @click="showAddForm = false" class="p-1 text-text-secondary hover:text-text-primary">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Type selector -->
          <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              v-for="t in incomeTypes"
              :key="t.id"
              @click="form.type = t.id"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border shrink-0 transition-colors"
              :class="form.type === t.id
                ? 'bg-primary border-primary text-white'
                : 'bg-surface border-border text-text-secondary hover:border-primary/30'"
            >
              <span>{{ t.icon }}</span> {{ t.label }}
            </button>
          </div>

          <!-- Title -->
          <div>
            <label class="text-xs text-text-secondary mb-1 block">Title</label>
            <input
              v-model="form.title"
              type="text"
              placeholder="e.g. April Salary, John owes me"
              class="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary/50"
            />
          </div>

          <!-- Amount + Date row -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-secondary mb-1 block">Amount</label>
              <input
                v-model="form.amount"
                type="number"
                inputmode="decimal"
                placeholder="0.00"
                class="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label class="text-xs text-text-secondary mb-1 block">Expected date</label>
              <input
                v-model="form.dueDate"
                type="date"
                class="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <!-- Source (optional) -->
          <div>
            <label class="text-xs text-text-secondary mb-1 block">Source <span class="opacity-50">(optional)</span></label>
            <input
              v-model="form.source"
              type="text"
              placeholder="e.g. Company name, person's name"
              class="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary/50"
            />
          </div>

          <p v-if="formError" class="text-xs text-danger">{{ formError }}</p>

          <button
            @click="submitAdd"
            class="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Add Income
          </button>
        </div>
      </div>
    </transition>

    <ExportModal v-if="showExport" initialDataSet="forecast" @close="showExport = false" />
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

.sheet-enter-active, .sheet-leave-active { transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1); }
.sheet-enter-from .sheet-leave-to { opacity: 0; transform: translateY(100%); }
</style>
