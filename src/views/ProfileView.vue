<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { user, logout } = useAuth()

function handleLogout() {
  logout()
  router.replace('/auth')
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Header -->
    <div class="px-5 pt-8 pb-4">
      <h1 class="text-2xl font-bold text-text-primary">Profile</h1>
      <p class="text-sm text-text-secondary mt-1">Your account</p>
    </div>

    <div class="px-5 pb-8 space-y-4">
      <!-- User Info -->
      <div class="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <p class="text-lg font-semibold text-text-primary">{{ user?.username || 'User' }}</p>
            <p class="text-xs text-text-secondary">Signed in</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Actions</h3>

        <!-- Logout -->
        <button
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface hover:bg-surface/80 transition-colors group"
          @click="handleLogout"
        >
          <div class="w-9 h-9 rounded-xl bg-text-secondary/10 flex items-center justify-center">
            <svg class="w-4.5 h-4.5 text-text-secondary group-hover:text-text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </div>
          <div class="flex-1 text-left">
            <p class="text-sm font-medium text-text-primary">Logout</p>
            <p class="text-xs text-text-secondary">Sign out of your account</p>
          </div>
          <svg class="w-4 h-4 text-text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>