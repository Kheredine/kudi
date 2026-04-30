<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../composables/useFinance'

const { iouSummary, addIOU, updateIOU, deleteIOU, getCurrencySymbol, state } = useFinance()

const sym = computed(() => getCurrencySymbol(state.settings.baseCurrency))

const showModal = ref(false)
const editingId = ref(null)
const confirmDeleteId = ref(null)

const form = ref({
  person: '',
  amount: '',
  dateLent: new Date().toISOString().split('T')[0],
  dueDate: '',
  interestRate: '',
  notes: '',
})

const formErrors = ref([])

const totalOwed = computed(() =>
  iouSummary.value.filter((i) => !i.paid).reduce((s, i) => s + i.totalDue, 0)
)
const overdueCount = computed(() => iouSummary.value.filter((i) => i.isOverdue).length)

function openAdd() {
  editingId.value = null
  form.value = {
    person: '',
    amount: '',
    dateLent: new Date().toISOString().split('T')[0],
    dueDate: '',
    interestRate: '',
    notes: '',
  }
  formErrors.value = []
  showModal.value = true
}

function openEdit(iou) {
  editingId.value = iou.id
  form.value = {
    person: iou.person,
    amount: String(iou.amount),
    dateLent: iou.dateLent,
    dueDate: iou.dueDate || '',
    interestRate: iou.interestRate > 0 ? String(iou.interestRate) : '',
    notes: iou.notes || '',
  }
  formErrors.value = []
  showModal.value = true
}

function save() {
  const data = {
    person: form.value.person,
    amount: Number(form.value.amount),
    dateLent: form.value.dateLent,
    dueDate: form.value.dueDate || null,
    interestRate: Number(form.value.interestRate || 0),
    notes: form.value.notes,
  }

  if (editingId.value) {
    updateIOU(editingId.value, data)
    showModal.value = false
  } else {
    const result = addIOU(data)
    if (result.success) {
      showModal.value = false
    } else {
      formErrors.value = result.errors
    }
  }
}

function togglePaid(id, current) {
  updateIOU(id, { paid: !current })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmt(n) {
  return `${sym.value}${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  <div class="max-w-lg mx-auto pb-24">
    <!-- Header -->
    <div class="px-5 pt-8 pb-4 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Money Owed</h1>
        <p class="text-sm text-text-secondary mt-1">People who owe you money</p>
      </div>
      <button
        @click="openAdd"
        class="mt-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add
      </button>
    </div>

    <!-- Summary -->
    <div v-if="iouSummary.length > 0" class="px-5 mb-5 flex gap-3">
      <div class="flex-1 bg-card border border-border rounded-2xl p-4">
        <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total Owed to You</p>
        <p class="text-xl font-bold text-primary">{{ fmt(totalOwed) }}</p>
      </div>
      <div v-if="overdueCount > 0" class="flex-1 bg-danger/5 border border-danger/20 rounded-2xl p-4">
        <p class="text-[10px] text-danger uppercase tracking-wider mb-1">Overdue</p>
        <p class="text-xl font-bold text-danger">{{ overdueCount }} debt{{ overdueCount > 1 ? 's' : '' }}</p>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="iouSummary.length === 0" class="px-5 py-16 text-center">
      <div class="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 8.25H9m6 3H9m3 6-3-3h1.5a3 3 0 100-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-text-secondary text-sm">No debts tracked yet</p>
      <button @click="openAdd" class="mt-3 text-primary text-sm font-medium hover:underline">Add someone who owes you</button>
    </div>

    <!-- List -->
    <div class="px-5 space-y-3">
      <div
        v-for="iou in iouSummary"
        :key="iou.id"
        class="bg-card border rounded-2xl p-4 transition-all"
        :class="iou.isOverdue ? 'border-danger/30' : 'border-border'"
      >
        <!-- Top row -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold"
              :class="iou.paid ? 'bg-primary/10 text-primary' : iou.isOverdue ? 'bg-danger/10 text-danger' : 'bg-surface text-text-primary'"
            >
              {{ iou.person.charAt(0).toUpperCase() }}
            </div>
            <div>
              <p class="font-semibold text-text-primary" :class="{ 'line-through opacity-50': iou.paid }">{{ iou.person }}</p>
              <p class="text-xs text-text-secondary">Lent {{ formatDate(iou.dateLent) }}</p>
            </div>
          </div>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="dueBadge(iou).cls">
            {{ dueBadge(iou).label }}
          </span>
        </div>

        <!-- Amounts -->
        <div class="flex gap-3 mb-3">
          <div class="flex-1 bg-surface rounded-xl p-3">
            <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Principal</p>
            <p class="text-sm font-semibold text-text-primary">{{ fmt(iou.amount) }}</p>
          </div>
          <div v-if="iou.interestRate > 0" class="flex-1 bg-surface rounded-xl p-3">
            <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Interest ({{ iou.interestRate }}% p.a.)</p>
            <p class="text-sm font-semibold text-warning">+{{ fmt(iou.interest) }}</p>
          </div>
          <div class="flex-1 bg-primary/5 border border-primary/10 rounded-xl p-3">
            <p class="text-[10px] text-primary uppercase tracking-wider mb-0.5">Total Due</p>
            <p class="text-sm font-bold text-primary">{{ fmt(iou.totalDue) }}</p>
          </div>
        </div>

        <!-- Notes -->
        <p v-if="iou.notes" class="text-xs text-text-secondary mb-3 italic">{{ iou.notes }}</p>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            @click="togglePaid(iou.id, iou.paid)"
            class="flex-1 text-xs py-2 rounded-xl font-medium border transition-colors"
            :class="iou.paid
              ? 'border-border text-text-secondary hover:border-primary/30 hover:text-primary'
              : 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10'"
          >
            {{ iou.paid ? 'Mark Unpaid' : 'Mark Paid' }}
          </button>
          <button
            @click="openEdit(iou)"
            class="px-3 py-2 rounded-xl text-xs text-text-secondary border border-border hover:border-primary/30 hover:text-primary transition-colors"
          >
            Edit
          </button>
          <button
            @click="confirmDeleteId = iou.id"
            class="px-3 py-2 rounded-xl text-xs text-text-secondary border border-border hover:border-danger/30 hover:text-danger transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" @click.self="showModal = false">
        <div class="bg-card rounded-3xl w-full max-w-md p-6 shadow-2xl">
          <h2 class="text-lg font-bold text-text-primary mb-5">{{ editingId ? 'Edit Debt' : 'Add Debt' }}</h2>

          <div v-if="formErrors.length" class="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger">
            {{ formErrors.join(', ') }}
          </div>

          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary font-medium mb-1.5 block">Person's Name</label>
              <input
                v-model="form.person"
                type="text"
                placeholder="e.g. John"
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-text-secondary font-medium mb-1.5 block">Amount ({{ sym }})</label>
                <input
                  v-model="form.amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label class="text-xs text-text-secondary font-medium mb-1.5 block">Interest Rate (% / year)</label>
                <input
                  v-model="form.interestRate"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0 = none"
                  class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-text-secondary font-medium mb-1.5 block">Date Lent</label>
                <input
                  v-model="form.dateLent"
                  type="date"
                  class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label class="text-xs text-text-secondary font-medium mb-1.5 block">Expected Repayment</label>
                <input
                  v-model="form.dueDate"
                  type="date"
                  class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div>
              <label class="text-xs text-text-secondary font-medium mb-1.5 block">Notes (optional)</label>
              <input
                v-model="form.notes"
                type="text"
                placeholder="e.g. borrowed for rent"
                class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button @click="showModal = false" class="flex-1 py-3 rounded-xl border border-border text-sm text-text-secondary hover:border-primary/30 transition-colors">Cancel</button>
            <button @click="save" class="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
              {{ editingId ? 'Save Changes' : 'Add Debt' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete confirm -->
      <div v-if="confirmDeleteId" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="confirmDeleteId = null">
        <div class="bg-card rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
          <p class="text-text-primary font-semibold mb-2">Delete this debt?</p>
          <p class="text-text-secondary text-sm mb-6">This action cannot be undone.</p>
          <div class="flex gap-3">
            <button @click="confirmDeleteId = null" class="flex-1 py-3 rounded-xl border border-border text-sm text-text-secondary">Cancel</button>
            <button @click="() => { deleteIOU(confirmDeleteId); confirmDeleteId = null }" class="flex-1 py-3 rounded-xl bg-danger text-white text-sm font-semibold">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
