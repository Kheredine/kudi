<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useCurrency } from '../composables/useCurrency'

const {
  loading,
  error,
  lastUpdated,
  usingCachedRates,
  fromCurrency,
  toCurrency,
  amount,
  currencies,
  exchangeRate,
  convertedAmount,
  fromInfo,
  toInfo,
  fetchRates,
  swap,
  setAmount,
  formatNumber,
  startAutoRefresh,
  stopAutoRefresh,
} = useCurrency()

const quickAmounts = [5, 10, 50, 100]

onMounted(() => {
  fetchRates()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div>
    <!-- Status bar -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div v-if="loading" class="flex items-center gap-1.5 text-[10px] text-primary animate-pulse">
          <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Updating rates...
        </div>
        <div v-else-if="usingCachedRates" class="flex items-center gap-1 text-[10px] text-amber-400/70">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          Using last updated rates
        </div>
        <div v-else class="text-[10px] text-text-secondary/50">
          Updated {{ lastUpdated }}
        </div>
      </div>
      <button
        class="text-[10px] text-text-secondary hover:text-primary transition-colors"
        @click="fetchRates(true)"
        :disabled="loading"
      >
        Refresh
      </button>
    </div>

    <!-- Amount Input -->
    <div class="pb-3">
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-lg font-medium">
          {{ fromInfo?.symbol }}
        </span>
        <input
          v-model="amount"
          type="number"
          min="0"
          step="any"
          class="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-4 text-2xl font-bold text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>

    <!-- Quick Amounts -->
    <div class="pb-3 flex gap-2">
      <button
        v-for="qa in quickAmounts"
        :key="qa"
        class="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200"
        :class="Number(amount) === qa
          ? 'bg-primary/15 text-primary border border-primary/30'
          : 'bg-surface text-text-secondary border border-border hover:border-primary/20'"
        @click="setAmount(qa)"
      >
        {{ fromInfo?.symbol }}{{ qa }}
      </button>
    </div>

    <!-- Currency Selection Row -->
    <div class="pb-3 flex items-center gap-3">
      <!-- From -->
      <div class="flex-1">
        <select
          v-model="fromCurrency"
          class="w-full bg-surface border border-border rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-colors"
        >
          <option v-for="c in currencies" :key="c.code" :value="c.code">
            {{ c.flag }} {{ c.code }}
          </option>
        </select>
      </div>

      <!-- Swap -->
      <button
        class="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all duration-200 active:scale-90 shrink-0"
        @click="swap"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      </button>

      <!-- To -->
      <div class="flex-1">
        <select
          v-model="toCurrency"
          class="w-full bg-surface border border-border rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-colors"
        >
          <option v-for="c in currencies" :key="c.code" :value="c.code">
            {{ c.flag }} {{ c.code }}
          </option>
        </select>
      </div>
    </div>

    <!-- Result -->
    <div class="mb-2 bg-surface/50 rounded-xl p-4">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-text-secondary">Converted amount</span>
      </div>
      <p class="text-2xl font-bold text-text-primary">
        {{ toInfo?.symbol }} {{ formatNumber(convertedAmount, toInfo?.decimals ?? 2) }}
      </p>
      <p class="text-xs text-text-secondary/60 mt-2">
        1 {{ fromCurrency }} = {{ formatNumber(exchangeRate, toCurrency === 'XAF' || toCurrency === 'JPY' || toCurrency === 'KES' ? 2 : 4) }} {{ toCurrency }}
      </p>
    </div>

    <!-- Error -->
    <div v-if="error" class="mt-2 px-3 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
      <p class="text-[10px] text-yellow-400/80">{{ error }}</p>
    </div>
  </div>
</template>