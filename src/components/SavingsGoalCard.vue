<script setup>
import { ref } from 'vue'
import { useFinance } from '../composables/useFinance'

const props = defineProps({
  goal: { type: Object, required: true }
})

const { getCurrencySymbol, state, contributeToGoal } = useFinance()
const sym = () => getCurrencySymbol(state.settings.baseCurrency)
const showContribute = ref(false)
const contributeAmount = ref('')

function handleContribute() {
  const amt = parseFloat(contributeAmount.value)
  if (amt > 0) {
    contributeToGoal(props.goal.id, amt)
    contributeAmount.value = ''
    showContribute.value = false
  }
}

function circumference(pct) {
  const r = 28
  const c = 2 * Math.PI * r
  return c
}

function dashOffset(pct) {
  const r = 28
  const c = 2 * Math.PI * r
  return c - (c * pct / 100)
}
</script>

<template>
  <div class="goal-card" :class="{ completed: goal.completed }">
    <div class="goal-top">
      <div class="goal-ring">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4" />
          <circle
            cx="32" cy="32" r="28" fill="none"
            :stroke="goal.completed ? '#22C55E' : '#3B82F6'"
            stroke-width="4"
            stroke-linecap="round"
            :stroke-dasharray="circumference(goal.pct)"
            :stroke-dashoffset="dashOffset(goal.pct)"
            transform="rotate(-90 32 32)"
            style="transition: stroke-dashoffset 0.5s ease"
          />
        </svg>
        <div class="goal-ring-inner">
          <span class="goal-icon">{{ goal.icon }}</span>
        </div>
      </div>
      <div class="goal-info">
        <p class="goal-name">{{ goal.name }}</p>
        <p class="goal-amounts">
          <span class="goal-saved" :class="{ 'text-green-400': goal.completed }">{{ sym() }}{{ goal.saved.toFixed(0) }}</span>
          <span class="goal-sep">/</span>
          <span class="goal-target">{{ sym() }}{{ goal.target.toFixed(0) }}</span>
        </p>
        <div class="goal-meta">
          <span v-if="goal.daysLeft !== null" class="goal-days">{{ goal.daysLeft }}d left</span>
          <span v-if="goal.monthlyNeeded" class="goal-monthly">~{{ sym() }}{{ goal.monthlyNeeded }}/mo</span>
          <span v-if="goal.completed" class="goal-done">✓ Done!</span>
        </div>
      </div>
    </div>

    <!-- Contribute -->
    <div v-if="!goal.completed" class="goal-actions">
      <div v-if="showContribute" class="contribute-form">
        <input
          v-model="contributeAmount"
          type="number"
          min="0"
          step="1"
          :placeholder="sym() + '0'"
          class="contribute-input"
          @keyup.enter="handleContribute"
        />
        <button class="contribute-btn" @click="handleContribute">Add</button>
        <button class="cancel-btn" @click="showContribute = false">✕</button>
      </div>
      <button v-else class="add-btn" @click="showContribute = true">
        + Add funds
      </button>
    </div>
  </div>
</template>

<style scoped>
.goal-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1rem;
  transition: all 0.15s;
}
.goal-card.completed {
  border-color: rgba(34, 197, 94, 0.2);
  background: rgba(34, 197, 94, 0.04);
}
.goal-top {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}
.goal-ring {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}
.goal-ring-inner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.goal-icon { font-size: 1.25rem; }
.goal-info { flex: 1; min-width: 0; }
.goal-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #F8FAFC;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.goal-amounts {
  font-size: 0.8125rem;
  margin-top: 0.125rem;
}
.goal-saved { font-weight: 600; color: #3B82F6; }
.goal-sep { color: #475569; margin: 0 0.25rem; }
.goal-target { color: #64748B; }
.goal-meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.goal-days, .goal-monthly {
  font-size: 0.6875rem;
  color: #64748B;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}
.goal-done {
  font-size: 0.6875rem;
  color: #22C55E;
  font-weight: 600;
}
.goal-actions {
  margin-top: 0.75rem;
}
.add-btn {
  width: 100%;
  padding: 0.5rem;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #64748B;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.add-btn:hover {
  border-color: #22C55E;
  color: #22C55E;
}
.contribute-form {
  display: flex;
  gap: 0.375rem;
}
.contribute-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.375rem 0.625rem;
  color: #F8FAFC;
  font-size: 0.8125rem;
  outline: none;
}
.contribute-input:focus {
  border-color: rgba(34, 197, 94, 0.5);
}
.contribute-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  border: none;
  background: #22C55E;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}
.cancel-btn {
  padding: 0.375rem 0.5rem;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #64748B;
  font-size: 0.75rem;
  cursor: pointer;
}
</style>