<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProfile, getAvatarMeta } from '../composables/useProfile'

const route = useRoute()
const router = useRouter()
const { profile } = useProfile()

const moreOpen = ref(false)

const mainNav = [
  { name: 'Home',     path: '/',             icon: 'home' },
  { name: 'Activity', path: '/transactions', icon: 'transactions' },
  { name: 'Forecast', path: '/forecast',     icon: 'forecast' },
  { name: 'Manage',   path: '/manage',       icon: 'manage' },
]

const moreItems = [
  { name: 'Profile',  path: '/profile',  icon: 'profile' },
  { name: 'Chat',     path: '/chat',     icon: 'chat' },
  { name: 'Settings', path: '/settings', icon: 'settings' },
]

function isMoreActive() {
  return moreItems.some(i => i.path === route.path)
}

function navigateTo(path) {
  moreOpen.value = false
  router.push(path)
}

// Close panel on route change
watch(() => route.path, () => { moreOpen.value = false })
</script>

<template>
  <!-- Dismiss overlay -->
  <Transition name="fade">
    <div
      v-if="moreOpen"
      class="fixed inset-0 z-30"
      @click="moreOpen = false"
    />
  </Transition>

  <!-- Floating "More" panel -->
  <Transition name="slide-up">
    <div
      v-if="moreOpen"
      class="fixed bottom-20 left-4 right-4 z-40 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
    >
      <!-- Profile row -->
      <button
        class="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface transition-colors"
        :class="route.path === '/profile' ? 'text-primary' : 'text-text-primary'"
        @click="navigateTo('/profile')"
      >
        <div
          class="w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-lg flex-shrink-0"
          :class="getAvatarMeta(profile.avatar).gradient"
        >
          {{ getAvatarMeta(profile.avatar).emoji }}
        </div>
        <div class="flex-1 text-left">
          <p class="text-sm font-semibold">{{ profile.username || 'My Profile' }}</p>
          <p class="text-[11px] text-text-secondary">View & edit profile</p>
        </div>
        <svg class="w-4 h-4 text-text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <div class="mx-5 border-t border-border/60" />

      <!-- Chat + Settings rows -->
      <div class="grid grid-cols-2 divide-x divide-border/60">
        <!-- Chat -->
        <button
          class="flex flex-col items-center gap-2 py-5 hover:bg-surface transition-colors"
          :class="route.path === '/chat' ? 'text-primary' : 'text-text-secondary'"
          @click="navigateTo('/chat')"
        >
          <div class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="route.path === '/chat' ? 'bg-primary/15' : 'bg-surface'">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <span class="text-xs font-medium">AI Chat</span>
        </button>

        <!-- Settings -->
        <button
          class="flex flex-col items-center gap-2 py-5 hover:bg-surface transition-colors"
          :class="route.path === '/settings' ? 'text-primary' : 'text-text-secondary'"
          @click="navigateTo('/settings')"
        >
          <div class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="route.path === '/settings' ? 'bg-primary/15' : 'bg-surface'">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="text-xs font-medium">Settings</span>
        </button>
      </div>
    </div>
  </Transition>

  <!-- Bottom Nav Bar -->
  <nav class="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-40 safe-bottom">
    <div class="flex items-center justify-around max-w-lg mx-auto h-16">

      <!-- Main nav items -->
      <router-link
        v-for="item in mainNav"
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
        <!-- Activity -->
        <svg v-else-if="item.icon === 'transactions'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
        <!-- Forecast -->
        <svg v-else-if="item.icon === 'forecast'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
        <!-- Manage -->
        <svg v-else-if="item.icon === 'manage'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span class="text-[10px] font-medium">{{ item.name }}</span>
      </router-link>

      <!-- More tab -->
      <button
        class="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200"
        :class="moreOpen || isMoreActive()
          ? 'text-primary'
          : 'text-text-secondary/60'"
        @click="moreOpen = !moreOpen"
      >
        <div class="w-5 h-5 flex flex-col items-center justify-center gap-[3px] transition-transform duration-200"
          :class="moreOpen ? 'rotate-90' : ''">
          <span class="block w-1 h-1 rounded-full bg-current" />
          <span class="block w-1 h-1 rounded-full bg-current" />
          <span class="block w-1 h-1 rounded-full bg-current" />
        </div>
        <span class="text-[10px] font-medium">More</span>
      </button>

    </div>
  </nav>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.18s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(16px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
