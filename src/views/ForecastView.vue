<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../composables/useFinance'
import ExportModal from '../components/ExportModal.vue'

const { forecast, lowestBalancePoint, currentBalance, getCurrencySymbol, state, paydayGroups, setPaydayOverride } = useFinance()
const showExport = ref(false)
const sym = () => getCurrencySymbol(state.settings.baseCurrency)

const editingPayday = ref(null)
const editingPaydayDate = ref('')

function formatPayDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(/(\w+) (\d+)/, `$1 ${day}${suffix},`)
}

function openEditPayday(group) {
  editingPayday.value = group.defaultPayDate
  editingPaydayDate.value = group.payDate
}

function savePaydayDate() {
  if (editingPayday.value && editingPaydayDate.value) {
    setPaydayOverride(editingPayday.value, editingPaydayDate.value)
  }
  editingPayday.value = null
}

function resetPaydayDate(defaultDate) {
  setPaydayOverride(defaultDate, null)
  editingPayday.value = null
}

const upcomingPaydays = computed(() => paydayGroups.value.filter((g) => !g.isPast))
const pastPaydays = computed(() => paydayGroups.value.filter((g) => g.isPast))
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Header -->
    <div class="px-5 pt-8 pb-2 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Forecast</h1>
        <p class="text-sm text-text-secondary mt-1">
          Current balance:
          <span class="font-semibold" :class="currentBalance >= 0 ? 'text-primary' : 'text-danger'">
            {{ sym() }}{{ currentBalance.toFixed(2) }}
          </span>
        </p>
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

    <!-- Payday Predictions -->
    <div v-if="upcomingPaydays.length > 0" class="px-5 mb-6">
      <h2 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Upcoming Paychecks</h2>
      <div class="space-y-3">
        <div
          v-for="group in upcomingPaydays"
          :key="group.defaultPayDate"
          class="bg-primary/5 border border-primary/15 rounded-2xl p-4"
        >
          <div v-if="editingPayday !== group.defaultPayDate">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs text-text-secondary mb-0.5">You will receive</p>
                <p class="text-2xl font-bold text-primary">{{ sym() }}{{ group.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</p>
                <p class="text-sm text-text-secondary mt-1">
                  on <span class="font-semibold text-text-primary">{{ formatPayDate(group.payDate) }}</span>
                </p>
                <p class="text-xs text-text-secondary mt-1">{{ group.shiftCount }} shift{{ group.shiftCount !== 1 ? 's' : '' }} · {{ group.totalHours }}h total</p>
              </div>
              <button
                @click="openEditPayday(group)"
                class="p-2 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                title="Edit payment date"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
              </button>
            </div>
            <div v-if="group.payDate !== group.defaultPayDate" class="mt-2 text-[10px] text-text-secondary">
              Default date: {{ group.defaultPayDate }}
              <button @click="resetPaydayDate(group.defaultPayDate)" class="ml-1 text-primary hover:underline">Reset</button>
            </div>
          </div>

          <!-- Edit date inline -->
          <div v-else class="space-y-3">
            <p class="text-sm font-medium text-text-primary">Edit payment date</p>
            <input
              v-model="editingPaydayDate"
              type="date"
              class="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50"
            />
            <div class="flex gap-2">
              <button @click="editingPayday = null" class="flex-1 py-2 rounded-xl border border-border text-sm text-text-secondary">Cancel</button>
              <button @click="savePaydayDate" class="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Past paydays -->
      <div v-if="pastPaydays.length > 0" class="mt-3">
        <p class="text-xs text-text-secondary mb-2">Past pay periods</p>
        <div class="space-y-2">
          <div
            v-for="group in pastPaydays"
            :key="group.defaultPayDate"
            class="flex items-center justify-between px-4 py-2.5 bg-surface rounded-xl opacity-60"
          >
            <span class="text-sm text-text-secondary">{{ formatPayDate(group.payDate) }}</span>
            <span class="text-sm font-medium text-text-primary">{{ sym() }}{{ group.totalIncome.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- No shifts hint -->
    <div v-else-if="paydayGroups.length === 0" class="px-5 mb-5">
      <div class="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3">
        <svg class="w-8 h-8 text-text-secondary/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-text-primary">No shifts logged yet</p>
          <p class="text-xs text-text-secondary mt-0.5">Add shifts in your profile to see payday predictions here.</p>
        </div>
      </div>
    </div>

    <!-- Lowest Balance Warning -->
    <div v-if="lowestBalancePoint && lowestBalancePoint.balance < currentBalance" class="px-5 py-3">
      <div class="bg-danger/5 border border-danger/20 rounded-2xl px-4 py-3">
        <div class="flex items-center gap-2 mb-1">
          <svg class="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span class="text-xs font-semibold text-danger">Lowest Balance</span>
        </div>
        <p class="text-sm text-text-primary font-medium">{{ sym() }}{{ lowestBalancePoint.balance.toFixed(2) }}</p>
        <p class="text-xs text-text-secondary mt-0.5">{{ lowestBalancePoint.date }}</p>
      </div>
    </div>

    <!-- Timeline -->
    <div class="px-5 pb-24">
      <h2 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">30-Day Timeline</h2>
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
          <div class="w-16 shrink-0">
            <p class="text-xs text-text-secondary">{{ item.date.slice(5) }}</p>
          </div>
          <div
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :class="item.type === 'income' ? 'bg-primary' : item.type === 'saving' ? 'bg-blue-400' : 'bg-danger'"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm text-text-primary truncate">
              {{ item.label }}
              <span v-if="item.isRecurring" class="text-[10px] text-text-secondary ml-1">↻</span>
              <span v-if="item.isShift" class="text-[10px] text-primary ml-1">shift</span>
            </p>
          </div>
          <p
            class="text-sm font-medium shrink-0 w-20 text-right"
            :class="item.amount > 0 ? 'text-primary' : item.type === 'saving' ? 'text-blue-400' : 'text-danger'"
          >
            {{ item.amount > 0 ? '+' : '' }}{{ sym() }}{{ Math.abs(item.amount).toFixed(2) }}
          </p>
          <p
            class="text-xs font-medium shrink-0 w-20 text-right"
            :class="item.runningBalance < 0 ? 'text-danger' : 'text-text-secondary'"
          >
            {{ sym() }}{{ item.runningBalance.toFixed(2) }}
          </p>
        </div>
      </div>
    </div>

    <ExportModal
      v-if="showExport"
      initialDataSet="forecast"
      @close="showExport = false"
    />
  </div>
</template>
