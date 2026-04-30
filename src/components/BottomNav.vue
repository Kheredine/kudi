<script setup>
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const { user } = useAuth()

const navItems = [
  { name: 'Home', path: '/', icon: 'home' },
  { name: 'Activity', path: '/transactions', icon: 'transactions' },
  { name: 'Forecast', path: '/forecast', icon: 'forecast' },
  { name: 'Debts', path: '/ious', icon: 'ious' },
  { name: 'Profile', path: '/profile', icon: 'profile' },
]
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-40 safe-bottom">
    <div class="flex items-center justify-around max-w-lg mx-auto h-16">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200"
        :class="route.path === item.path
          ? 'text-primary'
          : 'text-text-secondary/60 active:text-text-primary'"
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
        <!-- Profile -->
        <div v-else-if="item.icon === 'profile'" class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" :class="route.path === '/profile' ? 'bg-primary/30 text-primary' : 'bg-text-secondary/20 text-text-secondary/60'">
          {{ user?.avatar || '👤' }}
        </div>
        <span class="text-[10px] font-medium">{{ item.name }}</span>
      </router-link>
    </div>
  </nav>
</template>