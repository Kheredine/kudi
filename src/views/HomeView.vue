<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFinance } from '../composables/useFinance'
import { useAIInsights } from '../composables/useAIInsights'
import { usePrivacy } from '../composables/usePrivacy'
import BalanceCard from '../components/BalanceCard.vue'
import InsightCard from '../components/InsightCard.vue'
import ForecastChart from '../components/ForecastChart.vue'
import CurrencyConverter from '../components/CurrencyConverter.vue'
import BudgetCard from '../components/BudgetCard.vue'
import SavingsGoalCard from '../components/SavingsGoalCard.vue'
import SpendingChart from '../components/SpendingChart.vue'
import CanIAffordWidget from '../components/CanIAffordWidget.vue'
import AchievementsCard from '../components/AchievementsCard.vue'
import PrivacyOverlay from '../components/PrivacyOverlay.vue'

const {
  state, balance, totalIncome, totalExpenses, totalSavings,
  daysUntilPayday, insights, forecast, lowestBalancePoint, avgDailySpend,
  budgetStatus, savingsGoalStatus, upcomingBills, autoGenerateRecurring,
  processShiftPayments, getCurrencySymbol
} = useFinance()

const { aiInsights, aiLoading, fetchInsights } = useAIInsights()
const { isUnlocked } = usePrivacy()

const showConverter = ref(false)
const reportPeriod = ref('monthly')

// Use AI insights if available, fallback to local
const displayInsights = computed(() => {
  if (aiInsights.value && aiInsights.value.length > 0) {
    return aiInsights.value.slice(0, 2)
  }
  return insights.value.slice(0, 2)
})

onMounted(() => {
  fetchInsights()
  autoGenerateRecurring()
  processShiftPayments()
})

function fmt(n) {
  const num = Number(n)
  if (isNaN(num) || !isFinite(num)) return `${getCurrencySymbol(state.settings.baseCurrency)}0.00`
  return `${getCurrencySymbol(state.settings.baseCurrency)}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Balance -->
    <BalanceCard />

    <!-- Summary Cards — horizontal scroll on mobile, grid on desktop -->
    <PrivacyOverlay class="px-5 lg:px-8 mb-6 lg:mb-8">
      <div class="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible lg:gap-4">
        <!-- Income -->
        <div class="min-w-[140px] snap-start bg-card border border-border rounded-2xl p-4 md:min-w-0 hover:border-primary/20 transition-colors duration-200">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <span class="text-[10px] text-text-secondary font-medium">Income</span>
          </div>
          <p class="text-xl font-bold text-primary">{{ fmt(totalIncome) }}</p>
        </div>

        <!-- Expenses -->
        <div class="min-w-[140px] snap-start bg-card border border-border rounded-2xl p-4 md:min-w-0 hover:border-danger/20 transition-colors duration-200">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </div>
            <span class="text-[10px] text-text-secondary font-medium">Expenses</span>
          </div>
          <p class="text-xl font-bold text-danger">{{ fmt(totalExpenses) }}</p>
          <p class="text-[9px] text-text-secondary mt-0.5">{{ fmt(avgDailySpend) }}/day</p>
        </div>

        <!-- Savings -->
        <div class="min-w-[140px] snap-start bg-card border border-border rounded-2xl p-4 md:min-w-0 hover:border-blue-400/20 transition-colors duration-200">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span class="text-[10px] text-text-secondary font-medium">Savings</span>
          </div>
          <p class="text-xl font-bold text-blue-400">{{ fmt(totalSavings) }}</p>
        </div>
      </div>
    </PrivacyOverlay>

    <!-- Forecast Chart — compact on mobile -->
    <PrivacyOverlay class="px-5 lg:px-8 mb-6 lg:mb-8">
      <div class="bg-card border border-border rounded-2xl p-4 lg:p-6">
        <h3 class="text-sm font-semibold text-text-primary mb-3">Balance Forecast</h3>
        <ForecastChart :days="30" />
      </div>
    </PrivacyOverlay>

    <!-- Insights — max 2, AI-powered with fallback -->
    <div class="px-5 lg:hidden mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Insights</h3>
        <span v-if="aiLoading" class="text-[10px] text-primary animate-pulse">Analyzing...</span>
        <span v-else-if="aiInsights?.length" class="text-[10px] text-primary/60">✨ AI</span>
      </div>
      <div class="space-y-2">
        <InsightCard
          v-for="(insight, i) in displayInsights"
          :key="i"
          :type="insight.type"
          :icon="insight.icon"
          :text="insight.text"
        />
      </div>
    </div>

    <!-- Currency Converter — collapsible on mobile -->
    <div class="px-5 lg:hidden mb-6">
      <button
        class="w-full flex items-center justify-between bg-card border border-border rounded-2xl p-4 active:scale-[0.99] transition-transform"
        @click="showConverter = !showConverter"
      >
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-sm font-medium text-text-primary">Currency Converter</span>
        </div>
        <svg class="w-4 h-4 text-text-secondary transition-transform duration-200" :class="showConverter ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <transition name="expand">
        <div v-if="showConverter" class="bg-card border border-t-0 border-border rounded-b-2xl px-4 pb-4 -mt-1 pt-3">
          <CurrencyConverter />
        </div>
      </transition>
    </div>

    <!-- Can I Afford This? -->
    <div class="px-5 lg:px-8 mb-6">
      <CanIAffordWidget />
    </div>

    <!-- Achievements & Streak -->
    <div v-if="state.transactions.length > 0" class="px-5 lg:px-8 mb-6">
      <AchievementsCard />
    </div>

    <!-- Upcoming Bills -->
    <PrivacyOverlay v-if="upcomingBills.length > 0" class="px-5 lg:px-8 mb-6">
      <h3 class="text-sm font-semibold text-text-secondary mb-3">Upcoming Bills</h3>
      <div class="space-y-2">
        <div
          v-for="bill in upcomingBills"
          :key="bill.label + bill.date"
          class="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
          :class="{ 'border-red-500/30 bg-red-500/5': bill.isUrgent }"
        >
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
               :class="bill.isUrgent ? 'bg-red-500/10' : 'bg-amber-400/10'">
            <span class="text-base">{{ bill.isUrgent ? '🔴' : '🟡' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ bill.label }}</p>
            <p class="text-xs text-text-secondary">{{ bill.date }} · {{ bill.daysAway === 0 ? 'Today' : bill.daysAway === 1 ? 'Tomorrow' : `In ${bill.daysAway} days` }}</p>
          </div>
          <p class="text-sm font-semibold text-danger shrink-0">-{{ getCurrencySymbol(state.settings.baseCurrency) }}{{ bill.amount.toFixed(0) }}</p>
        </div>
      </div>
    </PrivacyOverlay>

    <!-- Budgets -->
    <PrivacyOverlay v-if="budgetStatus.length > 0" class="px-5 lg:px-8 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Budgets</h3>
        <span class="text-[10px] text-text-secondary">{{ budgetStatus.filter(b => b.overBudget).length }} over</span>
      </div>
      <div class="space-y-2">
        <BudgetCard v-for="b in budgetStatus" :key="b.id" :budget="b" />
      </div>
    </PrivacyOverlay>

    <!-- Savings Goals -->
    <PrivacyOverlay v-if="savingsGoalStatus.length > 0" class="px-5 lg:px-8 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Savings Goals</h3>
        <span class="text-[10px] text-text-secondary">{{ savingsGoalStatus.filter(g => g.completed).length }}/{{ savingsGoalStatus.length }} done</span>
      </div>
      <div class="space-y-2">
        <SavingsGoalCard v-for="g in savingsGoalStatus" :key="g.id" :goal="g" />
      </div>
    </PrivacyOverlay>

    <!-- Spending Report -->
    <PrivacyOverlay v-if="state.transactions.length > 0" class="px-5 lg:px-8 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-secondary">Spending Report</h3>
        <div class="flex gap-1 bg-surface rounded-lg p-0.5">
          <button
            class="text-[10px] px-2 py-1 rounded-md font-medium transition-colors"
            :class="reportPeriod === 'weekly' ? 'bg-card text-text-primary shadow-sm' : 'text-text-secondary'"
            @click="reportPeriod = 'weekly'"
          >Weekly</button>
          <button
            class="text-[10px] px-2 py-1 rounded-md font-medium transition-colors"
            :class="reportPeriod === 'monthly' ? 'bg-card text-text-primary shadow-sm' : 'text-text-secondary'"
            @click="reportPeriod = 'monthly'"
          >Monthly</button>
        </div>
      </div>
      <SpendingChart :period="reportPeriod" />
    </PrivacyOverlay>

    <!-- Empty state -->
    <div v-if="state.transactions.length === 0 && state.shifts.length === 0" class="px-5 pb-8">
      <div class="bg-card border border-border rounded-2xl p-8 text-center">
        <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h4 class="text-base font-semibold text-text-primary mb-2">Welcome to Kudi</h4>
        <p class="text-sm text-text-secondary mb-4">Tap <span class="text-primary font-bold">+</span> to add your first expense or shift</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

.expand-enter-active, .expand-leave-active {
  transition: all 200ms ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 400px;
}
</style>