<script setup>
import { ref, computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import { usePrivacy } from '../composables/usePrivacy'
import PinPad from './PinPad.vue'

const { verifyPin, loginWithBiometric, isBiometricSupported, user } = useAuth()
const { onPinUnlockSuccess, onPinModalCancel } = usePrivacy()

const pin = ref('')
const loading = ref(false)
const statusMessage = ref('')
const errorMessage = ref('')
const pinPadRef = ref(null)

// Check if biometric is available
const biometricAvailable = computed(() => user.value?.biometricEnabled)

async function handlePinComplete(value) {
  loading.value = true
  errorMessage.value = ''
  statusMessage.value = 'Verifying PIN...'

  // Small delay for UX feedback
  await new Promise(r => setTimeout(r, 300))

  const result = await verifyPin(value)
  loading.value = false

  if (result.success) {
    statusMessage.value = 'Access granted'
    // Brief success feedback before closing
    await new Promise(r => setTimeout(r, 300))
    onPinUnlockSuccess()
  } else {
    statusMessage.value = ''
    errorMessage.value = result.error || 'Incorrect PIN'
    pin.value = ''
  }
}

async function handleBiometric() {
  loading.value = true
  errorMessage.value = ''
  statusMessage.value = 'Verifying biometric...'

  const result = await loginWithBiometric()
  loading.value = false

  if (result.success) {
    statusMessage.value = 'Access granted'
    await new Promise(r => setTimeout(r, 300))
    onPinUnlockSuccess()
  } else {
    statusMessage.value = ''
    errorMessage.value = result.error || 'Biometric failed'
  }
}

function handleCancel() {
  pin.value = ''
  errorMessage.value = ''
  statusMessage.value = ''
  onPinModalCancel()
}
</script>

<template>
  <Teleport to="body">
    <transition name="modal">
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleCancel" />

        <!-- Modal -->
        <div class="relative bg-card border border-border rounded-3xl p-8 w-[340px] max-w-[90vw] shadow-2xl animate-scale-in">
          <!-- Close button -->
          <button
            class="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            @click="handleCancel"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Lock icon with state -->
          <div class="flex justify-center mb-4">
            <div
              class="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300"
              :class="statusMessage === 'Access granted'
                ? 'bg-primary/20'
                : errorMessage
                  ? 'bg-danger/20'
                  : 'bg-primary/10'"
            >
              <!-- Success state -->
              <svg v-if="statusMessage === 'Access granted'" class="w-7 h-7 text-primary animate-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <!-- Error state -->
              <svg v-else-if="errorMessage" class="w-7 h-7 text-danger animate-shake" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <!-- Default lock -->
              <svg v-else class="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>

          <!-- PIN Pad -->
          <PinPad
            ref="pinPadRef"
            v-model="pin"
            title="Enter your PIN to unlock"
            :error="errorMessage"
            :disabled="loading"
            @complete="handlePinComplete"
          />

          <!-- Status message -->
          <transition name="fade">
            <p v-if="statusMessage" class="text-xs text-center mt-3 flex items-center justify-center gap-1.5"
              :class="statusMessage === 'Access granted' ? 'text-primary' : 'text-text-secondary'"
            >
              <svg v-if="loading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {{ statusMessage }}
            </p>
          </transition>

          <!-- Biometric option -->
          <div v-if="biometricAvailable" class="mt-4">
            <button
              class="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors py-2"
              :disabled="loading"
              @click="handleBiometric"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.136 8.21M12 2.25c-2.265 0-4.3 1.014-5.66 2.613M12 2.25a7.5 7.5 0 017.5 7.5c0 1.884-.183 3.727-.536 5.513M12 2.25c-2.722 0-5.052 1.698-5.989 4.084M12 6.75a3.75 3.75 0 00-3.75 3.75c0 .862-.274 1.694-.792 2.392M12 6.75a3.75 3.75 0 013.75 3.75c0 .862.274 1.694.792 2.392M12 12.75a1.5 1.5 0 00-1.5 1.5c0 .735-.275 1.414-.736 1.936M12 12.75a1.5 1.5 0 011.5 1.5c0 .735.275 1.414.736 1.936" />
              </svg>
              Use Face ID / Fingerprint
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 200ms ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>