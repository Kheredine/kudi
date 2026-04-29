<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SideNav from './components/SideNav.vue'
import BottomNav from './components/BottomNav.vue'
import RightPanel from './components/RightPanel.vue'
import FabButton from './components/FabButton.vue'
import InstallPrompt from './components/InstallPrompt.vue'
import { ref } from 'vue'

const router = useRouter()
const route = useRoute()
const showAddModal = ref(false)

const isAuthRoute = computed(() => route.path === '/auth')

function handleKeydown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
  switch (e.key.toLowerCase()) {
    case 'e': showAddModal.value = true; break
    case 's': router.push('/settings'); break
    case '/': e.preventDefault(); router.push('/chat'); break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="min-h-screen bg-bg">
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