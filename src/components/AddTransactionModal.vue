<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../composables/useFinance'

const { state, getCurrencySymbol, addReceiptPhoto, processReceiptWithAI } = useFinance()

const showReceiptScan = ref(false)
const receiptPreview = ref(null)
const receiptProcessing = ref(false)

function handleReceiptUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (ev) => {
    receiptPreview.value = ev.target.result
    receiptProcessing.value = true
    
    const receipt = addReceiptPhoto(ev.target.result)
    processReceiptWithAI(receipt.id).then((data) => {
      if (data) {
        label.value = data.label || label.value
        amount.value = data.amount || amount.value
        category.value = data.category || category.value
        date.value = data.date || date.value
      }
      receiptProcessing.value = false
    })
  }
  reader.readAsDataURL(file)
}

const emit = defineEmits(['close', 'add'])

const currencySymbol = computed(() => getCurrencySymbol(state.settings.baseCurrency))

const type = ref('expense')
const amount = ref('')
const category = ref('Food & Drink')
const label = ref('')
const date = ref(new Date().toISOString().split('T')[0])

const typeOptions = [
  { value: 'expense', label: 'Expense', color: 'text-danger' },
  { value: 'income', label: 'Income', color: 'text-primary' },
  { value: 'saving', label: 'Savings', color: 'text-blue-400' },
]

const expenseCategories = ['Food & Drink', 'Subscription', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Other']
const incomeCategories = ['Income', 'Freelance', 'Gift', 'Other']
const savingCategories = ['Savings', 'Vault', 'Emergency Fund', 'Investment']

const categories = computed(() => {
  switch (type.value) {
    case 'income': return incomeCategories
    case 'saving': return savingCategories
    default: return expenseCategories
  }
})

function handleSubmit() {
  if (!amount.value || !label.value) return
  const numAmount = parseFloat(amount.value)
  if (isNaN(numAmount) || numAmount <= 0) return

  emit('add', {
    type: type.value,
    amount: numAmount,
    category: category.value,
    label: label.value,
    date: date.value,
  })

  amount.value = ''
  label.value = ''
  type.value = 'expense'
  category.value = 'Food & Drink'
  date.value = new Date().toISOString().split('T')[0]
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" @click="emit('close')" />
    </transition>
    <transition name="slide-up">
      <div class="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-3xl p-6 max-w-lg mx-auto">
        <div class="w-10 h-1 bg-surface rounded-full mx-auto mb-6" />
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-text-primary">Add Transaction</h2>
          <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-secondary hover:border-primary/30 hover:text-primary cursor-pointer transition-all">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
            <span>{{ receiptProcessing ? 'Scanning...' : 'Scan Receipt' }}</span>
            <input type="file" accept="image/*" capture="environment" class="hidden" @change="handleReceiptUpload" />
          </label>
        </div>

        <!-- Receipt preview -->
        <div v-if="receiptPreview && receiptProcessing" class="mb-4 bg-surface border border-border rounded-xl p-3 flex items-center gap-3">
          <img :src="receiptPreview" class="w-12 h-12 rounded-lg object-cover" />
          <div class="flex-1">
            <p class="text-xs text-text-primary font-medium">Processing receipt...</p>
            <p class="text-[10px] text-text-secondary">AI is extracting details</p>
          </div>
          <div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Type -->
          <div>
            <label class="text-xs font-medium text-text-secondary mb-1.5 block">Type</label>
            <div class="flex gap-2">
              <button
                v-for="opt in typeOptions"
                :key="opt.value"
                type="button"
                class="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border"
                :class="type === opt.value
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-surface text-text-secondary border-border hover:border-text-secondary/30'"
                @click="type = opt.value; category = categories[0]"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

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
                class="w-full bg-surface border border-border rounded-xl pl-8 pr-4 py-3 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                autofocus
              />
            </div>
          </div>

          <!-- Label -->
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
                v-for="cat in categories"
                :key="cat"
                type="button"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                :class="category === cat
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-surface text-text-secondary border border-border hover:border-text-secondary/30'"
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

          <button type="submit" class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-3.5 rounded-xl transition-colors duration-200 mt-2">
            Add Transaction
          </button>
        </form>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
.slide-up-enter-active,
.slide-up-leave-active { transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from,
.slide-up-leave-to { transform: translateY(100%); }
</style>