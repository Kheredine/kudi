<script setup>
import { ref, computed } from 'vue'
import { useFinance } from '../composables/useFinance'

const { canIAfford, balance, getCurrencySymbol, state } = useFinance()
const amount = ref('')
const showResult = ref(false)

const result = computed(() => {
  if (!amount.value || Number(amount.value) <= 0) return null
  return canIAfford(Number(amount.value))
})

function check() {
  if (!amount.value) return
  showResult.value = true
}

function reset() {
  amount.value = ''
  showResult.value = false
}

const sym = computed(() => getCurrencySymbol(state.settings.baseCurrency))
</script>

<template>
  <div class="bg-card border border-border rounded-2xl p-4 animate-in">
    <div class="flex items-center gap-2 mb-3">
      <div class="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
        <span class="text-sm">🤔</span>
      </div>
      <h3 class="text-sm font-semibold text-text-primary">Can I Afford This?</h3>
    </div>

    <div v-if="!showResult" class="flex gap-2">
      <div class="flex-1 relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">{{ sym }}</span>
        <input
          v-model="amount"
          type="number"
          min="0"
          step="100"
          placeholder="0"
          class="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple-500/50"
          @keyup.enter="check"
        />
      </div>
      <button
        class="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
        :disabled="!amount || Number(amount) <= 0"
        @click="check"
      >Check</button>
    </div>

    <div v-else class="animate-scale-in">
      <div class="text-center py-3">
        <span class="text-3xl">{{ result.emoji }}</span>
        <p class="text-sm font-semibold mt-2" :class="result.canAfford ? (result.wouldBeTight ? 'text-amber-400' : 'text-green-400') : 'text-red-400'">
          {{ sym }}{{ Number(amount).toLocaleString() }}
        </p>
        <p class="text-xs text-text-secondary mt-1">{{ result.recommendation }}</p>
        <div v-if="result.canAfford && result.wouldBeTight" class="mt-2 text-[10px] text-amber-400/80">
          Balance after: {{ sym }}{{ result.afterPurchase.toFixed(0) }}
        </div>
      </div>
      <button class="w-full text-xs text-text-secondary hover:text-text-primary py-1 transition-colors" @click="reset">Try another amount</button>
    </div>
  </div>
</template>