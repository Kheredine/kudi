<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../composables/useFinance'
import TransactionItem from '../components/TransactionItem.vue'
import AddTransactionModal from '../components/AddTransactionModal.vue'
import ExportModal from '../components/ExportModal.vue'

const { state, addTransaction, deleteTransaction, updateTransaction, getCurrencySymbol } = useFinance()

const showModal = ref(false)
const showExport = ref(false)
const editingTransaction = ref(null)
const searchQuery = ref('')
const filterType = ref('all') // all, income, expense, saving

// Filtered transactions
const filteredTransactions = computed(() => {
  let list = [...state.transactions]

  // Filter by type
  if (filterType.value !== 'all') {
    list = list.filter(t => t.type === filterType.value)
  }

  // Filter by search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.amount.toString().includes(q)
    )
  }

  return list
})

// Group by date
const groupedTransactions = computed(() => {
  const groups = {}
  filteredTransactions.value.forEach(t => {
    if (!groups[t.date]) groups[t.date] = []
    groups[t.date].push(t)
  })

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, transactions]) => ({
      date,
      label: formatDateLabel(date),
      transactions,
      total: transactions.reduce((sum, t) => {
        if (t.type === 'income') return sum + t.amount
        return sum - t.amount
      }, 0),
    }))
})

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Edit form state
const editLabel = ref('')
const editAmount = ref('')
const editCategory = ref('')
const editDate = ref('')
const editNote = ref('')

function handleAdd(transaction) {
  addTransaction(transaction)
  showModal.value = false
}

function handleTap(transaction) {
  editingTransaction.value = transaction
  editLabel.value = transaction.label
  editAmount.value = transaction.amount
  editCategory.value = transaction.category
  editDate.value = transaction.date
  editNote.value = transaction.note || ''
}

function handleDelete(id) {
  deleteTransaction(id)
  editingTransaction.value = null
}

function handleCloseEdit() {
  editingTransaction.value = null
}

function handleSaveEdit() {
  if (!editingTransaction.value) return
  const numAmount = parseFloat(editAmount.value)
  if (isNaN(numAmount) || numAmount <= 0) return

  updateTransaction(editingTransaction.value.id, {
    label: editLabel.value,
    amount: numAmount,
    category: editCategory.value,
    date: editDate.value,
    note: editNote.value,
  })
  editingTransaction.value = null
}

function getTypeLabel(type) {
  switch (type) {
    case 'income': return 'Income'
    case 'expense': return 'Expense'
    case 'saving': return 'Savings'
    default: return type
  }
}

function getAmountClass(type) {
  switch (type) {
    case 'income': return 'text-primary'
    case 'expense': return 'text-danger'
    case 'saving': return 'text-blue-400'
    default: return 'text-text-primary'
  }
}

const expenseCategories = ['Food & Drink', 'Subscription', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Other']
const incomeCategories = ['Income', 'Freelance', 'Gift', 'Other']
const savingCategories = ['Savings', 'Vault', 'Emergency Fund', 'Investment']

const editCategories = computed(() => {
  if (!editingTransaction.value) return []
  switch (editingTransaction.value.type) {
    case 'income': return incomeCategories
    case 'saving': return savingCategories
    default: return expenseCategories
  }
})

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'saving', label: 'Savings' },
]
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Header -->
    <div class="px-5 pt-8 pb-2 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Transactions</h1>
        <p class="text-sm text-text-secondary mt-1">{{ state.transactions.length }} transactions</p>
      </div>
      <button
        class="mt-1 p-2 rounded-xl bg-surface border border-border hover:border-primary/30 text-text-secondary hover:text-primary transition-all"
        @click="showExport = true"
        title="Export"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </button>
    </div>

    <!-- Search -->
    <div class="px-5 py-3">
      <div class="relative">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search transactions..."
          class="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
        />
        <button
          v-if="searchQuery"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          @click="searchQuery = ''"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="px-5 pb-3">
      <div class="flex gap-2">
        <button
          v-for="opt in filterOptions"
          :key="opt.value"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
          :class="filterType === opt.value
            ? 'bg-primary/15 text-primary border border-primary/30'
            : 'bg-surface text-text-secondary border border-transparent hover:border-border'"
          @click="filterType = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Grouped Transaction List -->
    <div v-if="groupedTransactions.length > 0" class="px-5 space-y-5 pb-32">
      <div v-for="group in groupedTransactions" :key="group.date">
        <!-- Date header -->
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider">{{ group.label }}</p>
          <p class="text-xs font-medium" :class="group.total >= 0 ? 'text-primary' : 'text-danger'">
            {{ group.total >= 0 ? '+' : '' }}{{ getCurrencySymbol(state.settings.baseCurrency) }}{{ Math.abs(group.total).toFixed(2) }}
          </p>
        </div>
        <!-- Transactions in group -->
        <div class="space-y-2">
          <TransactionItem
            v-for="transaction in group.transactions"
            :key="transaction.id"
            :transaction="transaction"
            @delete="handleDelete"
            @tap="handleTap"
          />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="px-5 py-16 text-center">
      <div class="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      </div>
      <p class="text-text-secondary text-sm">{{ searchQuery ? 'No matching transactions' : 'No transactions yet' }}</p>
      <p class="text-text-secondary/60 text-xs mt-1">{{ searchQuery ? 'Try a different search term' : 'Tap + to add your first transaction' }}</p>
    </div>

    <!-- FAB -->
    <button
      class="fixed bottom-24 right-6 w-14 h-14 bg-primary hover:bg-primary-dim text-white rounded-2xl shadow-lg shadow-primary/25 flex items-center justify-center transition-all duration-200 active:scale-95 z-40"
      @click="showModal = true"
    >
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>

    <!-- Add Modal -->
    <AddTransactionModal
      v-if="showModal"
      @close="showModal = false"
      @add="handleAdd"
    />

    <!-- Export Modal -->
    <ExportModal
      v-if="showExport"
      :initialDataSet="filterType === 'all' ? 'all' : filterType"
      @close="showExport = false"
    />

    <!-- Edit Detail Panel -->
    <Teleport to="body">
      <transition name="fade">
        <div
          v-if="editingTransaction"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          @click="handleCloseEdit"
        />
      </transition>
      <transition name="slide-up">
        <div
          v-if="editingTransaction"
          class="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-3xl p-6 max-w-lg mx-auto max-h-[85vh] overflow-y-auto"
        >
          <div class="w-10 h-1 bg-surface rounded-full mx-auto mb-6" />
          <h2 class="text-lg font-semibold text-text-primary mb-4">Edit Transaction</h2>

          <div class="space-y-4">
            <!-- Label -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Description</label>
              <input
                v-model="editLabel"
                type="text"
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <!-- Amount -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Amount</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">{{ getCurrencySymbol(state.settings.baseCurrency) }}</span>
                <input
                  v-model="editAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full bg-surface border border-border rounded-xl pl-8 pr-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <!-- Category -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Category</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="cat in editCategories"
                  :key="cat"
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                  :class="editCategory === cat
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-surface text-text-secondary border border-border hover:border-text-secondary/30'"
                  @click="editCategory = cat"
                >
                  {{ cat }}
                </button>
              </div>
            </div>

            <!-- Date -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Date</label>
              <input
                v-model="editDate"
                type="date"
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <!-- Note -->
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1.5 block">Note</label>
              <textarea
                v-model="editNote"
                rows="2"
                placeholder="Add a note..."
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            <!-- Type badge (read-only) -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-text-secondary">Type:</span>
              <span
                class="px-2.5 py-1 rounded-lg text-xs font-medium"
                :class="getAmountClass(editingTransaction.type) + ' bg-current/10'"
              >
                {{ getTypeLabel(editingTransaction.type) }}
              </span>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                class="flex-1 bg-primary hover:bg-primary-dim text-white font-semibold py-3 rounded-xl transition-colors duration-200"
                @click="handleSaveEdit"
              >
                Save Changes
              </button>
              <button
                class="px-4 bg-danger/10 hover:bg-danger/20 text-danger font-semibold py-3 rounded-xl transition-colors duration-200"
                @click="handleDelete(editingTransaction.id)"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>