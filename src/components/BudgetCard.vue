<script setup>
import { useFinance } from '../composables/useFinance'

const props = defineProps({
  budget: { type: Object, required: true }
})

const { getCurrencySymbol, state } = useFinance()
const sym = () => getCurrencySymbol(state.settings.baseCurrency)

function barColor(pct) {
  if (pct >= 100) return '#EF4444'
  if (pct >= 75) return '#F59E0B'
  return '#22C55E'
}
</script>

<template>
  <div class="budget-card" :class="{ over: budget.overBudget }">
    <div class="budget-header">
      <div class="budget-icon">{{ budget.icon }}</div>
      <div class="budget-info">
        <p class="budget-cat">{{ budget.category }}</p>
        <p class="budget-detail">
          <span class="spent" :style="{ color: barColor(budget.pct) }">{{ sym() }}{{ budget.spent.toFixed(0) }}</span>
          <span class="separator">/</span>
          <span class="limit">{{ sym() }}{{ budget.limit.toFixed(0) }}</span>
        </p>
      </div>
      <div class="budget-pct" :style="{ color: barColor(budget.pct) }">
        {{ budget.pct }}%
      </div>
    </div>
    <div class="budget-bar-track">
      <div
        class="budget-bar-fill"
        :style="{ width: Math.min(100, budget.pct) + '%', background: barColor(budget.pct) }"
      />
    </div>
    <p v-if="budget.overBudget" class="budget-warning">
      ⚠️ Over by {{ sym() }}{{ (budget.spent - budget.limit).toFixed(0) }}
    </p>
    <p v-else class="budget-remaining">
      {{ sym() }}{{ budget.remaining.toFixed(0) }} remaining
    </p>
  </div>
</template>

<style scoped>
.budget-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 0.875rem 1rem;
  transition: all 0.15s;
}
.budget-card.over {
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.04);
}
.budget-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.625rem;
}
.budget-icon {
  font-size: 1.25rem;
  width: 2rem;
  text-align: center;
}
.budget-info {
  flex: 1;
  min-width: 0;
}
.budget-cat {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #F8FAFC;
}
.budget-detail {
  font-size: 0.75rem;
  margin-top: 0.125rem;
}
.spent { font-weight: 600; }
.separator { color: #475569; margin: 0 0.25rem; }
.limit { color: #64748B; }
.budget-pct {
  font-size: 0.875rem;
  font-weight: 700;
}
.budget-bar-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
}
.budget-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.budget-warning {
  font-size: 0.6875rem;
  color: #EF4444;
  margin-top: 0.375rem;
}
.budget-remaining {
  font-size: 0.6875rem;
  color: #64748B;
  margin-top: 0.375rem;
}
</style>