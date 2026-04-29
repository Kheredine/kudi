<script setup>
import { useFinance } from '../composables/useFinance'
const { getCurrencySymbol } = useFinance()

const props = defineProps({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  frequency: { type: String, default: 'monthly' },
  day: { type: [Number, String], default: null },
  dayOfWeek: { type: String, default: null },
  type: { type: String, default: 'expense' },
  active: { type: Boolean, default: true },
})

const emit = defineEmits(['toggle'])

function getFrequencyLabel() {
  if (props.frequency === 'monthly') return `Monthly on ${getOrdinal(props.day)}`
  if (props.frequency === 'weekly') return `Every ${props.dayOfWeek}`
  if (props.frequency === 'daily') return 'Daily'
  return props.frequency
}

function getOrdinal(n) {
  if (!n) return ''
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function getTypeLabel() {
  return props.type === 'saving' ? '🏦' : '💸'
}
</script>

<template>
  <div
    class="bg-card rounded-2xl border border-border px-4 py-3.5 flex items-center gap-3"
    :class="{ 'opacity-50': !active }"
  >
    <span class="text-lg">{{ getTypeLabel() }}</span>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-text-primary truncate">{{ name }}</p>
      <p class="text-xs text-text-secondary mt-0.5">{{ getFrequencyLabel() }}</p>
    </div>

    <p
      class="text-sm font-semibold shrink-0"
      :class="type === 'saving' ? 'text-blue-400' : 'text-danger'"
    >
      {{ getCurrencySymbol() }}{{ amount.toFixed(2) }}
    </p>

    <!-- Toggle -->
    <button
      class="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
      :class="active ? 'bg-primary' : 'bg-surface'"
      @click="emit('toggle')"
    >
      <div
        class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
        :class="active ? 'translate-x-[22px]' : 'translate-x-0.5'"
      />
    </button>
  </div>
</template>