<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const deferredPrompt = ref(null)
const showInstallBanner = ref(false)

function handleBeforeInstall(e) {
  e.preventDefault()
  deferredPrompt.value = e
  // Don't show if user already dismissed
  if (!localStorage.getItem('kudi-install-dismissed')) {
    showInstallBanner.value = true
  }
}

async function installApp() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    showInstallBanner.value = false
  }
  deferredPrompt.value = null
}

function dismissBanner() {
  showInstallBanner.value = false
  localStorage.setItem('kudi-install-dismissed', 'true')
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstall)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
})
</script>

<template>
  <transition name="slide-up">
    <div
      v-if="showInstallBanner"
      class="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-auto md:w-80 z-40 bg-card border border-border rounded-2xl p-4 shadow-2xl"
    >
      <button
        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
        @click="dismissBanner"
      >
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <img src="/icon-192.png" alt="Kudi" class="w-6 h-6 rounded" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-text-primary">Install Kudi</p>
          <p class="text-xs text-text-secondary">Add to your home screen for quick access</p>
        </div>
      </div>

      <button
        class="w-full mt-3 bg-primary hover:bg-primary-dim text-white font-semibold py-2.5 rounded-xl text-sm transition-all active:scale-[0.98]"
        @click="installApp"
      >
        Install App
      </button>
    </div>
  </transition>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 300ms ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>