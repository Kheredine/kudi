<script setup>
import { useRouter } from 'vue-router'
import { useFinance } from '../composables/useFinance'

const router = useRouter()
const { pastIncomes, INCOME_TYPE_META, getCurrencySymbol, state } = useFinance()

const sym = () => getCurrencySymbol(state.settings.baseCurrency)

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function typeMeta(type) {
  return INCOME_TYPE_META[type] || INCOME_TYPE_META.custom
}
</script>

<template>
  <div class="max-w-lg mx-auto">

    <!-- Header -->
    <div class="px-5 pt-8 pb-4 flex items-center gap-3">
      <button
        @click="router.back()"
        class="p-2 rounded-xl bg-surface border border-border hover:border-primary/30 text-text-secondary hover:text-primary transition-all"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <div>
        <h1 class="text-xl font-bold text-text-primary">Payment History</h1>
        <p class="text-xs text-text-secondary mt-0.5">{{ pastIncomes.length }} received payment{{ pastIncomes.length !== 1 ? 's' : '' }}</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="pastIncomes.length === 0" class="px-5 py-12 text-center">
      <div class="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-text-secondary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      </div>
      <p class="text-sm font-medium text-text-primary mb-1">No past payments</p>
      <p class="text-xs text-text-secondary">Received income will appear here automatically.</p>
    </div>

    <!-- List -->
    <div v-else class="px-5 pb-24 space-y-2">
      <div
        v-for="fi in pastIncomes"
        :key="fi.id"
        class="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3"
      >
        <!-- Type icon -->
        <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
             :class="typeMeta(fi.type).bg">
          <span class="text-base">{{ typeMeta(fi.type).icon }}</span>
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-text-primary truncate">{{ fi.title }}</p>
          <p class="text-xs text-text-secondary mt-0.5">
            {{ fmtDate(fi.receivedAt || fi.dueDate) }}
            <span v-if="fi.source" class="ml-1">· {{ fi.source }}</span>
          </p>
        </div>

        <!-- Amount + type badge -->
        <div class="text-right shrink-0">
          <p class="text-sm font-bold text-text-primary">
            +{{ sym() }}{{ fi.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </p>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full border mt-0.5 inline-block"
                :class="[typeMeta(fi.type).color, 'border-current opacity-70']">
            {{ typeMeta(fi.type).label }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>
