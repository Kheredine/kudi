<script setup>
import { ref } from 'vue'
import { useFinance } from '../composables/useFinance'
import ExportModal from '../components/ExportModal.vue'

const { forecast, lowestBalancePoint, currentBalance, getCurrencySymbol, state } = useFinance()
const showExport = ref(false)
const sym = () => getCurrencySymbol(state.settings.baseCurrency)
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Header -->
    <div class="px-5 pt-8 pb-2 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">30-Day Forecast</h1>
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
    <div class="px-5 pb-8">
      <div v-if="forecast.length === 0" class="py-16 text-center">
        <p class="text-text-secondary text-sm">No upcoming events</p>
      </div>

      <div v-else class="space-y-1">
        <div
          v-for="(item, idx) in forecast"
          :key="idx"
          class="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors"
          :class="item.runningBalance < 0 ? 'bg-danger/5' : idx % 2 === 0 ? '' : ''"
        >
          <!-- Date -->
          <div class="w-16 shrink-0">
            <p class="text-xs text-text-secondary">{{ item.date.slice(5) }}</p>
          </div>

          <!-- Dot -->
          <div
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :class="item.type === 'income' ? 'bg-primary' : item.type === 'saving' ? 'bg-blue-400' : 'bg-danger'"
          />
          <!-- Label -->
          <div class="flex-1 min-w-0">
            <p class="text-sm text-text-primary truncate">
              {{ item.label }}
              <span v-if="item.isRecurring" class="text-[10px] text-text-secondary ml-1">↻</span>
              <span v-if="item.isShift" class="text-[10px] text-primary ml-1">shift</span>
            </p>
          </div>

          <!-- Amount -->
          <p
            class="text-sm font-medium shrink-0 w-20 text-right"
            :class="item.amount > 0 ? 'text-primary' : item.type === 'saving' ? 'text-blue-400' : 'text-danger'"
          >
            {{ item.amount > 0 ? '+' : '' }}{{ sym() }}{{ Math.abs(item.amount).toFixed(2) }}
          </p>

          <!-- Running Balance -->
          <p
            class="text-xs font-medium shrink-0 w-20 text-right"
            :class="item.runningBalance < 0 ? 'text-danger' : 'text-text-secondary'"
          >
            {{ sym() }}{{ item.runningBalance.toFixed(2) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <ExportModal
      v-if="showExport"
      initialDataSet="forecast"
      @close="showExport = false"
    />
  </div>
</template>
