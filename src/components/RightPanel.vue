<script setup>
import { useFinance } from '../composables/useFinance'
import CurrencyConverter from './CurrencyConverter.vue'
import InsightCard from './InsightCard.vue'
import RecurringItem from './RecurringItem.vue'

const { state, insights, forecast, toggleRecurring } = useFinance()

const upcomingRecurring = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return state.recurring
    .filter(r => r.active)
    .slice(0, 3)
})

import { computed } from 'vue'

const alerts = computed(() => {
  const list = []
  if (forecast.value.length > 0) {
    const negatives = forecast.value.filter(f => f.runningBalance < 0)
    if (negatives.length > 0) {
      list.push({ type: 'danger', text: `Balance may go negative on ${negatives[0].date}` })
    }
  }
  return list
})
</script>

<template>
  <div class="hidden lg:flex flex-col w-80 h-screen fixed right-0 top-0 bg-card border-l border-border overflow-y-auto">
    <!-- Header -->
    <div class="px-5 pt-8 pb-4">
      <h3 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Dashboard</h3>
    </div>

    <!-- Quick Actions -->
    <div class="px-4 mb-4">
      <div class="grid grid-cols-3 gap-2">
        <router-link to="/transactions" class="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-surface hover:bg-primary/10 hover:text-primary transition-all duration-200 group">
          <svg class="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span class="text-[10px] font-medium text-text-secondary group-hover:text-primary">Expense</span>
        </router-link>
        <router-link to="/settings" class="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-surface hover:bg-primary/10 hover:text-primary transition-all duration-200 group">
          <svg class="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-[10px] font-medium text-text-secondary group-hover:text-primary">Shift</span>
        </router-link>
        <router-link to="/chat" class="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-surface hover:bg-primary/10 hover:text-primary transition-all duration-200 group">
          <svg class="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <span class="text-[10px] font-medium text-text-secondary group-hover:text-primary">Ask Kudi</span>
        </router-link>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="alerts.length > 0" class="px-4 mb-4">
      <div v-for="(alert, i) in alerts" :key="i" class="bg-danger/5 border border-danger/20 rounded-xl px-4 py-3 mb-2">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p class="text-xs text-danger font-medium">{{ alert.text }}</p>
        </div>
      </div>
    </div>

    <!-- Insights -->
    <div class="px-4 mb-4">
      <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Insights</h4>
      <div class="space-y-2">
        <InsightCard
          v-for="(insight, i) in insights.slice(0, 3)"
          :key="i"
          :type="insight.type"
          :icon="insight.icon"
          :text="insight.text"
        />
      </div>
    </div>

    <!-- Recurring Preview -->
    <div class="px-4 mb-4">
      <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Upcoming Recurring</h4>
      <div class="space-y-2">
        <RecurringItem
          v-for="item in upcomingRecurring"
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
      <router-link to="/settings" class="block text-xs text-text-secondary hover:text-primary transition-colors mt-2 text-center">
        View all →
      </router-link>
    </div>

    <!-- Currency Converter -->
    <div class="px-4 mb-8">
      <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Converter</h4>
      <CurrencyConverter />
    </div>
  </div>
</template>