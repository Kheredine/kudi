<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login, clearError, error } = useAuth()

const username = ref('')
const passcode = ref('')
const loading = ref(false)
const localError = ref('')

async function handleSubmit() {
  localError.value = ''
  clearError()

  if (!username.value.trim()) {
    localError.value = 'Please enter your username'
    return
  }
  if (!passcode.value) {
    localError.value = 'Please enter your passcode'
    return
  }

  loading.value = true

  const result = await login(username.value, passcode.value)

  loading.value = false

  if (result.success) {
    router.replace('/')
  } else {
    localError.value = result.error
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg flex flex-col items-center justify-center p-5">
    <div class="w-full max-w-[380px]">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-8 animate-in">
        <div class="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
          <span class="text-primary font-bold text-3xl">K</span>
        </div>
        <h1 class="text-2xl font-bold text-text-primary tracking-tight">Kudi</h1>
        <p class="text-sm text-text-secondary mt-1">Personal Finance</p>
      </div>

      <!-- Auth form -->
      <div class="bg-card border border-border rounded-3xl p-6 animate-in" style="animation-delay: 50ms">
        <div class="flex flex-col items-center mb-6">
          <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p class="text-sm text-text-secondary">Welcome back</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Username -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5 ml-1">Username</label>
            <input
              v-model="username"
              type="text"
              placeholder="Enter your username"
              autocomplete="username"
              class="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <!-- Passcode -->
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5 ml-1">Passcode</label>
            <input
              v-model="passcode"
              type="password"
              placeholder="Enter your passcode"
              autocomplete="current-password"
              class="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <!-- Error -->
          <transition name="fade">
            <p v-if="localError || error" class="text-xs text-danger text-center flex items-center justify-center gap-1.5">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {{ localError || error }}
            </p>
          </transition>

          <!-- Submit -->
          <button
            type="submit"
            class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-3.5 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
            :class="{ 'opacity-50 pointer-events-none': loading }"
          >
            <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>