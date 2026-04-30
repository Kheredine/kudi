<script setup>
import { useRoute } from 'vue-router'
import { useFinance } from '../composables/useFinance'
import { usePrivacy } from '../composables/usePrivacy'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const { balance, state, getCurrencySymbol } = useFinance()
const { isUnlocked } = usePrivacy()
const { user } = useAuth()

function formatMoney(amount) {
  const sym = getCurrencySymbol(state.settings.baseCurrency)
  const num = Number(amount)
  if (isNaN(num) || !isFinite(num)) return `${sym}0`
  return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const navItems = [
  { name: 'Home', path: '/', icon: 'home' },
  { name: 'Activity', path: '/transactions', icon: 'transactions' },
  { name: 'Forecast', path: '/forecast', icon: 'forecast' },
  { name: 'Debts (IOUs)', path: '/ious', icon: 'ious' },
  { name: 'Chat', path: '/chat', icon: 'chat' },
  { name: 'Settings', path: '/settings', icon: 'settings' },
]
</script>

<template>
  <aside class="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card border-r border-border z-40">
    <!-- Logo / Brand -->
    <div class="px-6 pt-8 pb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <span class="text-primary font-bold text-lg">K</span>
        </div>
        <div>
          <h1 class="text-lg font-bold text-text-primary tracking-tight">Kudi</h1>
          <p class="text-[10px] text-text-secondary">Personal Finance</p>
        </div>
      </div>
    </div>

    <!-- Balance quick view -->
    <div class="mx-4 mb-6 px-4 py-3 bg-surface rounded-xl">
      <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Balance</p>
      <p class="text-lg font-bold text-primary transition-all duration-300" :class="{ 'blur-md select-none': !isUnlocked }">
        {{ formatMoney(balance) }}
      </p>
    </div>

    <!-- Nav Links -->
    <nav class="flex-1 px-3 space-y-1">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
        :class="route.path === item.path
          ? 'bg-primary/10 text-primary'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary'"
      >
        <!-- Home -->
        <svg v-if="item.icon === 'home'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        <!-- Transactions -->
        <svg v-else-if="item.icon === 'transactions'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
        <!-- Chat -->
        <svg v-else-if="item.icon === 'chat'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <!-- Forecast -->
        <svg v-else-if="item.icon === 'forecast'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
        <!-- IOUs -->
        <svg v-else-if="item.icon === 'ious'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 8.25H9m6 3H9m3 6-3-3h1.5a3 3 0 100-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <!-- Settings -->
        <svg v-else-if="item.icon === 'settings'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>

        <span class="text-sm font-medium">{{ item.name }}</span>
      </router-link>
    </nav>

    <!-- Profile link -->
    <div class="px-3 pb-4">
      <router-link
        to="/profile"
        class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
        :class="route.path === '/profile'
          ? 'bg-primary/10 text-primary'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary'"
      >
        <div class="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm">
          {{ user?.avatar || '👤' }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ user?.username || 'Profile' }}</p>
        </div>
        <svg class="w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </router-link>
    </div>
  </aside>
</template>