<script setup>
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from './composables/useSupabase'
import { useFinance } from './composables/useFinance'
import { migrateLocalData } from './composables/useStorage'
import { fetchProfile } from './composables/useProfile'
import SideNav from './components/SideNav.vue'
import BottomNav from './components/BottomNav.vue'
import RightPanel from './components/RightPanel.vue'
import FabButton from './components/FabButton.vue'
import InstallPrompt from './components/InstallPrompt.vue'

const router = useRouter()
const route = useRoute()
const { initData, dataLoaded, autoGenerateRecurring, applyTheme, lastDbError } = useFinance()
const showAddModal = ref(false)
const appReady = ref(false)

const isAuthRoute = computed(() => route.path === '/auth')

function handleKeydown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
  switch (e.key.toLowerCase()) {
    case 'e': showAddModal.value = true; break
    case 's': router.push('/settings'); break
    case '/': e.preventDefault(); router.push('/chat'); break
  }
}

// Listen for Supabase auth state changes and initialize data
let authUnsubscribe = null

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  authUnsubscribe = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
      const userId = session.user.id

      // One-time localStorage → Supabase migration
      try {
        await migrateLocalData(userId)
      } catch (err) {
        console.warn('[Migration] skipped:', err.message)
      }

      // Load user data from Supabase
      if (!dataLoaded.value) {
        await fetchProfile(userId)
        await initData(userId)
        autoGenerateRecurring()
      }

      appReady.value = true

      // Redirect away from auth page if already signed in
      if (route.path === '/auth') {
        router.replace('/')
      }
    } else if (event === 'SIGNED_OUT') {
      appReady.value = false
      if (route.path !== '/auth') {
        router.replace('/auth')
      }
    } else if (event === 'INITIAL_SESSION' && !session) {
      appReady.value = true
    }
  }).data.unsubscribe
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (authUnsubscribe) authUnsubscribe()
})
</script>

<template>
  <!-- Loading screen while checking auth -->
  <div v-if="!appReady" class="min-h-screen bg-bg flex items-center justify-center">
    <div class="flex flex-col items-center gap-3">
      <div class="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center animate-pulse">
        <span class="text-primary font-bold text-2xl">K</span>
      </div>
      <div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  </div>

  <!-- Main app -->
  <div v-else class="min-h-screen bg-bg">
    <!-- Global DB error banner -->
    <transition name="fade">
      <div
        v-if="lastDbError && !isAuthRoute"
        class="fixed top-0 left-0 right-0 z-[100] bg-red-500/90 text-white text-xs text-center py-2 px-4 backdrop-blur-sm"
      >
        ⚠️ Save failed: {{ lastDbError.message }}
      </div>
    </transition>

    <!-- Side nav (desktop only) -->
    <SideNav v-if="!isAuthRoute" />

    <!-- Main content -->
    <main :class="isAuthRoute ? '' : 'md:ml-64 lg:mr-80 pb-20 md:pb-8'">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Right panel (desktop only) -->
    <RightPanel v-if="!isAuthRoute" />

    <!-- Bottom nav (mobile only) -->
    <div v-if="!isAuthRoute" class="md:hidden">
      <BottomNav />
    </div>

    <!-- FAB (mobile only) -->
    <FabButton v-if="!isAuthRoute" />

    <!-- Install prompt (PWA) -->
    <InstallPrompt v-if="!isAuthRoute" />

    <!-- Keyboard shortcuts hint (desktop only) -->
    <div v-if="!isAuthRoute" class="hidden lg:flex fixed bottom-4 left-[17rem] items-center gap-3 text-[10px] text-text-secondary/30 z-30">
      <span><kbd class="px-1.5 py-0.5 bg-surface rounded text-text-secondary/50">E</kbd> Add expense</span>
      <span><kbd class="px-1.5 py-0.5 bg-surface rounded text-text-secondary/50">S</kbd> Settings</span>
      <span><kbd class="px-1.5 py-0.5 bg-surface rounded text-text-secondary/50">/</kbd> Chat</span>
    </div>
  </div>
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>