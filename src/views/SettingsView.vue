<script setup>
import { ref } from 'vue'
import { useFinance } from '../composables/useFinance'
import { LANGUAGES } from '../composables/useI18n'
import ExportModal from '../components/ExportModal.vue'

const { state, updateSettings, getCurrencySymbol, applyTheme } = useFinance()
const showExport = ref(false)
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
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-text-secondary mb-1.5 block">1st Payday</label>
            <input
              :value="state.settings.payday1 || 10"
              type="number" min="1" max="31"
              class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50"
              @input="updateSettings({ payday1: parseInt($event.target.value) || 10 })"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-text-secondary mb-1.5 block">2nd Payday</label>
            <input
              :value="state.settings.payday2 || 25"
              type="number" min="1" max="31"
              class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50"
              @input="updateSettings({ payday2: parseInt($event.target.value) || 25 })"
            />
          </div>
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
        @click="if (confirm('Reset all data? This cannot be undone.')) { localStorage.clear(); location.reload() }"
      >
        Reset All Data
      </button>
    </div>

    <ExportModal v-if="showExport" initialDataSet="all" @close="showExport = false" />
  </div>
</template>
