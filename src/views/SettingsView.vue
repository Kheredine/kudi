<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFinance } from '../composables/useFinance'
import { useAuth } from '../composables/useAuth'
import { resetAllData } from '../composables/useStorage'
import { LANGUAGES } from '../composables/useI18n'
import ExportModal from '../components/ExportModal.vue'

const router = useRouter()
const { state, updateSettings, getCurrencySymbol, applyTheme } = useFinance()
const { getUserId, logout } = useAuth()
const showExport = ref(false)
const resetting = ref(false)

// ── Pay Schedule helpers ─────────────────────────────────────
function togglePaycheckMode() {
  const next = state.settings.paycheckMode === 'period' ? 'none' : 'period'
  if (next === 'period' && !state.settings.payPeriods?.length) {
    applyPreset()
    updateSettings({ paycheckMode: next })
  } else {
    updateSettings({ paycheckMode: next })
  }
}

function applyPreset() {
  updateSettings({
    payPeriods: [
      { id: 1, label: 'Period 1', startDay: 1,  endDay: 15, payDay: 15 },
      { id: 2, label: 'Period 2', startDay: 16, endDay: 31, payDay: 1  },
    ],
    payday1: 15,
    payday2: 1,
  })
}

function addPeriod() {
  const periods = [...(state.settings.payPeriods || [])]
  const newId = periods.length ? Math.max(...periods.map(p => p.id)) + 1 : 1
  updateSettings({ payPeriods: [...periods, { id: newId, label: `Period ${newId}`, startDay: 1, endDay: 15, payDay: 15 }] })
}

function removePeriod(id) {
  updateSettings({ payPeriods: (state.settings.payPeriods || []).filter(p => p.id !== id) })
}

function updatePeriod(id, field, raw) {
  const value = ['startDay','endDay','payDay'].includes(field) ? (parseInt(raw) || 1) : raw
  const periods = (state.settings.payPeriods || []).map(p => p.id === id ? { ...p, [field]: value } : p)
  const synced = {}
  if (periods[0]) synced.payday1 = periods[0].payDay
  if (periods[1]) synced.payday2 = periods[1].payDay
  updateSettings({ payPeriods: periods, ...synced })
}

async function handleReset() {
  if (!confirm('Reset all data? This cannot be undone.')) return
  resetting.value = true
  try {
    const userId = await getUserId()
    if (userId) await resetAllData(userId)
    await logout()
    router.replace('/auth')
  } catch (err) {
    console.error('Reset failed:', err)
  }
  resetting.value = false
}
</script>

<template>
  <div class="max-w-lg mx-auto pb-28">
    <div class="px-5 pt-8 pb-4">
      <h1 class="text-2xl font-bold text-text-primary">Settings</h1>
      <p class="text-sm text-text-secondary mt-1">{{ state.settings.userName }}</p>
    </div>

    <div class="px-5 space-y-4">
      <!-- Profile & Pay -->
      <div class="bg-card border border-border rounded-2xl p-4 space-y-4">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Profile</h3>
        <div>
          <label class="text-xs font-medium text-text-secondary mb-1.5 block">Name</label>
          <input
            :value="state.settings.userName"
            type="text"
            class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50"
            @input="updateSettings({ userName: $event.target.value })"
          />
        </div>
      </div>

      <!-- Pay Schedule -->
      <div class="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pay Schedule</h3>
            <p class="text-[11px] text-text-secondary mt-0.5">Group shifts into pay periods</p>
          </div>
          <!-- Toggle -->
          <button
            class="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
            :class="state.settings.paycheckMode === 'period' ? 'bg-primary' : 'bg-surface border border-border'"
            @click="togglePaycheckMode"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
              :class="state.settings.paycheckMode === 'period' ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <!-- Period editor -->
        <div v-if="state.settings.paycheckMode === 'period'" class="space-y-3">
          <!-- Preset shortcut -->
          <button
            class="text-xs text-primary hover:underline"
            @click="applyPreset"
          >
            Apply standard preset (1–15 · 16–end of month)
          </button>

          <!-- Period cards -->
          <div
            v-for="period in (state.settings.payPeriods || [])"
            :key="period.id"
            class="bg-surface rounded-xl p-3 space-y-3"
          >
            <div class="flex items-center justify-between">
              <input
                :value="period.label"
                type="text"
                class="bg-transparent text-xs font-semibold text-text-primary focus:outline-none w-32"
                @input="updatePeriod(period.id, 'label', $event.target.value)"
              />
              <button class="text-[11px] text-danger hover:underline" @click="removePeriod(period.id)">Remove</button>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-[10px] text-text-secondary block mb-1">Start day</label>
                <input
                  :value="period.startDay"
                  type="number" min="1" max="31"
                  class="w-full bg-card border border-border rounded-lg px-2 py-2 text-sm text-text-primary text-center focus:outline-none focus:border-primary/50"
                  @input="updatePeriod(period.id, 'startDay', $event.target.value)"
                />
              </div>
              <div>
                <label class="text-[10px] text-text-secondary block mb-1">End day</label>
                <input
                  :value="period.endDay"
                  type="number" min="1" max="31"
                  class="w-full bg-card border border-border rounded-lg px-2 py-2 text-sm text-text-primary text-center focus:outline-none focus:border-primary/50"
                  @input="updatePeriod(period.id, 'endDay', $event.target.value)"
                />
              </div>
              <div>
                <label class="text-[10px] text-text-secondary block mb-1">Pay day</label>
                <input
                  :value="period.payDay"
                  type="number" min="1" max="31"
                  class="w-full bg-card border border-border rounded-lg px-2 py-2 text-sm text-text-primary text-center focus:outline-none focus:border-primary/50"
                  @input="updatePeriod(period.id, 'payDay', $event.target.value)"
                />
              </div>
            </div>
            <p class="text-[10px] text-text-secondary">
              Shifts on days {{ period.startDay }}–{{ period.endDay >= 28 ? 'end' : period.endDay }},
              paid on the {{ period.payDay }}{{ period.payDay < period.startDay ? ' (next month)' : '' }}
            </p>
          </div>

          <!-- Add period -->
          <button
            v-if="(state.settings.payPeriods || []).length < 4"
            class="w-full py-2.5 border border-dashed border-border rounded-xl text-xs text-text-secondary hover:border-primary/40 hover:text-primary transition-colors"
            @click="addPeriod"
          >
            + Add pay period
          </button>
        </div>
      </div>

      <!-- Currency -->
      <div class="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Currency</h3>
        <select
          :value="state.settings.baseCurrency"
          class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50"
          @change="updateSettings({ baseCurrency: $event.target.value })"
        >
          <option value="USD">🇺🇸 USD</option>
          <option value="EUR">🇪🇺 EUR</option>
          <option value="XOF">🇸🇳 XOF (FCFA)</option>
          <option value="CAD">🇨🇦 CAD</option>
          <option value="GBP">🇬🇧 GBP</option>
          <option value="RUB">🇷🇺 RUB</option>
          <option value="NGN">🇳🇬 NGN</option>
          <option value="GHS">🇬🇭 GHS</option>
          <option value="KES">🇰🇪 KES</option>
        </select>
      </div>

      <!-- Theme -->
      <div class="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Theme</h3>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all border"
            :class="state.settings.theme === 'dark' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface text-text-secondary border-border hover:border-primary/20'"
            @click="updateSettings({ theme: 'dark' }); applyTheme('dark')"
          >
            <span>🌙</span><span class="font-medium">Dark</span>
          </button>
          <button
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all border"
            :class="state.settings.theme === 'light' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface text-text-secondary border-border hover:border-primary/20'"
            @click="updateSettings({ theme: 'light' }); applyTheme('light')"
          >
            <span>☀️</span><span class="font-medium">Light</span>
          </button>
        </div>
      </div>

      <!-- Language -->
      <div class="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Language</h3>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="lang in LANGUAGES"
            :key="lang.code"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all border"
            :class="state.settings.language === lang.code ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface text-text-secondary border-border hover:border-primary/20'"
            @click="updateSettings({ language: lang.code })"
          >
            <span>{{ lang.flag }}</span><span class="font-medium">{{ lang.label }}</span>
          </button>
        </div>
      </div>

      <!-- Data & Export -->
      <div class="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Data</h3>
        <div class="space-y-1.5 text-xs text-text-secondary">
          <div class="flex justify-between"><span>Transactions</span><span class="text-text-primary">{{ state.transactions.length }}</span></div>
          <div class="flex justify-between"><span>Shifts</span><span class="text-text-primary">{{ state.shifts.length }}</span></div>
          <div class="flex justify-between"><span>Recurring</span><span class="text-text-primary">{{ state.recurring.length }}</span></div>
          <div class="flex justify-between"><span>Debts tracked</span><span class="text-text-primary">{{ (state.ious || []).length }}</span></div>
        </div>
        <button
          class="w-full bg-surface border border-border hover:border-primary/30 rounded-xl p-3 flex items-center gap-3 transition-all"
          @click="showExport = true"
        >
          <svg class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span class="text-sm font-medium text-text-primary">Export All Data as PDF</span>
        </button>
      </div>

      <!-- Danger -->
      <button
        class="w-full bg-danger/10 hover:bg-danger/20 text-danger font-semibold py-3 rounded-xl text-sm transition-colors"
        :class="{ 'opacity-50 pointer-events-none': resetting }"
        @click="handleReset"
      >
        {{ resetting ? 'Resetting...' : 'Reset All Data' }}
      </button>
    </div>

    <ExportModal v-if="showExport" initialDataSet="all" @close="showExport = false" />
  </div>
</template>
