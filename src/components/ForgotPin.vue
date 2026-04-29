<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import PinPad from './PinPad.vue'

const emit = defineEmits(['back', 'resetComplete'])

const { verifyUsernameForReset, resetPin, error, clearError } = useAuth()

const step = ref('username') // 'username' → 'newPin' → 'success'
const username = ref('')
const newPin = ref('')
const loading = ref(false)
const localError = ref('')

async function handleUsernameSubmit() {
  loading.value = true
  localError.value = ''
  clearError()

  const result = await verifyUsernameForReset(username.value)
  loading.value = false

  if (result.success) {
    step.value = 'newPin'
  } else {
    localError.value = result.error
  }
}

async function handleNewPinComplete(pin) {
  loading.value = true
  localError.value = ''
  clearError()

  const result = await resetPin(pin)
  loading.value = false

  if (result.success) {
    step.value = 'success'
    newPin.value = pin
  } else {
    localError.value = result.error
  }
}
</script>

<template>
  <div class="flex flex-col items-center max-w-sm mx-auto">
    <!-- Step 1: Verify username -->
    <template v-if="step === 'username'">
      <div class="flex justify-center mb-6">
        <div class="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center">
          <svg class="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
      </div>

      <h3 class="text-lg font-semibold text-text-primary mb-2">Reset PIN</h3>
      <p class="text-sm text-text-secondary mb-6 text-center">
        Enter your username to verify your identity
      </p>

      <div class="w-full space-y-4">
        <input
          v-model="username"
          type="text"
          placeholder="Your username"
          class="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 text-center"
          @keydown.enter="handleUsernameSubmit"
        />

        <p v-if="localError || error" class="text-xs text-danger text-center">{{ localError || error }}</p>

        <button
          class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          :class="{ 'opacity-50 pointer-events-none': loading || !username }"
          :disabled="loading || !username"
          @click="handleUsernameSubmit"
        >
          {{ loading ? 'Verifying...' : 'Verify Username' }}
        </button>

        <button
          class="w-full text-text-secondary text-sm py-2 hover:text-text-primary transition-colors"
          @click="emit('back')"
        >
          ← Back to Login
        </button>
      </div>
    </template>

    <!-- Step 2: Set new PIN -->
    <template v-else-if="step === 'newPin'">
      <div class="flex justify-center mb-4">
        <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg class="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
      </div>

      <PinPad
        v-model="newPin"
        title="Create your new 4-digit PIN"
        :error="localError || error"
        :disabled="loading"
        @complete="handleNewPinComplete"
      />
    </template>

    <!-- Step 3: Success -->
    <template v-else-if="step === 'success'">
      <div class="flex justify-center mb-6">
        <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce-subtle">
          <svg class="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <h3 class="text-lg font-semibold text-text-primary mb-2">PIN Reset Successfully!</h3>
      <p class="text-sm text-text-secondary mb-6 text-center">
        Your new PIN is ready. You can now log in.
      </p>

      <button
        class="w-full bg-primary hover:bg-primary-dim text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        @click="emit('resetComplete')"
      >
        Log In Now
      </button>
    </template>
  </div>
</template>