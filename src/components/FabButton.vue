<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useFinance } from '../composables/useFinance'

const { addTransaction, addShift, state, getCurrencySymbol } = useFinance()

const isOpen = ref(false)
const mode = ref(null) // null | 'smart' | 'expense' | 'shift' | 'income' | 'saving'
const smartInput = ref('')
const amount = ref('')
const label = ref('')
const category = ref('Food & Drink')
const date = ref(new Date().toISOString().split('T')[0])
const startTime = ref('09:00')
const endTime = ref('17:00')
const breakMinutes = ref(0)
const smartInputRef = ref(null)

// Pre-fill hourly rate from settings or last shift
const lastRate = computed(() => {
  if (state.shifts.length > 0) {
    const rates = state.shifts.map(s => s.hourly_rate || 0).filter(r => r > 0)
    if (rates.length > 0) return rates[rates.length - 1]
  }
  return 25
})
const hourlyRate = ref(lastRate.value)

const currencySymbol = computed(() => getCurrencySymbol(state.settings.baseCurrency))

const expenseCategories = ['Food & Drink', 'Subscription', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Other']
const incomeCategories = ['Income', 'Freelance', 'Gift', 'Other']
const savingCategories = ['Savings', 'Vault', 'Emergency Fund', 'Investment']

// ============================================================
// SHIFT AUTO-CALCULATION (Real-time)
// ============================================================

const shiftCalc = computed(() => {
  if (!startTime.value || !endTime.value) return { hours: 0, amount: 0, valid: false }

  const [startH, startM] = startTime.value.split(':').map(Number)
  const [endH, endM] = endTime.value.split(':').map(Number)

  let startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM

  // Overnight shift detection
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }

  const totalMinutes = endMinutes - startMinutes
  const breakTotal = Number(breakMinutes.value) || 0
  const netMinutes = Math.max(0, totalMinutes - breakTotal)
  const hours = Math.round((netMinutes / 60) * 100) / 100
  const rate = Number(hourlyRate.value) || 0
  const calcAmount = Math.round(hours * rate * 100) / 100

  return {
    hours,
    amount: calcAmount,
    valid: hours > 0 && rate > 0,
    isOvernight: endMinutes > 24 * 60,
  }
})

// Animation trigger for amount changes
const amountFlash = ref(false)
watch(() => shiftCalc.value.amount, () => {
  amountFlash.value = true
  setTimeout(() => { amountFlash.value = false }, 300)
})

// Quick-fill presets
const shiftPresets = [
  { label: '4h', hours: 4 },
  { label: '6h', hours: 6 },
  { label: '8h', hours: 8 },
  { label: '10h', hours: 10 },
  { label: '12h', hours: 12 },
]

function applyPreset(hours) {
  const now = new Date()
  const startH = now.getHours()
  const startM = now.getMinutes()
  startTime.value = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
  const endTotalMin = startH * 60 + startM + hours * 60
  const endH = Math.floor(endTotalMin / 60) % 24
  const endMin = endTotalMin % 60
  endTime.value = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
}

// ============================================================
// ACTIONS
// ============================================================

function openAction() {
  isOpen.value = true
}

function closeAction() {
  isOpen.value = false
  mode.value = null
  resetForm()
}

function resetForm() {
  smartInput.value = ''
  amount.value = ''
  label.value = ''
  category.value = 'Food & Drink'
  date.value = new Date().toISOString().split('T')[0]
  startTime.value = '09:00'
  endTime.value = '17:00'
  breakMinutes.value = 0
  hourlyRate.value = lastRate.value
}

function selectAction(action) {
  mode.value = action
  if (action === 'smart') {
    nextTick(() => smartInputRef.value?.focus())
  }
}

// Smart input parser: "500 food" → amount=500, category=food
function parseSmartInput(input) {
  const trimmed = input.trim()
  if (!trimmed) return null

  const match = trimmed.match(/^(\d+\.?\d*)\s*(.*)/)
  if (match) {
    return {
      amount: parseFloat(match[1]),
      label: match[2] || 'Quick entry',
      category: guessCategory(match[2]),
    }
  }

  const matchEnd = trimmed.match(/(.+?)\s+(\d+\.?\d*)$/)
  if (matchEnd) {
    return {
      amount: parseFloat(matchEnd[2]),
      label: matchEnd[1].trim(),
      category: guessCategory(matchEnd[1]),
    }
  }

  return null
}

function guessCategory(text) {
  if (!text) return 'Other'
  const lower = text.toLowerCase()
  if (/food|eat|restaurant|coffee|starbucks|grocery|lunch|dinner|breakfast/.test(lower)) return 'Food & Drink'
  if (/uber|lyft|gas|fuel|transit|bus|metro/.test(lower)) return 'Transport'
  if (/netflix|spotify|sub|chatgpt|gpt/.test(lower)) return 'Subscription'
  if (/amazon|shop|buy|store|clothes/.test(lower)) return 'Shopping'
  if (/movie|game|entertain|concert/.test(lower)) return 'Entertainment'
  if (/bill|electric|water|internet|rent/.test(lower)) return 'Utilities'
  if (/freelance|client|project|contract/.test(lower)) return 'Freelance'
  if (/save|vault|invest/.test(lower)) return 'Savings'
  return 'Other'
}

function handleSmartSubmit() {
  const parsed = parseSmartInput(smartInput.value)
  if (!parsed || parsed.amount <= 0) return

  const isSaving = /save|vault|invest/i.test(smartInput.value)
  const isIncome = /income|salary|freelance|received/i.test(smartInput.value)

  addTransaction({
    type: isSaving ? 'saving' : isIncome ? 'income' : 'expense',
    amount: parsed.amount,
    category: parsed.category,
    label: parsed.label,
    date: date.value,
  })

  closeAction()
}

function handleFormSubmit() {
  if (mode.value === 'shift') {
    if (!shiftCalc.value.valid) return

    // Add the shift
    addShift({
      date: date.value,
      start_time: startTime.value,
      end_time: endTime.value,
      break_hours: Number(breakMinutes.value) / 60 || 0,
      hourly_rate: Number(hourlyRate.value),
    })

    // Also add as income transaction
    const hoursStr = shiftCalc.value.hours % 1 === 0
      ? `${shiftCalc.value.hours}`
      : `${shiftCalc.value.hours.toFixed(1)}`
    addTransaction({
      type: 'income',
      amount: shiftCalc.value.amount,
      currency: state.settings.baseCurrency,
      category: 'Income',
      label: `Work shift (${startTime.value}–${endTime.value})`,
      date: date.value,
      note: `${hoursStr}h × ${Number(hourlyRate.value).toLocaleString()} ${currencySymbol.value}/h`,
    })
  } else {
    const numAmount = parseFloat(amount.value)
    if (isNaN(numAmount) || numAmount <= 0) return

    addTransaction({
      type: mode.value === 'income' ? 'income' : mode.value === 'saving' ? 'saving' : 'expense',
      amount: numAmount,
      category: category.value,
      label: label.value || category.value,
      date: date.value,
    })
  }

  closeAction()
}

function getCategories() {
  if (mode.value === 'income') return incomeCategories
  if (mode.value === 'saving') return savingCategories
  return expenseCategories
}
</script>

<template>
  <!-- FAB Button (mobile only) -->
  <button
    class="md:hidden fixed right-5 bottom-24 w-14 h-14 bg-primary hover:bg-primary-dim text-white rounded-2xl shadow-lg shadow-primary/25 flex items-center justify-center z-50 active:scale-90 transition-transform duration-200"
    @click="openAction"
  >
    <svg class="w-6 h-6 transition-transform duration-200" :class="isOpen ? 'rotate-45' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  </button>

  <!-- Action Sheet Overlay -->
  <Teleport to="body">
    <transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" @click="closeAction" />
    </transition>

    <transition name="slide-up">
      <div v-if="isOpen" class="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-3xl max-w-lg mx-auto max-h-[85vh] overflow-y-auto">
        <!-- Handle -->
        <div class="w-10 h-1 bg-surface rounded-full mx-auto mt-3 mb-2" />

        <!-- Action Selection -->
        <div v-if="!mode" class="p-6 pt-2">
          <h3 class="text-lg font-semibold text-text-primary mb-5">Quick Add</h3>

          <!-- Smart Input -->
          <div class="mb-5">
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm font-medium">⚡</span>
              <input
                ref="smartInputRef"
                v-model="smartInput"
                type="text"
                placeholder='Type "500 food" for quick entry'
                class="w-full bg-surface border border-primary/20 rounded-xl pl-10 pr-4 py-3.5 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                @keyup.enter="handleSmartSubmit"
              />
            </div>
            <button
              v-if="smartInput.trim()"
              class="w-full mt-2 bg-primary text-white font-semibold py-3 rounded-xl active:scale-[0.98] transition-transform"
              @click="handleSmartSubmit"
            >
              Add "{{ smartInput }}"
            </button>
          </div>

          <p class="text-xs text-text-secondary mb-3 font-medium">Or choose type</p>

          <div class="grid grid-cols-2 gap-3">
            <button
              class="flex items-center gap-3 p-4 rounded-2xl bg-danger/5 border border-danger/15 active:scale-[0.97] transition-transform"
              @click="selectAction('expense')"
            >
              <div class="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
                </svg>
              </div>
              <div class="text-left">
                <p class="text-sm font-medium text-text-primary">Expense</p>
                <p class="text-[10px] text-text-secondary">Quick log</p>
              </div>
            </button>

            <button
              class="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15 active:scale-[0.97] transition-transform"
              @click="selectAction('income')"
            >
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div class="text-left">
                <p class="text-sm font-medium text-text-primary">Income</p>
                <p class="text-[10px] text-text-secondary">Money in</p>
              </div>
            </button>

            <button
              class="flex items-center gap-3 p-4 rounded-2xl bg-blue-400/5 border border-blue-400/15 active:scale-[0.97] transition-transform"
              @click="selectAction('saving')"
            >
              <div class="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div class="text-left">
                <p class="text-sm font-medium text-text-primary">Saving</p>
                <p class="text-[10px] text-text-secondary">Put away</p>
              </div>
            </button>

            <button
              class="flex items-center gap-3 p-4 rounded-2xl bg-amber-400/5 border border-amber-400/15 active:scale-[0.97] transition-transform"
              @click="selectAction('shift')"
            >
              <div class="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="text-left">
                <p class="text-sm font-medium text-text-primary">Shift</p>
                <p class="text-[10px] text-text-secondary">Log hours</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Form Mode -->
        <div v-else class="p-6 pt-2">
          <div class="flex items-center gap-3 mb-5">
            <button class="w-8 h-8 rounded-lg bg-surface flex items-center justify-center" @click="mode = null">
              <svg class="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h3 class="text-lg font-semibold text-text-primary">
              {{ mode === 'shift' ? 'Add Shift' : mode === 'income' ? 'Add Income' : mode === 'saving' ? 'Add Saving' : 'Add Expense' }}
            </h3>
          </div>

          <!-- ============================================ -->
          <!-- SHIFT FORM (Enhanced with auto-calculation) -->
          <!-- ============================================ -->
          <form v-if="mode === 'shift'" @submit.prevent="handleFormSubmit" class="space-y-4">
            <!-- Date -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Date</label>
              <input
                v-model="date"
                type="date"
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <!-- Start / End time -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-text-secondary mb-1.5 block">Start Time</label>
                <input
                  v-model="startTime"
                  type="time"
                  class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
              <div>
                <label class="text-xs font-medium text-text-secondary mb-1.5 block">End Time</label>
                <input
                  v-model="endTime"
                  type="time"
                  class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <!-- Break time -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Break <span class="text-text-secondary/50">(minutes)</span></label>
              <input
                v-model="breakMinutes"
                type="number"
                min="0"
                step="15"
                placeholder="0"
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            <!-- Hourly Rate -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Hourly Rate</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">{{ currencySymbol }}</span>
                <input
                  v-model="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  class="w-full bg-surface border border-border rounded-xl pl-8 pr-4 py-3 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <!-- Quick-fill presets -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Quick Fill</label>
              <div class="flex gap-2">
                <button
                  v-for="preset in shiftPresets"
                  :key="preset.label"
                  type="button"
                  class="flex-1 py-2 rounded-lg text-xs font-medium bg-surface border border-border text-text-secondary hover:border-primary/30 hover:text-primary active:scale-95 transition-all"
                  @click="applyPreset(preset.hours)"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>

            <!-- Live Calculation Display -->
            <div
              class="rounded-2xl p-4 transition-all duration-300"
              :class="shiftCalc.valid
                ? 'bg-primary/10 border border-primary/20'
                : 'bg-surface border border-border'"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-text-secondary">Total Hours</span>
                <span class="text-sm font-bold text-text-primary">
                  {{ shiftCalc.hours % 1 === 0 ? shiftCalc.hours : shiftCalc.hours.toFixed(1) }}h
                  <span v-if="shiftCalc.isOvernight" class="text-[10px] text-amber-400 ml-1">🌙 overnight</span>
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-text-secondary">Earned</span>
                <span
                  class="text-lg font-bold transition-all duration-300"
                  :class="[
                    shiftCalc.valid ? 'text-primary' : 'text-text-secondary',
                    amountFlash ? 'scale-110' : 'scale-100'
                  ]"
                >
                  {{ currencySymbol }}{{ shiftCalc.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
                </span>
              </div>
              <div v-if="shiftCalc.hours > 0 && Number(hourlyRate) > 0" class="mt-2 pt-2 border-t border-border/50">
                <p class="text-[10px] text-text-secondary">
                  {{ shiftCalc.hours }}h × {{ Number(hourlyRate).toLocaleString() }} {{ currencySymbol }}/h
                  <span v-if="breakMinutes > 0"> · {{ breakMinutes }}min break</span>
                </p>
              </div>
            </div>

            <!-- Validation errors -->
            <div v-if="startTime && endTime && shiftCalc.hours <= 0" class="text-xs text-danger">
              ⚠️ End time must be after start time
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="w-full font-semibold py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
              :class="shiftCalc.valid
                ? 'bg-primary hover:bg-primary-dim text-white'
                : 'bg-surface text-text-secondary cursor-not-allowed'"
              :disabled="!shiftCalc.valid"
            >
              Add Shift
            </button>
          </form>

          <!-- ============================================ -->
          <!-- TRANSACTION FORM (expense / income / saving) -->
          <!-- ============================================ -->
          <form v-else @submit.prevent="handleFormSubmit" class="space-y-4">
            <!-- Amount -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Amount</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">{{ currencySymbol }}</span>
                <input
                  v-model="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="w-full bg-surface border border-border rounded-xl pl-8 pr-4 py-3.5 text-text-primary text-lg font-semibold placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  autofocus
                />
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Description</label>
              <input
                v-model="label"
                type="text"
                placeholder="What was this for?"
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <!-- Category -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Category</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="cat in getCategories()"
                  :key="cat"
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                  :class="category === cat
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-surface text-text-secondary border border-border'"
                  @click="category = cat"
                >
                  {{ cat }}
                </button>
              </div>
            </div>

            <!-- Date -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Date</label>
              <input
                v-model="date"
                type="date"
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <button type="submit" class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-3.5 rounded-xl transition-colors duration-200 active:scale-[0.98]">
              Save
            </button>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>