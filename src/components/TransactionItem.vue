<script setup>
import { ref } from 'vue'
import { useFinance } from '../composables/useFinance'

const { getCurrencySymbol } = useFinance()

const props = defineProps({
  transaction: { type: Object, required: true },
})

const emit = defineEmits(['delete', 'tap', 'edit'])

const swipeX = ref(0)
const isTouching = ref(false)
let startX = 0

function onTouchStart(e) {
  startX = e.touches[0].clientX
  isTouching.value = true
}

function onTouchMove(e) {
  const diff = startX - e.touches[0].clientX
  if (diff > 0) {
    swipeX.value = Math.min(diff, 80)
  }
}

function onTouchEnd() {
  isTouching.value = false
  if (swipeX.value > 60) {
    emit('delete', props.transaction.id)
  }
  swipeX.value = 0
}

function getAmountClass(type) {
  switch (type) {
    case 'income': return 'text-primary'
    case 'expense': return 'text-danger'
    case 'saving': return 'text-blue-400'
    default: return 'text-text-primary'
  }
}

function getAmountPrefix(type) {
  switch (type) {
    case 'income': return '+'
    case 'expense': return '-'
    case 'saving': return '-'
    default: return ''
  }
}

function getCategoryIcon(category) {
  const icons = {
    'Food & Drink': '🍔',
    'Subscription': '📱',
    'Transport': '🚗',
    'Shopping': '🛍️',
    'Entertainment': '🎬',
    'Utilities': '⚡',
    'Savings': '🏦',
    'Income': '💰',
    'Other': '📌',
  }
  return icons[category] || '📌'
}
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl"
    @click="emit('tap', transaction)"
  >
    <!-- Delete background -->
    <div class="absolute inset-y-0 right-0 w-20 bg-danger/10 flex items-center justify-center rounded-2xl">
      <span class="text-danger text-xs font-medium">Delete</span>
    </div>

    <!-- Card -->
    <div
      class="relative bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-transform duration-200"
      :style="{ transform: `translateX(-${swipeX}px)` }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Category icon -->
      <div class="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-lg shrink-0">
        {{ getCategoryIcon(transaction.category) }}
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-text-primary truncate">{{ transaction.label }}</p>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-xs text-text-secondary">{{ transaction.category }}</span>
          <span class="text-[10px] text-text-secondary/50">{{ transaction.date }}</span>
        </div>
      </div>

      <!-- Amount -->
      <p
        class="text-sm font-semibold shrink-0"
        :class="getAmountClass(transaction.type)"
      >
        {{ getAmountPrefix(transaction.type) }}{{ getCurrencySymbol(transaction.currency) }}{{ transaction.amount.toFixed(2) }}
      </p>
    </div>
  </div>
</template>