<script setup>
import { computed } from 'vue'
import { useFinance } from '../composables/useFinance'

const { state, accountBalances, setActiveAccount, getCurrencySymbol } = useFinance()

const sym = computed(() => getCurrencySymbol(state.settings.baseCurrency))

const accountTypes = {
  checking: '🏦',
  savings: '💰',
  cash: '💵',
  credit: '💳',
  investment: '📈',
}
</script>

<template>
  <div v-if="accountBalances.length > 0" class="bg-card border border-border rounded-2xl p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-text-primary">Accounts</h3>
      <span class="text-[10px] text-text-secondary">{{ accountBalances.length }} account{{ accountBalances.length > 1 ? 's' : '' }}</span>
    </div>
    <div class="space-y-2">
      <button
        v-for="acc in accountBalances"
        :key="acc.id"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
        :class="state.settings.activeAccountId === acc.id
          ? 'bg-primary/10 border border-primary/30'
          : 'bg-surface border border-transparent hover:border-border'"
        @click="setActiveAccount(acc.id)"
      >
        <span class="text-lg">{{ accountTypes[acc.type] || acc.icon }}</span>
        <div class="flex-1 text-left min-w-0">
          <p class="text-sm font-medium text-text-primary truncate">{{ acc.name }}</p>
          <p class="text-[10px] text-text-secondary">{{ acc.type }} · {{ acc.transactionCount }} txns</p>
        </div>
        <p class="text-sm font-semibold" :class="acc.balance >= 0 ? 'text-primary' : 'text-danger'">
          {{ sym }}{{ acc.balance.toLocaleString('en-US', { minimumFractionDigits: 0 }) }}
        </p>
      </button>
    </div>
  </div>
</template>