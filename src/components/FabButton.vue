<script setup>
import { ref, nextTick } from 'vue'
import { useFinance } from '../composables/useFinance'

const { addTransaction, addShift } = useFinance()

const isOpen = ref(false)
const mode = ref(null) // null | 'smart' | 'expense' | 'shift' | 'income' | 'saving'
const smartInput = ref('')
const amount = ref('')
const label = ref('')
const category = ref('Food & Drink')
const date = ref(new Date().toISOString().split('T')[0])
const startTime = ref('09:00')
const endTime = ref('17:00')
const hourlyRate = ref(25)
const smartInputRef = ref(null)

const expenseCategories = ['Food & Drink', 'Subscription', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Other']
const incomeCategories = ['Income', 'Freelance', 'Gift', 'Other']
const savingCategories = ['Savings', 'Vault', 'Emergency Fund', 'Investment']

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
  hourlyRate.value = 25
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

  // Try to extract number from start
  const match = trimmed.match(/^(\d+\.?\d*)\s*(.*)/)
  if (match) {
    return {
      amount: parseFloat(match[1]),
      label: match[2] || 'Quick entry',
      category: guessCategory(match[2]),
    }
  }

  // Try number at end
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
  const numAmount = parseFloat(amount.value)
  if (isNaN(numAmount) || numAmount <= 0) return

  if (mode.value === 'shift') {
    addShift({
      date: date.value,
      start_time: startTime.value,
      end_time: endTime.value,
      break_hours: 1,
      hourly_rate: hourlyRate.value,
    })
  } else {
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

          <form @submit.prevent="handleFormSubmit" class="space-y-4">
            <!-- Amount -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Amount</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
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

            <!-- Description (not for shift) -->
            <div v-if="mode !== 'shift'">
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Description</label>
              <input
                v-model="label"
                type="text"
                placeholder="What was this for?"
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <!-- Category (not for shift) -->
            <div v-if="mode !== 'shift'">
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

            <!-- Shift fields -->
            <template v-if="mode === 'shift'">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-text-secondary mb-1.5 block">Start</label>
                  <input v-model="startTime" type="time" class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-all" />
                </div>
                <div>
                  <label class="text-xs font-medium text-text-secondary mb-1.5 block">End</label>
                  <input v-model="endTime" type="time" class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-all" />
                </div>
              </div>
              <div>
                <label class="text-xs font-medium text-text-secondary mb-1.5 block">Hourly Rate ($)</label>
                <input v-model="hourlyRate" type="number" min="0" class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-all" />
              </div>
            </template>

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
              {{ mode === 'shift' ? 'Add Shift' : 'Save' }}
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