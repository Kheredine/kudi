<script setup>
import { computed } from 'vue'
import { useFinance } from '../composables/useFinance'

const props = defineProps({
  period: { type: String, default: 'monthly' }
})

const { getSpendingReport, getCurrencySymbol, state } = useFinance()
const report = computed(() => getSpendingReport(props.period))
const sym = () => getCurrencySymbol(state.settings.baseCurrency)

const maxDaily = computed(() => {
  if (!report.value.daily.length) return 1
  return Math.max(...report.value.daily.map(d => d.amount), 1)
})

const COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']
</script>

<template>
  <div class="report-card">
    <!-- Summary -->
    <div class="report-summary">
      <div class="summary-item">
        <span class="summary-label">Income</span>
        <span class="summary-value text-green-400">{{ sym() }}{{ report.totalIncome.toFixed(0) }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Expenses</span>
        <span class="summary-value text-red-400">{{ sym() }}{{ report.totalExpense.toFixed(0) }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Net</span>
        <span class="summary-value" :class="report.net >= 0 ? 'text-green-400' : 'text-red-400'">
          {{ report.net >= 0 ? '+' : '' }}{{ sym() }}{{ report.net.toFixed(0) }}
        </span>
      </div>
    </div>

    <!-- Category Breakdown -->
    <div v-if="report.byCategory.length > 0" class="category-section">
      <p class="section-title">By Category</p>
      <div class="category-list">
        <div v-for="(cat, i) in report.byCategory.slice(0, 5)" :key="cat.category" class="category-row">
          <span class="cat-icon">{{ cat.icon }}</span>
          <div class="cat-bar-wrap">
            <div class="cat-bar" :style="{ width: cat.pct + '%', background: COLORS[i % COLORS.length] }" />
          </div>
          <span class="cat-pct">{{ cat.pct }}%</span>
          <span class="cat-amount">{{ sym() }}{{ cat.total.toFixed(0) }}</span>
        </div>
      </div>
    </div>

    <!-- Daily Chart -->
    <div v-if="report.daily.length > 0" class="daily-section">
      <p class="section-title">Daily Spending</p>
      <div class="daily-chart">
        <div v-for="day in report.daily" :key="day.date" class="daily-bar-wrap">
          <div
            class="daily-bar"
            :style="{ height: Math.max(4, (day.amount / maxDaily) * 80) + 'px', background: day.amount > maxDaily * 0.8 ? '#EF4444' : '#22C55E' }"
          />
          <span class="daily-label">{{ day.date.slice(8) }}</span>
        </div>
      </div>
    </div>

    <div v-if="report.transactionCount === 0" class="empty">
      <p class="empty-text">No transactions this {{ period }}</p>
    </div>
  </div>
</template>

<style scoped>
.report-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1rem;
}
.report-summary {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.summary-item {
  flex: 1;
  text-align: center;
}
.summary-label {
  display: block;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748B;
  margin-bottom: 0.25rem;
}
.summary-value {
  font-size: 0.875rem;
  font-weight: 700;
}
.section-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748B;
  margin-bottom: 0.5rem;
}
.category-section { margin-bottom: 1rem; }
.category-list { display: flex; flex-direction: column; gap: 0.5rem; }
.category-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.cat-icon { font-size: 0.875rem; width: 1.25rem; text-align: center; }
.cat-bar-wrap {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 3px;
  overflow: hidden;
}
.cat-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.cat-pct {
  font-size: 0.6875rem;
  color: #94A3B8;
  width: 2rem;
  text-align: right;
}
.cat-amount {
  font-size: 0.6875rem;
  color: #CBD5E1;
  font-weight: 500;
  width: 3.5rem;
  text-align: right;
}
.daily-section { margin-top: 0.75rem; }
.daily-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 96px;
  padding-top: 0.5rem;
}
.daily-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.daily-bar {
  width: 100%;
  border-radius: 2px 2px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
}
.daily-label {
  font-size: 0.5rem;
  color: #475569;
}
.empty { padding: 1.5rem 0; text-align: center; }
.empty-text { font-size: 0.75rem; color: #64748B; }
</style>