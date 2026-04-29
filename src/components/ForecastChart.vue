<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useFinance } from '../composables/useFinance'

const props = defineProps({ days: { type: Number, default: 30 } })
const { forecast, currentBalance, lowestBalancePoint, state, getCurrencySymbol } = useFinance()

const tooltip = ref(null)
const chartRef = ref(null)

// Generate data points
const dataPoints = computed(() => {
  if (forecast.value.length === 0) return []

  const points = [{ date: 'Today', balance: Number(currentBalance.value) || 0, day: 0 }]
  let running = Number(currentBalance.value) || 0

  for (const item of forecast.value) {
    const amt = Number(item.amount) || 0
    running += item.type === 'expense' || item.type === 'saving' ? -Math.abs(amt) : Math.abs(amt)
    points.push({
      date: item.date,
      balance: Number(running.toFixed(2)),
      day: points.length,
      label: item.label,
      type: item.type,
    })
  }
  return points
})

const minBalance = computed(() => {
  if (dataPoints.value.length === 0) return 0
  return Math.min(...dataPoints.value.map(p => p.balance))
})
const maxBalance = computed(() => {
  if (dataPoints.value.length === 0) return 0
  return Math.max(...dataPoints.value.map(p => p.balance))
})
const range = computed(() => Math.max(1, maxBalance.value - minBalance.value))

function getY(balance) {
  const padding = 24
  const chartHeight = 160
  return padding + ((maxBalance.value - balance) / range.value) * (chartHeight - padding * 2)
}

function getX(index) {
  if (dataPoints.value.length <= 1) return 50
  return (index / (dataPoints.value.length - 1)) * 100
}

function pathD() {
  return dataPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(p.balance)}`).join(' ')
}

function areaD() {
  if (dataPoints.value.length === 0) return ''
  const line = pathD()
  const lastX = getX(dataPoints.value.length - 1)
  const firstX = getX(0)
  const bottom = 180
  return `${line} L${lastX},${bottom} L${firstX},${bottom} Z`
}

function handleMouseMove(e) {
  if (!chartRef.value || dataPoints.value.length === 0) return
  const rect = chartRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const width = rect.width
  const pct = x / width
  const idx = Math.round(pct * (dataPoints.value.length - 1))
  if (idx >= 0 && idx < dataPoints.value.length) {
    tooltip.value = { ...dataPoints.value[idx], x: getX(idx) }
  }
}

function handleMouseLeave() {
  tooltip.value = null
}

function fmt(n) {
  const num = Number(n)
  const sym = getCurrencySymbol(state.settings.baseCurrency)
  if (isNaN(num) || !isFinite(num)) return `${sym}0.00`
  return `${sym}${num.toFixed(2)}`
}

function isLowest(idx) {
  if (!lowestBalancePoint.value) return false
  return dataPoints.value[idx]?.date === lowestBalancePoint.value.date &&
    Math.abs(dataPoints.value[idx]?.balance - lowestBalancePoint.value.balance) < 1
}

function balanceColor(balance) {
  if (balance < 0) return '#EF4444'
  if (balance < 100) return '#F59E0B'
  return '#22C55E'
}
</script>

<template>
  <div>
    <div
      v-if="dataPoints.length > 1"
      ref="chartRef"
      class="relative w-full cursor-crosshair"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <!-- SVG Chart -->
      <svg viewBox="0 0 100 180" class="w-full h-40 lg:h-52" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#22C55E" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#22C55E" stop-opacity="0.02" />
          </linearGradient>
          <!-- Danger zone gradient -->
          <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#EF4444" stop-opacity="0.15" />
            <stop offset="100%" stop-color="#EF4444" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- Zero line (if negative balances exist) -->
        <line
          v-if="minBalance < 0"
          :x1="0"
          :x2="100"
          :y1="getY(0)"
          :y2="getY(0)"
          stroke="#EF4444"
          stroke-opacity="0.3"
          stroke-dasharray="1,1"
          stroke-width="0.3"
        />

        <!-- Area fill -->
        <path :d="areaD()" fill="url(#chartGrad)" />

        <!-- Line -->
        <path
          :d="pathD()"
          fill="none"
          stroke="#22C55E"
          stroke-width="0.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Lowest balance point marker -->
        <template v-for="(p, i) in dataPoints" :key="'dot-' + i">
          <circle
            v-if="isLowest(i)"
            :cx="getX(i)"
            :cy="getY(p.balance)"
            r="1.5"
            fill="#EF4444"
            stroke="#0F172A"
            stroke-width="0.5"
          />
          <!-- Pulse ring -->
          <circle
            v-if="isLowest(i)"
            :cx="getX(i)"
            :cy="getY(p.balance)"
            r="2.5"
            fill="none"
            stroke="#EF4444"
            stroke-width="0.3"
            stroke-opacity="0.5"
          >
            <animate attributeName="r" values="1.5;3;1.5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
        </template>

        <!-- Hover dot -->
        <circle
          v-if="tooltip"
          :cx="tooltip.x"
          :cy="getY(tooltip.balance)"
          r="1.2"
          fill="#F9FAFB"
          stroke="#22C55E"
          stroke-width="0.5"
        />
      </svg>

      <!-- Tooltip -->
      <transition name="fade">
        <div
          v-if="tooltip"
          class="absolute top-2 pointer-events-none bg-card border border-border rounded-lg px-3 py-2 shadow-lg"
          :style="{ left: `${tooltip.x}%`, transform: 'translateX(-50%)' }"
        >
          <p class="text-[10px] text-text-secondary">{{ tooltip.date }}</p>
          <p class="text-xs font-bold" :style="{ color: balanceColor(tooltip.balance) }">
            {{ fmt(tooltip.balance) }}
          </p>
          <p v-if="tooltip.label" class="text-[10px] text-text-secondary truncate max-w-[100px]">{{ tooltip.label }}</p>
        </div>
      </transition>
    </div>

    <!-- Empty state -->
    <div v-else class="py-8 text-center">
      <p class="text-sm text-text-secondary">Add shifts and expenses to see your forecast</p>
    </div>

    <!-- Lowest balance label -->
    <div v-if="lowestBalancePoint && dataPoints.length > 1" class="flex items-center gap-2 mt-3">
      <div class="w-2 h-2 rounded-full bg-danger" />
      <p class="text-xs text-text-secondary">
        Lowest: <span class="text-danger font-medium">{{ fmt(lowestBalancePoint.balance) }}</span>
        <span v-if="lowestBalancePoint.date"> on {{ lowestBalancePoint.date }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 150ms ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>